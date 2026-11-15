import { z } from "zod";

export const CreatePatientProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date of birth format (expected YYYY-MM-DD)",
  }),
  gender: z.string().optional(),
  primaryPhone: z.string().min(10, "Primary phone must be at least 10 characters").regex(/^\+?[1-9]\d{1,14}$/, "Phone number must follow E.164 format"),
  preferredLanguage: z.string().default("en-US"),
  timezone: z.string().default("America/New_York"),
  address: z.object({
    street: z.string().optional(),
    unit: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  medicalConditions: z.array(z.string()).default([]),
  allergies: z.array(z.object({
    substance: z.string().min(1, "Allergy substance is required"),
    severity: z.enum(["MILD", "MODERATE", "SEVERE", "LIFE_THREATENING"]).default("MODERATE"),
    reaction: z.string().optional(),
  })).default([]),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid quiet hours start (HH:mm)").default("22:00"),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid quiet hours end (HH:mm)").default("07:00"),
});

export const UpdateAccessibilitySettingsSchema = z.object({
  highContrastPreference: z.boolean().optional(),
  textScalePreference: z.number().min(0.8).max(1.5).optional(),
  audioReadoutEnabled: z.boolean().optional(),
});

export const CreateCareCircleInviteSchema = z.object({
  inviteeEmail: z.string().email("Invalid email").optional(),
  inviteePhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format").optional(),
  circleRole: z.enum(["FAMILY_ADMIN", "FAMILY_MEMBER", "CARETAKER", "NURSE", "CLINICIAN"]),
  relationshipLabel: z.string().min(1, "Relationship label is required (e.g., Daughter, Visiting Nurse)"),
  permissions: z.object({
    canManageMedications: z.boolean().default(false),
    canManageAppointments: z.boolean().default(false),
    canViewVitals: z.boolean().default(true),
    canViewRecords: z.boolean().default(true),
    receiveEmergencyAlerts: z.boolean().default(true),
    receiveMissedDoseCalls: z.boolean().default(false),
  }),
});

export const JoinCareCircleSchema = z.object({
  inviteCode: z.string().min(6, "Invite code must be at least 6 characters").max(12),
});

export const UpdateMemberPermissionsSchema = z.object({
  circleRole: z.enum(["FAMILY_ADMIN", "FAMILY_MEMBER", "CARETAKER", "NURSE", "CLINICIAN"]).optional(),
  relationshipLabel: z.string().min(1).optional(),
  canManageMedications: z.boolean().optional(),
  canManageAppointments: z.boolean().optional(),
  canViewVitals: z.boolean().optional(),
  canViewRecords: z.boolean().optional(),
  receiveEmergencyAlerts: z.boolean().optional(),
  receiveMissedDoseCalls: z.boolean().optional(),
});

export const GrantConsentSchema = z.object({
  grantedToUserId: z.string().uuid("Invalid user ID"),
  consentType: z.enum([
    "FULL_HEALTHCARE_PROXY",
    "MEDICATION_MANAGEMENT",
    "VITALS_VIEW_ONLY",
    "APPOINTMENT_ESCORT",
  ]),
  digitalSignatureHash: z.string().optional(),
});

export const RevokeConsentSchema = z.object({
  revocationReason: z.string().min(3, "Revocation reason is required"),
});

export type CreatePatientProfileInput = z.infer<typeof CreatePatientProfileSchema>;
export type UpdateAccessibilitySettingsInput = z.infer<typeof UpdateAccessibilitySettingsSchema>;
export type CreateCareCircleInviteInput = z.infer<typeof CreateCareCircleInviteSchema>;
export type JoinCareCircleInput = z.infer<typeof JoinCareCircleSchema>;
export type UpdateMemberPermissionsInput = z.infer<typeof UpdateMemberPermissionsSchema>;
export type GrantConsentInput = z.infer<typeof GrantConsentSchema>;
export type RevokeConsentInput = z.infer<typeof RevokeConsentSchema>;
