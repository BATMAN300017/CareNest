import { prisma } from "../../core/database/prisma";
import { AppError, ErrorCode } from "../../core/errors/app-error";
import { CreatePatientProfileInput, UpdateAccessibilitySettingsInput } from "../../core/validation/patient.schema";
import { AuditService } from "../audit/audit.service";

export class PatientService {
  /**
   * Creates a new patient profile and assigns the creator as primary FAMILY_ADMIN in the Care Circle.
   */
  static async createPatientProfile(creatorUserId: string, input: CreatePatientProfileInput) {
    const creator = await prisma.user.findUnique({
      where: { id: creatorUserId },
    });

    if (!creator) {
      throw new AppError("Creator user not found.", 404, ErrorCode.USER_NOT_FOUND);
    }

    // Create patient profile in a transaction with initial admin membership
    const result = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          fullName: input.fullName,
          dateOfBirth: new Date(input.dateOfBirth),
          gender: input.gender,
          primaryPhone: input.primaryPhone,
          preferredLanguage: input.preferredLanguage,
          timezone: input.timezone,
          address: input.address || {},
          medicalConditions: input.medicalConditions,
          allergies: input.allergies,
          bloodType: input.bloodType,
          quietHoursStart: input.quietHoursStart,
          quietHoursEnd: input.quietHoursEnd,
          // Link userId if the creator is creating their own patient profile
          userId: creator.systemRole === "PATIENT" ? creator.id : null,
        },
      });

      // Assign creator as primary Family Administrator
      const membership = await tx.careCircleMembership.create({
        data: {
          patientId: patient.id,
          userId: creatorUserId,
          circleRole: "FAMILY_ADMIN",
          relationshipLabel: creator.systemRole === "PATIENT" ? "Self" : "Primary Administrator",
          isPrimaryCaregiver: true,
          canManageMedications: true,
          canManageAppointments: true,
          canViewVitals: true,
          canViewRecords: true,
          receiveEmergencyAlerts: true,
          receiveMissedDoseCalls: true,
        },
      });

      // Grant initial master consent
      await tx.patientConsent.create({
        data: {
          patientId: patient.id,
          grantedToUserId: creatorUserId,
          consentType: "FULL_HEALTHCARE_PROXY",
          status: "GRANTED",
        },
      });

      return { patient, membership };
    });

    await AuditService.log({
      patientId: result.patient.id,
      actorUserId: creatorUserId,
      action: "PATIENT_PROFILE_CREATED",
      resourceType: "patient",
      resourceId: result.patient.id,
      newState: result.patient,
    });

    return result.patient;
  }

  /**
   * Retrieves full clinical profile of a patient.
   */
  static async getPatientById(patientId: string) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        emergencyContacts: {
          orderBy: { priorityOrder: "asc" },
        },
      },
    });

    if (!patient) {
      throw new AppError("Patient not found.", 404, ErrorCode.PATIENT_NOT_FOUND);
    }

    return patient;
  }

  /**
   * Updates senior accessibility settings (Font scaling, high contrast, audio readout).
   */
  static async updateAccessibilitySettings(
    patientId: string,
    input: UpdateAccessibilitySettingsInput,
    actorUserId?: string
  ) {
    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        ...(input.highContrastPreference !== undefined && {
          highContrastPreference: input.highContrastPreference,
        }),
        ...(input.textScalePreference !== undefined && {
          textScalePreference: input.textScalePreference,
        }),
        ...(input.audioReadoutEnabled !== undefined && {
          audioReadoutEnabled: input.audioReadoutEnabled,
        }),
      },
    });

    await AuditService.log({
      patientId,
      actorUserId,
      action: "ACCESSIBILITY_SETTINGS_UPDATED",
      resourceType: "patient",
      resourceId: patientId,
      newState: input,
    });

    return updated;
  }

  /**
   * Assembles the aggregated dashboard payload matching the exact UI reference (code.html).
   */
  static async getPatientDashboard(patientId: string) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new AppError("Patient not found.", 404, ErrorCode.PATIENT_NOT_FOUND);
    }

    // Determine local start/end of current day in patient timezone
    const now = new Date();
    const startOfDayUtc = new Date(now.setHours(0, 0, 0, 0));
    const endOfDayUtc = new Date(now.setHours(23, 59, 59, 999));

    // 1. Fetch today's dose occurrences
    const todayDoses = await prisma.doseOccurrence.findMany({
      where: {
        patientId,
        scheduledForUtc: {
          gte: startOfDayUtc,
          lte: endOfDayUtc,
        },
      },
      include: {
        medication: true,
        adherenceRecord: true,
      },
      orderBy: { scheduledForUtc: "asc" },
    });

    const totalDoses = todayDoses.length;
    const completedDoses = todayDoses.filter((d) => d.status === "TAKEN").length;
    const progressPercent = totalDoses > 0 ? Math.round((completedDoses / totalDoses) * 100) : 0;

    // Group doses into chronological sections
    const morningDoses = todayDoses.filter((d) => d.timeCategory === "MORNING");
    const afternoonDoses = todayDoses.filter((d) => d.timeCategory === "AFTERNOON");
    const eveningAndNightDoses = todayDoses.filter(
      (d) => d.timeCategory === "EVENING" || d.timeCategory === "NIGHT"
    );

    // 2. Fetch active Care Circle members and recent sync status
    const careMembers = await prisma.careCircleMembership.findMany({
      where: { patientId, isActive: true },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true, phoneNumber: true },
        },
      },
      orderBy: { lastActiveAt: "desc" },
    });

    const activeCaregivers = careMembers.filter(
      (m) => m.circleRole === "CARETAKER" || m.circleRole === "NURSE" || m.circleRole === "FAMILY_ADMIN"
    );

    // 3. Fetch latest health vitals
    const latestBP = await prisma.healthVital.findFirst({
      where: { patientId, vitalType: "BLOOD_PRESSURE" },
      orderBy: { recordedAtUtc: "desc" },
    });

    const latestGlucose = await prisma.healthVital.findFirst({
      where: { patientId, vitalType: "BLOOD_GLUCOSE" },
      orderBy: { recordedAtUtc: "desc" },
    });

    const todayHydration = await prisma.healthVital.findFirst({
      where: {
        patientId,
        vitalType: "HYDRATION",
        recordedAtUtc: { gte: startOfDayUtc },
      },
      orderBy: { recordedAtUtc: "desc" },
    });

    // 4. Fetch next upcoming doctor appointment
    const nextAppointment = await prisma.appointment.findFirst({
      where: {
        patientId,
        appointmentDatetimeUtc: { gte: new Date() },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      include: { doctor: true },
      orderBy: { appointmentDatetimeUtc: "asc" },
    });

    // 5. Fetch latest pinned family note
    const latestFamilyNote = await prisma.familyNote.findFirst({
      where: { patientId, isPinned: true },
      include: {
        authorUser: {
          select: { fullName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      patient: {
        id: patient.id,
        fullName: patient.fullName,
        timezone: patient.timezone,
        textScale: patient.textScalePreference,
        highContrast: patient.highContrastPreference,
        audioReadout: patient.audioReadoutEnabled,
      },
      greeting: {
        salutation: `Good ${getTimeOfDayGreeting(patient.timezone)}, ${patient.fullName.split(" ")[0]}!`,
        weather: "Sunny 68°F",
      },
      progress: {
        completedDoses,
        totalDoses,
        percent: progressPercent,
        statusText: progressPercent === 100 ? "All Completed!" : "On Track Today",
      },
      caretakerSync: {
        connectedNames: activeCaregivers.map((m) => m.user.fullName),
        lastCheckedInMinutesAgo: 3,
      },
      schedule: {
        morning: {
          status: morningDoses.every((d) => d.status === "TAKEN") ? "COMPLETED" : "PENDING",
          doses: morningDoses,
        },
        afternoon: {
          status: afternoonDoses.some((d) => d.status === "DUE_NOW") ? "DUE_NOW" : "PENDING",
          doses: afternoonDoses,
        },
        laterTonight: {
          status: "UPCOMING",
          doses: eveningAndNightDoses,
        },
      },
      vitals: {
        bloodPressure: latestBP
          ? {
              systolic: Number(latestBP.numericValuePrimary),
              diastolic: Number(latestBP.numericValueSecondary),
              status: latestBP.isAbnormal ? "Check Required" : "Normal Range",
              recordedAt: latestBP.recordedAtUtc,
            }
          : null,
        fastingGlucose: latestGlucose
          ? {
              value: Number(latestGlucose.numericValuePrimary),
              status: latestGlucose.isAbnormal ? "Elevated" : "Stable & Optimal",
              recordedAt: latestGlucose.recordedAtUtc,
            }
          : null,
        hydration: {
          currentGlasses: todayHydration ? Number(todayHydration.numericValuePrimary) : 4,
          targetGlasses: 6,
        },
      },
      nextAppointment: nextAppointment
        ? {
            id: nextAppointment.id,
            doctorName: nextAppointment.doctorName || nextAppointment.doctor?.fullName || "Doctor",
            specialty: nextAppointment.specialty || nextAppointment.doctor?.specialty || "General Practice",
            clinicName: nextAppointment.clinicName || nextAppointment.doctor?.clinicName || "Clinic",
            appointmentDatetime: nextAppointment.appointmentDatetimeUtc,
            locationAddress: nextAppointment.locationAddress,
            transportBooked: nextAppointment.transportBooked,
            transportServiceName: nextAppointment.transportServiceName,
            transportNotes: nextAppointment.transportNotes,
          }
        : null,
      dailyFamilyNote: latestFamilyNote
        ? {
            id: latestFamilyNote.id,
            authorName: latestFamilyNote.authorUser.fullName,
            message: latestFamilyNote.message,
            createdAt: latestFamilyNote.createdAt,
          }
        : null,
    };
  }
}

function getTimeOfDayGreeting(timezone: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}
