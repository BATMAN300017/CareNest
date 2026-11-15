"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

export default function DoctorDashboardPage() {
  const { activePatient, linkedPatients, setActivePatientId } = useAuth();
  const { t, language } = useLanguage();
  const [noteText, setNoteText] = useState("");
  const [noteSuccess, setNoteSuccess] = useState(false);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setNoteSuccess(true);
    setNoteText("");
    setTimeout(() => setNoteSuccess(false), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Clinician Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 warm-card-shadow">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-sm">stethoscope</span>
            <span>{t("roles.doctorView")}</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
            {t("doctor.overviewTitle")}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {t("doctor.overviewSub")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/appointments"
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-secondary text-on-secondary font-bold text-sm flex items-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
          >
            <span className="material-symbols-outlined text-xl">medical_services</span>
            <span>{t("doctor.reviewAppointments")}</span>
          </Link>
          <Link
            href="/schedule"
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 font-bold text-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">calendar_today</span>
            <span>{t("nav.schedule")}</span>
          </Link>
        </div>
      </div>

      {/* Clinical KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow">
          <p className="text-sm font-semibold text-on-surface-variant">
            {t("doctor.authorizedPatients")}
          </p>
          <div className="font-headline text-3xl font-bold text-secondary mt-2">
            {linkedPatients.length} Active Patients
          </div>
          <p className="text-xs text-primary font-bold mt-2">
            100% Verified Healthcare Proxy Consent
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow">
          <p className="text-sm font-semibold text-on-surface-variant">
            {t("doctor.adherenceGrade")}
          </p>
          <div className="font-headline text-3xl font-bold text-primary mt-2">
            94% (Grade A)
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            42 of 45 scheduled doses confirmed
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow">
          <p className="text-sm font-semibold text-on-surface-variant">
            {t("doctor.vitalTrends")}
          </p>
          <div className="font-headline text-3xl font-bold text-primary mt-2">
            Stable & Optimal
          </div>
          <p className="text-xs text-primary font-bold mt-2">
            No hypertensive or hypoglycemic crises
          </p>
        </div>
      </div>

      {/* Authorized Patient Roster Selection */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-xl font-bold text-on-surface">
            {t("doctor.authorizedPatients")}
          </h2>
          <span className="text-xs text-on-surface-variant">
            Current Clinical Selection: <strong className="text-primary">{activePatient.fullName}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {linkedPatients.map((p) => {
            const isSelected = p.id === activePatient.id;

            return (
              <div
                key={p.id}
                onClick={() => setActivePatientId(p.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? "bg-surface-container border-secondary shadow-sm"
                    : "bg-surface-container-low border-outline-variant/30 hover:border-outline"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary text-on-secondary flex items-center justify-center font-bold text-lg">
                    {p.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-base text-on-surface">
                      {p.fullName}
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      DOB: {p.dateOfBirth} • Age {p.age || 76}
                    </p>
                    <p className="text-[11px] text-primary font-semibold mt-0.5">
                      Consent: FULL_HEALTHCARE_PROXY (Active)
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold">
                    {p.id === "pat_margaret_123" ? "94% Adherence" : "88% Adherence"}
                  </span>
                  <p className="text-[11px] text-on-surface-variant mt-1.5">
                    {isSelected ? "Currently Viewing" : "Click to Review"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinical Observations & Progress Notes Form */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow space-y-4">
        <h3 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-secondary">edit_note</span>
          <span>
            {t("doctor.addClinicalNote")} for {activePatient.fullName}
          </span>
        </h3>

        {noteSuccess && (
          <div className="p-4 rounded-xl bg-primary-fixed text-on-primary-fixed font-bold text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <span>
              Clinical observation logged and signed by Dr. Robert Chen. Visible to authorized Care Circle.
            </span>
          </div>
        )}

        <form onSubmit={handleAddNote} className="space-y-4">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="e.g. Patient blood pressure well controlled on Lisinopril 10mg daily. Advised continuing current dose and fasting glucose monitoring."
            className="w-full p-4 rounded-xl bg-surface-container-low border border-outline-variant focus:border-secondary focus:outline-none text-sm text-on-surface"
          />

          <button
            type="submit"
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-secondary text-on-secondary font-bold text-sm flex items-center gap-2 hover:opacity-95 transition-opacity"
          >
            <span className="material-symbols-outlined text-lg">save</span>
            <span>Sign &amp; Save Clinical Note</span>
          </button>
        </form>
      </div>
    </div>
  );
}
