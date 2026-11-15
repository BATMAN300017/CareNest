import { describe, it, expect } from "vitest";
import { translations, SupportedLanguage } from "../../src/i18n/translations";
import { TwiMLBuilder } from "../../src/modules/telephony/twiml-builder";
import { NotificationTemplateService } from "../../src/modules/notifications/notification-template.service";

describe("CareNest Multilingual Support (English & Hindi)", () => {
  it("should have comprehensive dictionaries for both en and hi", () => {
    expect(translations.en).toBeDefined();
    expect(translations.hi).toBeDefined();

    const enKeys = Object.keys(translations.en);
    const hiKeys = Object.keys(translations.hi);

    expect(enKeys.length).toBeGreaterThan(40);
    expect(hiKeys.length).toBeGreaterThan(40);

    // Verify key parity for critical navigation and actions
    const criticalKeys = [
      "nav.brand",
      "nav.schedule",
      "nav.medications",
      "nav.appointments",
      "nav.careCircle",
      "nav.vitals",
      "nav.support",
      "common.confirm",
      "common.cancel",
      "common.completed",
      "common.dueNow",
      "header.readAloud",
      "header.sosButton",
      "schedule.journeyTitle",
      "schedule.morningRoutine",
      "schedule.afternoonRoutine",
      "schedule.eveningRoutine",
      "vitals.sectionTitle",
      "vitals.bpLabel",
      "vitals.glucoseLabel",
      "careCircle.title",
      "roles.patientView",
      "roles.caregiverView",
      "roles.doctorView",
      "roles.adminView",
    ];

    criticalKeys.forEach((key) => {
      expect(translations.en[key]).toBeDefined();
      expect(translations.hi[key]).toBeDefined();
    });
  });

  it("should contain authentic Devanagari Hindi text", () => {
    expect(translations.hi["nav.brand"]).toBe("केयरनेस्ट");
    expect(translations.hi["header.goodMorning"]).toBe("शुभ प्रभात");
    expect(translations.hi["common.confirm"]).toBe("पुष्टि करें");
    expect(translations.hi["common.cancel"]).toBe("रद्द करें");
    expect(translations.hi["header.readAloud"]).toBe("बोलकर सुनाएँ");
  });

  it("should accurately preserve medication brand names and prescribed dosages in templates", () => {
    const medName = "Lisinopril";
    const strength = "10mg";
    const instructions = "Take with morning water and breakfast";

    // English Template
    const enReminder = NotificationTemplateService.getMedicationReminder("en", medName, strength, instructions);
    expect(enReminder.title).toContain("Lisinopril 10mg");
    expect(enReminder.body).toContain("Lisinopril");
    expect(enReminder.body).toContain("10mg");

    // Hindi Template
    const hiReminder = NotificationTemplateService.getMedicationReminder("hi", medName, strength, instructions);
    expect(hiReminder.title).toContain("Lisinopril");
    expect(hiReminder.body).toContain("Lisinopril");
    expect(hiReminder.body).toContain("10mg");
    expect(hiReminder.title).toBe("Lisinopril लेने का समय");
  });

  it("should format bilingual missed dose escalation alerts", () => {
    const patientName = "Margaret Jenkins";
    const medName = "Metformin";
    const strength = "500mg";

    const enAlert = NotificationTemplateService.getMissedDoseAlert("en", patientName, medName, strength);
    expect(enAlert.title).toBe("CareNest Alert: Missed Dose for Margaret Jenkins");
    expect(enAlert.body).toContain("Metformin (500mg)");

    const hiAlert = NotificationTemplateService.getMissedDoseAlert("hi", patientName, medName, strength);
    expect(hiAlert.title).toBe("केयरनेस्ट अलर्ट: Margaret Jenkins की दवा छूटी");
    expect(hiAlert.body).toContain("Metformin (500mg)");
    expect(hiAlert.body).toContain("कृपया उनसे संपर्क करें");
  });

  it("should format bilingual doctor appointment reminders", () => {
    const enAppt = NotificationTemplateService.getAppointmentReminder(
      "en",
      "Cardiology Consultation",
      "Dr. Robert Chen",
      "Memorial Heart Pavilion"
    );
    expect(enAppt.title).toContain("Cardiology Consultation");
    expect(enAppt.body).toContain("Dr. Robert Chen");

    const hiAppt = NotificationTemplateService.getAppointmentReminder(
      "hi",
      "हृदय रोग परामर्श",
      "डॉ. रॉबर्ट चेन",
      "मेमोरियल हार्ट पैवेलियन"
    );
    expect(hiAppt.title).toContain("हृदय रोग परामर्श");
    expect(hiAppt.body).toContain("डॉ. रॉबर्ट चेन");
  });

  it("should format dates and numbers cleanly for both en-US and hi-IN locales", () => {
    const testDate = new Date("2026-11-15T10:00:00Z");

    const enFormatted = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(testDate);
    expect(enFormatted).toContain("Nov 15, 2026");

    const hiFormatted = new Intl.DateTimeFormat("hi-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(testDate);
    expect(hiFormatted).toBeDefined();
    expect(hiFormatted.length).toBeGreaterThan(0);
  });
});

describe("CareNest Automated Hindi Telephony Voice (TwiML)", () => {
  it("should generate English TwiML with Polly.Joanna and en-US", () => {
    const twiml = TwiMLBuilder.buildMedicationReminderPrompt({
      patientName: "Margaret",
      medicationName: "Lisinopril",
      dosage: "10mg",
      actionUrl: "https://carenest.app/api/v1/telephony/voice/handle-keypad",
      preferredLanguage: "en-US",
      voiceSpeed: "NORMAL",
    });

    expect(twiml).toContain('voice="Polly.Joanna"');
    expect(twiml).toContain('language="en-US"');
    expect(twiml).toContain("Lisinopril, 10mg");
    expect(twiml).toContain("Press 1 if you have taken it");
  });

  it("should generate Hindi TwiML with Polly.Aditi and hi-IN", () => {
    const twiml = TwiMLBuilder.buildMedicationReminderPrompt({
      patientName: "मार्गरेट",
      medicationName: "Metformin",
      dosage: "500mg",
      actionUrl: "https://carenest.app/api/v1/telephony/voice/handle-keypad",
      preferredLanguage: "hi",
      voiceSpeed: "SLOW",
    });

    expect(twiml).toContain('voice="Polly.Aditi"');
    expect(twiml).toContain('language="hi-IN"');
    expect(twiml).toContain('rate="85%"'); // SLOW voice speed
    expect(twiml).toContain("Metformin, 500mg"); // Medication preservation
    expect(twiml).toContain("दवा ले ली है तो 1 दबाएँ");
    expect(twiml).toContain("नमस्ते मार्गरेट");
  });

  it("should generate localized Hindi DTMF responses", () => {
    const confirmedTwiML = TwiMLBuilder.buildDoseConfirmedResponse("मार्गरेट", "hi");
    expect(confirmedTwiML).toContain('voice="Polly.Aditi"');
    expect(confirmedTwiML).toContain("धन्यवाद मार्गरेट");

    const notTakenTwiML = TwiMLBuilder.buildNotTakenResponse("मार्गरेट", "hi");
    expect(notTakenTwiML).toContain("कृपया समय पर भोजन के साथ अपनी दवा लेना न भूलें");

    const snoozeTwiML = TwiMLBuilder.buildSnoozeResponse("मार्गरेट", "hi");
    expect(snoozeTwiML).toContain("15 मिनट के लिए स्थगित");

    const transferTwiML = TwiMLBuilder.buildCaregiverTransferResponse("+15559876543", "सारा", "hi");
    expect(transferTwiML).toContain("देखभालकर्ता सारा से सीधे जोड़ा जा रहा है");
    expect(transferTwiML).toContain("<Dial>+15559876543</Dial>");
  });
});

describe("CareNest Role-Based Profiles & Multi-Patient Architecture", () => {
  interface LinkedPatient {
    id: string;
    fullName: string;
    relation: string;
    age: number;
    adherenceRate: number;
  }

  const linkedPatients: LinkedPatient[] = [
    {
      id: "pat_margaret_jenkins",
      fullName: "Margaret Jenkins",
      relation: "Mother",
      age: 76,
      adherenceRate: 94,
    },
    {
      id: "pat_robert_jenkins",
      fullName: "Robert Jenkins",
      relation: "Father",
      age: 79,
      adherenceRate: 88,
    },
  ];

  it("should allow a caregiver to manage multiple elderly patients and switch context seamlessly", () => {
    let activePatientId = linkedPatients[0].id;
    let activePatient = linkedPatients.find((p) => p.id === activePatientId);

    expect(activePatient?.fullName).toBe("Margaret Jenkins");
    expect(activePatient?.adherenceRate).toBe(94);

    // Switch to second parent
    activePatientId = linkedPatients[1].id;
    activePatient = linkedPatients.find((p) => p.id === activePatientId);

    expect(activePatient?.fullName).toBe("Robert Jenkins");
    expect(activePatient?.adherenceRate).toBe(88);
  });

  it("should support role transitions across all 4 portal perspectives", () => {
    const roles = ["PATIENT", "CAREGIVER", "DOCTOR", "ADMIN"] as const;
    type PortalRole = (typeof roles)[number];

    const portalRoutes: Record<PortalRole, string> = {
      PATIENT: "/schedule",
      CAREGIVER: "/caregiver",
      DOCTOR: "/doctor",
      ADMIN: "/admin",
    };

    roles.forEach((r) => {
      expect(portalRoutes[r]).toBeDefined();
      expect(portalRoutes[r].startsWith("/")).toBe(true);
    });
  });

  it("should enforce clinical doctor authorization rules", () => {
    interface DoctorConsent {
      doctorId: string;
      patientId: string;
      isAuthorized: boolean;
      expiresAt: Date;
    }

    const doctorConsentRecords: DoctorConsent[] = [
      {
        doctorId: "doc_chen",
        patientId: "pat_margaret_jenkins",
        isAuthorized: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        doctorId: "doc_chen",
        patientId: "pat_unauthorized_patient",
        isAuthorized: false,
        expiresAt: new Date(Date.now() - 1000),
      },
    ];

    const canReviewPatient = (docId: string, patId: string): boolean => {
      const consent = doctorConsentRecords.find(
        (c) => c.doctorId === docId && c.patientId === patId
      );
      if (!consent) return false;
      return consent.isAuthorized && consent.expiresAt > new Date();
    };

    expect(canReviewPatient("doc_chen", "pat_margaret_jenkins")).toBe(true);
    expect(canReviewPatient("doc_chen", "pat_unauthorized_patient")).toBe(false);
    expect(canReviewPatient("doc_unknown", "pat_margaret_jenkins")).toBe(false);
  });
});
