"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "ELDERLY_PATIENT" | "FAMILY_MEMBER" | "CAREGIVER" | "PHYSICIAN";
  primaryPhone?: string;
}

export interface PatientProfile {
  id: string;
  userId?: string;
  fullName: string;
  dateOfBirth?: string;
  primaryPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

interface AuthContextType {
  user: User | null;
  patientProfile: PatientProfile | null;
  activePatientId: string;
  setActivePatientId: (id: string) => void;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  setDemoUser: (role: "PATIENT" | "CAREGIVER" | "DOCTOR") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default patient for immediate seamless demonstration when running local UI preview
const DEFAULT_DEMO_PATIENT: PatientProfile = {
  id: "pat_margaret_123",
  fullName: "Margaret Jenkins",
  dateOfBirth: "1948-04-12",
  primaryPhone: "+15552345678",
  emergencyContactName: "Sarah Jenkins (Daughter)",
  emergencyContactPhone: "+15559876543",
};

const DEFAULT_DEMO_USER: User = {
  id: "usr_margaret_123",
  fullName: "Margaret Jenkins",
  email: "margaret.jenkins@example.com",
  role: "ELDERLY_PATIENT",
  primaryPhone: "+15552345678",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [activePatientId, setActivePatientId] = useState<string>("pat_margaret_123");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from storage or default to Margaret demo profile
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedToken = localStorage.getItem("carenest_token");
      const savedUser = localStorage.getItem("carenest_user");
      const savedPatient = localStorage.getItem("carenest_patient");

      if (savedToken && savedUser) {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        if (savedPatient) {
          const parsedPatient = JSON.parse(savedPatient);
          setPatientProfile(parsedPatient);
          setActivePatientId(parsedPatient.id);
        } else {
          setPatientProfile(DEFAULT_DEMO_PATIENT);
          setActivePatientId(DEFAULT_DEMO_PATIENT.id);
        }
      } else {
        // Fallback to demo profile for immediate visual dashboard preview
        setUser(DEFAULT_DEMO_USER);
        setPatientProfile(DEFAULT_DEMO_PATIENT);
        setActivePatientId(DEFAULT_DEMO_PATIENT.id);
      }
    } catch (e) {
      setUser(DEFAULT_DEMO_USER);
      setPatientProfile(DEFAULT_DEMO_PATIENT);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post("/api/v1/auth/login", { email, password });
      const { user: authedUser, accessToken, patient } = res;

      setUser(authedUser);
      setToken(accessToken);

      localStorage.setItem("carenest_token", accessToken);
      localStorage.setItem("carenest_user", JSON.stringify(authedUser));

      if (patient) {
        setPatientProfile(patient);
        setActivePatientId(patient.id);
        localStorage.setItem("carenest_patient", JSON.stringify(patient));
      } else {
        setPatientProfile(DEFAULT_DEMO_PATIENT);
        setActivePatientId(DEFAULT_DEMO_PATIENT.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.post("/api/v1/auth/register", payload);
      const { user: registeredUser, accessToken, patient } = res;

      setUser(registeredUser);
      setToken(accessToken);

      localStorage.setItem("carenest_token", accessToken);
      localStorage.setItem("carenest_user", JSON.stringify(registeredUser));

      if (patient) {
        setPatientProfile(patient);
        setActivePatientId(patient.id);
        localStorage.setItem("carenest_patient", JSON.stringify(patient));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setPatientProfile(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("carenest_token");
      localStorage.removeItem("carenest_user");
      localStorage.removeItem("carenest_patient");
    }
  };

  const setDemoUser = (role: "PATIENT" | "CAREGIVER" | "DOCTOR") => {
    if (role === "PATIENT") {
      setUser(DEFAULT_DEMO_USER);
      setPatientProfile(DEFAULT_DEMO_PATIENT);
      setActivePatientId(DEFAULT_DEMO_PATIENT.id);
    } else if (role === "CAREGIVER") {
      setUser({
        id: "usr_sarah_456",
        fullName: "Sarah Jenkins",
        email: "sarah.jenkins@example.com",
        role: "FAMILY_MEMBER",
        primaryPhone: "+15559876543",
      });
      setPatientProfile(DEFAULT_DEMO_PATIENT);
      setActivePatientId(DEFAULT_DEMO_PATIENT.id);
    } else {
      setUser({
        id: "usr_doc_789",
        fullName: "Dr. Robert Chen",
        email: "dr.chen@metroheart.com",
        role: "PHYSICIAN",
        primaryPhone: "+15554321098",
      });
      setPatientProfile(DEFAULT_DEMO_PATIENT);
      setActivePatientId(DEFAULT_DEMO_PATIENT.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        patientProfile,
        activePatientId,
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
