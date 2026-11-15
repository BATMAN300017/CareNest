import { z } from "zod";

export const RegisterUserSchema = z.object({
  email: z.string().email("Invalid email address").optional().nullable(),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 characters").regex(/^\+?[1-9]\d{1,14}$/, "Phone number must follow E.164 format (e.g. +15551234567)"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  systemRole: z.enum([
    "PATIENT",
    "FAMILY_ADMIN",
    "FAMILY_MEMBER",
    "CARETAKER",
    "HEALTHCARE_PROFESSIONAL",
  ]).default("FAMILY_ADMIN"),
  quickPasscode: z.string().regex(/^\d{4,6}$/, "Quick passcode must be a 4 to 6 digit numeric PIN").optional(),
});

export const LoginUserSchema = z.object({
  identifier: z.string().min(3, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

export const TabletUnlockSchema = z.object({
  deviceFingerprint: z.string().min(1, "Device fingerprint is required"),
  passcode: z.string().regex(/^\d{4,6}$/, "Passcode must be a 4 to 6 digit numeric PIN"),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type LoginUserInput = z.infer<typeof LoginUserSchema>;
export type TabletUnlockInput = z.infer<typeof TabletUnlockSchema>;
