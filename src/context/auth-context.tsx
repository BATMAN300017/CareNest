"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export type UserRole = "PATIENT" | "CAREGIVER" | "DOCTOR" | "ADMIN";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  primaryPhone?: string;
  preferredLanguage?: "en" | "hi";
  specialty?: string; // For Doctor
  clinicName?: string; // For Doctor
}

export interface PatientProfile {
  id: string;
  userId?: string;
  fullName: string;
  dateOfBirth?: string;
  age?: number;
  primaryPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  relationshipLabel?: string;
  allergies?: string[];
  chronicConditions?: string[];
  preferredLanguage?: "en" | "hi";
}

export interface RegisterPayload {
  fullName: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  password?: string;
  role?: string;
  systemRole?: string;
  preferredLanguage?: "en" | "hi";
}

interface AuthApiResponse {
  user: {
    id: string;
    fullName: string;
    email?: string | null;
    phoneNumber?: string;
    systemRole: string;
    preferredLanguage?: "en" | "hi";
  };
  accessToken?: string;
  token?: string;
  patient?: PatientProfile;
}

interface AuthContextType {
  user: User | null;
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  patientProfile: PatientProfile | null;
  activePatientId: string;
  activePatient: PatientProfile;
  linkedPatients: PatientProfile[];
  setActivePatientId: (id: string) => void;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  setDemoUser: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Canonical Linked Patients (Multi-patient support for Caregivers & Doctors)
export const CANONICAL_PATIENTS: PatientProfile[] = [
  {
    id: "pat_margaret_123",
    fullName: "Margaret Jenkins",
    dateOfBirth: "1948-04-12",
    age: 76,
    primaryPhone: "+15552345678",
    emergencyContactName: "Sarah Jenkins (Daughter)",
    emergencyContactPhone: "+15559876543",
    relationshipLabel: "Mother",
    allergies: ["Penicillin", "Sulfa"],
    chronicConditions: ["Hypertension", "Type 2 Diabetes"],
    preferredLanguage: "en",
  },
  {
    id: "pat_robert_456",
    fullName: "Robert Jenkins",
    dateOfBirth: "1945-09-20",
    age: 79,
    primaryPhone: "+15553456789",
    emergencyContactName: "Sarah Jenkins (Daughter)",
    emergencyContactPhone: "+15559876543",
    relationshipLabel: "Father",
    allergies: ["Aspirin"],
    chronicConditions: ["Mild Cognitive Impairment", "Arthritis"],
    preferredLanguage: "hi",
  },
];

const DEFAULT_USERS: Record<UserRole, User> = {
  PATIENT: {
    id: "usr_margaret_123",
    fullName: "Margaret Jenkins",
    email: "margaret.jenkins@example.com",
    role: "PATIENT",
    primaryPhone: "+15552345678",
    preferredLanguage: "en",
  },
  CAREGIVER: {
    id: "usr_sarah_456",
    fullName: "Sarah Jenkins",
    email: "sarah.jenkins@example.com",
    role: "CAREGIVER",
    primaryPhone: "+15559876543",
    preferredLanguage: "en",
  },
  DOCTOR: {
    id: "usr_doc_789",
    fullName: "Dr. Robert Chen",
    email: "dr.chen@metroheart.com",
    role: "DOCTOR",
    primaryPhone: "+15554321098",
    specialty: "Cardiology",
    clinicName: "Memorial Heart Pavilion",
    preferredLanguage: "en",
  },
  ADMIN: {
    id: "usr_admin_001",
    fullName: "System Administrator",
    email: "admin@carenest.org",
    role: "ADMIN",
    primaryPhone: "+15550009999",
    preferredLanguage: "en",
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(DEFAULT_USERS.PATIENT);
  const [currentRole, setCurrentRole] = useState<UserRole>("PATIENT");
  const [linkedPatients, setLinkedPatients] = useState<PatientProfile[]>(CANONICAL_PATIENTS);
  const [activePatientId, setActivePatientIdState] = useState<string>("pat_margaret_123");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from storage or fallback to defaults
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedToken = localStorage.getItem("carenest_token");
      const savedUser = localStorage.getItem("carenest_user");
      const savedRole = localStorage.getItem("carenest_role") as UserRole;
      const savedPatientId = localStorage.getItem("carenest_active_patient_id");

      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      }
      if (savedRole && ["PATIENT", "CAREGIVER", "DOCTOR", "ADMIN"].includes(savedRole)) {
        setCurrentRole(savedRole);
      }
      if (savedPatientId) {
        setActivePatientIdState(savedPatientId);
      }
      if (savedToken) {
        setToken(savedToken);
      }
    } catch (e) {
      // Graceful fallback
    }
  }, []);

  const setActivePatientId = (id: string) => {
    setActivePatientIdState(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("carenest_active_patient_id", id);
      } catch (e) {}
    }
  };

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
    setUser(DEFAULT_USERS[role]);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("carenest_role", role);
        localStorage.setItem("carenest_user", JSON.stringify(DEFAULT_USERS[role]));
      } catch (e) {}
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthApiResponse>("/api/v1/auth/login", { email, password });
      const { user: authedUser, accessToken, patient } = res;

      const role: UserRole =
        authedUser.systemRole === "HEALTHCARE_PROFESSIONAL"
          ? "DOCTOR"
          : authedUser.systemRole === "SUPER_ADMIN"
          ? "ADMIN"
          : authedUser.systemRole === "PATIENT"
          ? "PATIENT"
          : "CAREGIVER";

      const token = accessToken || "";
      const userObj: User = {
        id: authedUser.id,
        fullName: authedUser.fullName,
        email: authedUser.email || email,
        role,
        primaryPhone: authedUser.phoneNumber || "",
        preferredLanguage: authedUser.preferredLanguage || "en",
      };

      setUser(userObj);
      setCurrentRole(role);
      setToken(token);

      localStorage.setItem("carenest_token", token);
      localStorage.setItem("carenest_user", JSON.stringify(userObj));
      localStorage.setItem("carenest_role", role);

      if (patient) {
        setActivePatientId(patient.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthApiResponse>("/api/v1/auth/register", payload);
      const { user: registeredUser, accessToken = "", patient } = res;

      const role: UserRole =
        registeredUser.systemRole === "HEALTHCARE_PROFESSIONAL"
          ? "DOCTOR"
          : registeredUser.systemRole === "PATIENT"
          ? "PATIENT"
          : "CAREGIVER";

      const userObj: User = {
        id: registeredUser.id,
        fullName: registeredUser.fullName,
        email: registeredUser.email || payload.email || "",
        role,
        primaryPhone: registeredUser.phoneNumber || "",
        preferredLanguage: payload.preferredLanguage || "en",
      };

      setUser(userObj);
      setCurrentRole(role);
      setToken(accessToken);

      localStorage.setItem("carenest_token", accessToken);
      localStorage.setItem("carenest_user", JSON.stringify(userObj));
      localStorage.setItem("carenest_role", role);

      if (patient) {
        setActivePatientId(patient.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("carenest_token");
      localStorage.removeItem("carenest_user");
      localStorage.removeItem("carenest_role");
      localStorage.removeItem("carenest_active_patient_id");
    }
  };

  const setDemoUser = (role: UserRole) => {
    switchRole(role);
  };

  const activePatient =
    linkedPatients.find((p) => p.id === activePatientId) || CANONICAL_PATIENTS[0];

  return (
    <AuthContext.Provider
      value={{
        user,
        currentRole,
        switchRole,
        patientProfile: activePatient,
        activePatientId,
        activePatient,
        linkedPatients,
        setActivePatientId,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        setDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
