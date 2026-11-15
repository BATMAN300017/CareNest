import { describe, it, expect } from "vitest";
import { RegisterUserSchema } from "../../src/core/validation/auth.schema";
import { CreateMedicationSchema } from "../../src/core/validation/medication.schema";
import { CreatePatientProfileSchema } from "../../src/core/validation/patient.schema";
import { ConfirmDoseSchema } from "../../src/core/validation/adherence.schema";

describe("Input Validation & Zod Guardrails", () => {
  it("should validate and normalize valid user registration input", () => {
    const valid = {
      phoneNumber: "+15552345678",
      email: "sarah@example.com",
      password: "StrongPassword123!",
      fullName: "Sarah Jenkins",
      systemRole: "FAMILY_ADMIN",
      quickPasscode: "1948",
    };

    const parsed = RegisterUserSchema.parse(valid);
    expect(parsed.fullName).toBe("Sarah Jenkins");
    expect(parsed.quickPasscode).toBe("1948");
  });

  it("should reject invalid phone numbers and short passwords", () => {
    const invalid = {
      phoneNumber: "not-a-phone",
      password: "short",
      fullName: "A",
    };

    expect(() => RegisterUserSchema.parse(invalid)).toThrow();
  });

  it("should validate complex medication prescriptions with multiple schedules", () => {
    const medInput = {
      brandName: "Glucophage",
      genericName: "Metformin",
      dosageForm: "TABLET",
      strength: "500mg",
      instructions: "Take 1 tablet with lunch and full glass of water",
      pillAppearance: "White Oval Tablet with M 500 score",
      pillColor: "#FFFFFF",
      pillShape: "OVAL",
      startDate: "2026-11-01",
      initialStockQuantity: 60,
      refillThreshold: 10,
      schedules: [
        {
          frequencyType: "DAILY",
          timeOfDayCategory: "AFTERNOON",
          scheduledTime: "13:00",
          mealRelation: "WITH_MEAL",
          gracePeriodMinutes: 60,
        },
      ],
    };

    const parsed = CreateMedicationSchema.parse(medInput);
    expect(parsed.genericName).toBe("Metformin");
    expect(parsed.schedules.length).toBe(1);
    expect(parsed.schedules[0].scheduledTime).toBe("13:00");
  });

  it("should reject medications with empty schedules array", () => {
    const noSchedules = {
      brandName: "Metformin",
      genericName: "Metformin",
      dosageForm: "TABLET",
      strength: "500mg",
      instructions: "Take with meal",
      pillAppearance: "White",
      startDate: "2026-11-01",
      schedules: [],
    };

    expect(() => CreateMedicationSchema.parse(noSchedules)).toThrow();
  });

  it("should validate dose confirmations from dashboard UI and telephone keypad", () => {
    const uiConfirm = ConfirmDoseSchema.parse({
      confirmationChannel: "DASHBOARD_UI",
      intakeMealContext: "Taken with warm lunch",
    });
    expect(uiConfirm.confirmationChannel).toBe("DASHBOARD_UI");

    const phoneConfirm = ConfirmDoseSchema.parse({
      confirmationChannel: "TELEPHONE_DTMF",
      telephonyCallSid: "CA1234567890abcdef",
    });
    expect(phoneConfirm.confirmationChannel).toBe("TELEPHONE_DTMF");
    expect(phoneConfirm.telephonyCallSid).toBe("CA1234567890abcdef");
  });
});
