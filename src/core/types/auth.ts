export type SystemRole =
  | "PATIENT"
  | "FAMILY_ADMIN"
  | "FAMILY_MEMBER"
  | "CARETAKER"
  | "HEALTHCARE_PROFESSIONAL"
  | "SUPER_ADMIN";

export type CircleRole =
  | "FAMILY_ADMIN"
  | "FAMILY_MEMBER"
  | "CARETAKER"
  | "NURSE"
  | "CLINICIAN";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phoneNumber: string;
  fullName: string;
  systemRole: SystemRole;
  isActive: boolean;
  preferredLanguage?: string;
}

export interface AuthTokenPayload {
  sub: string; // User ID
  email: string | null;
  phoneNumber: string;
  role: SystemRole;
  type: "access" | "refresh" | "tablet_kiosk";
  patientId?: string; // If scoped to a specific kiosk/patient
  preferredLanguage?: string;
  iat?: number;
  exp?: number;
}

export interface CareCirclePermissionSet {
  canManageMedications: boolean;
  canManageAppointments: boolean;
  canViewVitals: boolean;
  canViewRecords: boolean;
  receiveEmergencyAlerts: boolean;
  receiveMissedDoseCalls: boolean;
}
