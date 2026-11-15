"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

export default function CaregiverDashboardPage() {
  const { linkedPatients, activePatient, setActivePatientId } = useAuth();
  const { t, language } = useLanguage();
  const [callAlert, setCallAlert] = useState<string | null>(null);

  const handleCallSenior = (patientName: string, phone?: string) => {
    setCallAlert(`Initiating secure direct call to ${patientName} (${phone || "+15552345678"})...`);
    setTimeout(() => setCallAlert(null), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 warm-card-shadow">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-sm">family_restroom</span>
            <span>{t("roles.caregiverView")}</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
            {t("caregiver.overviewTitle")}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {t("caregiver.overviewSub")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/schedule"
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
          >
            <span className="material-symbols-outlined text-xl">calendar_today</span>
            <span>{t("nav.schedule")}</span>
          </Link>
          <Link
            href="/care-circle"
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 font-bold text-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">group</span>
            <span>{t("nav.careCircle")}</span>
          </Link>
        </div>
      </div>

      {callAlert && (
        <div className="p-4 rounded-xl bg-primary-fixed text-on-primary-fixed font-bold text-sm flex items-center gap-3 animate-pulse border border-primary/30">
          <span className="material-symbols-outlined text-xl">call</span>
          <span>{callAlert}</span>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow">
          <div className="flex items-center justify-between text-on-surface-variant text-sm font-semibold mb-2">
            <span>{t("caregiver.adherenceRate")}</span>
            <span className="w-8 h-8 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">verified</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-primary">94%</div>
          <p className="text-xs text-primary font-bold mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>+2.4% past 30 days</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow">
          <div className="flex items-center justify-between text-on-surface-variant text-sm font-semibold mb-2">
            <span>{t("caregiver.activeDoses")}</span>
            <span className="w-8 h-8 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">medication</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-secondary">5 Doses</div>
          <p className="text-xs text-on-surface-variant mt-1.5">
            2 confirmed, 1 due right now
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow">
          <div className="flex items-center justify-between text-on-surface-variant text-sm font-semibold mb-2">
            <span>{t("caregiver.alertsPending")}</span>
            <span className="w-8 h-8 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">notifications_active</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-tertiary">0 Active</div>
          <p className="text-xs text-primary font-bold mt-1.5">
            All loved ones stable & safe
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow">
          <div className="flex items-center justify-between text-on-surface-variant text-sm font-semibold mb-2">
            <span>{t("appointments.upcomingTitle")}</span>
            <span className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-lg">directions_car</span>
            </span>
          </div>
          <div className="font-headline text-xl font-bold text-on-surface">Tomorrow</div>
          <p className="text-xs text-primary font-bold mt-1.5">
            SilverRide confirmed 1:15 PM
          </p>
        </div>
      </div>

      {/* Linked Patients Multi-Patient Roster */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-secondary">
              supervisor_account
            </span>
            <span>{t("caregiver.linkedPatients")}</span>
          </h2>
          <span className="text-xs sm:text-sm text-on-surface-variant">
            {language === "hi"
              ? "दवा और स्वास्थ्य देखने के लिए किसी भी मरीज़ को चुनें"
              : "Click any profile to set active view across the platform"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {linkedPatients.map((patient) => {
            const isActive = activePatient.id === patient.id;

            return (
              <div
                key={patient.id}
                className={`p-6 rounded-2xl border-2 transition-all relative ${
                  isActive
                    ? "bg-surface-container-lowest border-primary warm-active-shadow ring-2 ring-primary/20"
                    : "bg-surface-container-low border-outline-variant/40 hover:border-secondary warm-card-shadow"
                }`}
              >
                {isActive && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>{t("common.active")}</span>
                  </span>
                )}

                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-headline text-2xl font-bold shadow-sm">
                    {patient.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-headline text-xl font-bold text-on-surface">
                      {patient.fullName}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-medium">
                      {patient.relationshipLabel || "Family Member"} • Age {patient.age || 76} • {patient.primaryPhone}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {patient.chronicConditions?.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface text-[11px] font-semibold"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-outline-variant/30 text-center my-4">
                  <div>
                    <p className="text-[11px] text-on-surface-variant">Adherence</p>
                    <p className="font-headline text-lg font-bold text-primary">
                      {patient.id === "pat_margaret_123" ? "94%" : "88%"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-on-surface-variant">Next Dose</p>
                    <p className="font-headline text-sm font-bold text-on-surface mt-1">
                      {patient.id === "pat_margaret_123" ? "1:00 PM" : "2:00 PM"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-on-surface-variant">Health Status</p>
                    <p className="font-headline text-xs font-bold text-primary mt-1">
                      Stable & Safe
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setActivePatientId(patient.id)}
                    type="button"
                    className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-surface-container text-on-surface border border-outline-variant/40"
                        : "bg-primary text-on-primary hover:opacity-90 shadow-sm"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {isActive ? "visibility" : "touch_app"}
                    </span>
                    <span>
                      {isActive
                        ? t("roles.managing") + " (Selected)"
                        : t("caregiver.switchPatientCTA")}
                    </span>
                  </button>

                  <button
                    onClick={() => handleCallSenior(patient.fullName, patient.primaryPhone)}
                    type="button"
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-secondary text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">call</span>
                    <span>{t("caregiver.callPatient")}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-Time Caregiver Activity Stream */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow space-y-4">
        <h3 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-primary">history</span>
          <span>{t("caregiver.recentTimeline")}</span>
        </h3>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-base">check</span>
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">
                  Margaret confirmed Lisinopril 10mg (Morning Dose)
                </p>
                <p className="text-xs text-on-surface-variant">Self-reported intake with toast</p>
              </div>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">8:12 AM</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-base">bloodtype</span>
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">
                  Fasting Glucose Logged: 108 mg/dL
                </p>
                <p className="text-xs text-primary font-bold">Stable within target fasting range</p>
              </div>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">7:45 AM</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-surface-container text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-base">directions_car</span>
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">
                  SilverRide Transportation Confirmed for Dr. Robert Chen
                </p>
                <p className="text-xs text-on-surface-variant">Tomorrow pickup at 1:15 PM</p>
              </div>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">Yesterday</span>
          </div>
        </div>
      </div>
    </div>
  );
}
