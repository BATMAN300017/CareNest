"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { HeroProgress } from "@/components/schedule/hero-progress";
import { ConfirmDoseDialog } from "@/components/schedule/confirm-dose-dialog";
import { SkipDoseDialog } from "@/components/schedule/skip-dose-dialog";
import { SnoozeDoseDialog } from "@/components/schedule/snooze-dose-dialog";
import { HydrationWidget } from "@/components/schedule/hydration-widget";
import { CareCircleSidebarCard } from "@/components/schedule/care-circle-sidebar-card";
import { VoiceAssistantModal } from "@/components/accessibility/voice-assistant-modal";
import Link from "next/link";

interface DoseItem {
  id: string;
  medicationName: string;
  genericName?: string;
  strength: string;
  form: string;
  scheduledTime: string;
  timeSlot: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT";
  status: "DUE_NOW" | "TAKEN" | "UPCOMING" | "SKIPPED" | "MISSED" | "SNOOZED";
  instructions: string;
  mealContext?: string;
  takenAtTime?: string;
  takenBy?: string;
  imprintText?: string;
  shapeDescription?: string;
  categoryTag?: string;
}

const DEFAULT_DOSES: DoseItem[] = [
  {
    id: "dose_morn_1",
    medicationName: "Lisinopril",
    genericName: "Lisinopril",
    strength: "10mg",
    form: "TABLET",
    scheduledTime: "8:00 AM",
    timeSlot: "MORNING",
    status: "TAKEN",
    instructions: "1 Tablet for blood pressure with morning meal",
    mealContext: "Taken with orange juice and toast",
    takenAtTime: "8:12 AM",
    takenBy: "Margaret (Self-reported)",
    imprintText: "L 10",
    shapeDescription: "Oval White/Blue",
    categoryTag: "Blood Pressure",
  },
  {
    id: "dose_morn_2",
    medicationName: "Vitamin D3",
    genericName: "Cholecalciferol",
    strength: "2000 IU",
    form: "SOFTGEL",
    scheduledTime: "8:00 AM",
    timeSlot: "MORNING",
    status: "TAKEN",
    instructions: "1 Softgel with morning breakfast",
    mealContext: "Taken with toast",
    takenAtTime: "8:12 AM",
    takenBy: "Margaret (Self-reported)",
    shapeDescription: "Round Golden Softgel",
    categoryTag: "Bone Health",
  },
  {
    id: "dose_afternoon_1",
    medicationName: "Metformin",
    genericName: "Metformin HCl",
    strength: "500mg",
    form: "TABLET",
    scheduledTime: "1:00 PM",
    timeSlot: "AFTERNOON",
    status: "DUE_NOW",
    instructions: "1 White Oval Tablet • Take with warm meal and 8 oz water",
    imprintText: "M 500",
    shapeDescription: "Large White Oval Tablet",
    categoryTag: "Blood Sugar",
  },
  {
    id: "dose_evening_1",
    medicationName: "Atorvastatin",
    genericName: "Atorvastatin Calcium",
    strength: "20mg",
    form: "TABLET",
    scheduledTime: "7:00 PM",
    timeSlot: "EVENING",
    status: "UPCOMING",
    instructions: "1 Small Yellow Round Pill with dinner",
    shapeDescription: "Small Yellow Round Pill",
    categoryTag: "Cholesterol",
  },
  {
    id: "dose_night_1",
    medicationName: "Melatonin",
    genericName: "Melatonin",
    strength: "3mg",
    form: "TABLET",
    scheduledTime: "9:30 PM",
    timeSlot: "NIGHT",
    status: "UPCOMING",
    instructions: "1 Chewable Tablet 30 minutes before sleep",
    shapeDescription: "Purple Sleep Tablet",
    categoryTag: "Sleep Aid",
  },
];

export default function SchedulePage() {
  const { activePatientId } = useAuth();
  const [doses, setDoses] = useState<DoseItem[]>(DEFAULT_DOSES);
  const [activeDose, setActiveDose] = useState<DoseItem | null>(null);
  const [dialogMode, setDialogMode] = useState<"CONFIRM" | "SKIP" | "SNOOZE" | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Load patient doses from backend API if available
  useEffect(() => {
    async function loadBackendDoses() {
      try {
        const res = await api.get(`/api/v1/patients/${activePatientId}/doses`);
        if (Array.isArray(res) && res.length > 0) {
          // Map backend doses
          const mapped = res.map((item: any) => ({
            id: item.id,
            medicationName: item.medication?.brandName || item.medication?.genericName || "Medication",
            genericName: item.medication?.genericName,
            strength: item.medication?.strength || "",
            form: item.medication?.dosageForm || "TABLET",
            scheduledTime: item.scheduledForUtc
              ? new Date(item.scheduledForUtc).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "1:00 PM",
            timeSlot: "AFTERNOON" as const,
            status: item.status,
            instructions: item.medication?.instructions || "Take as prescribed",
            imprintText: item.medication?.imprint,
            categoryTag: item.medication?.category || "Prescription",
          }));
          setDoses(mapped);
        }
      } catch (err) {
        // Retain default verified doses
      }
    }
    loadBackendDoses();
  }, [activePatientId]);

  const completedCount = doses.filter((d) => d.status === "TAKEN").length;
  const totalCount = doses.length;

  const handleConfirmSuccess = () => {
    if (!activeDose) return;
    setDoses((prev) =>
      prev.map((d) =>
        d.id === activeDose.id
          ? {
              ...d,
              status: "TAKEN",
              takenAtTime: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
              takenBy: "Margaret (Confirmed)",
            }
          : d
      )
    );
  };

  const handleSkipSuccess = () => {
    if (!activeDose) return;
    setDoses((prev) =>
      prev.map((d) =>
        d.id === activeDose.id
          ? {
              ...d,
              status: "SKIPPED",
            }
          : d
      )
    );
  };

  const handleSnoozeSuccess = () => {
    if (!activeDose) return;
    setDoses((prev) =>
      prev.map((d) =>
        d.id === activeDose.id
          ? {
              ...d,
              status: "SNOOZED",
            }
          : d
      )
    );
  };

  return (
    <div>
      {/* Hero Announcement & Progress Ring */}
      <HeroProgress
        completedCount={completedCount}
        totalCount={totalCount}
        onOpenVoice={() => setIsVoiceOpen(true)}
      />

      {/* Two-Column Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left/Center Column: Daily Medication Journey (8 cols) */}
        <section aria-label="Daily Medication Routine" className="xl:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-primary material-symbols-fill">
                schedule
              </span>
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                Today&apos;s Medication Journey
              </h2>
            </div>
            <span className="text-sm sm:text-base text-on-surface-variant font-medium">
              Sorted chronologically
            </span>
          </div>

          {/* Time Chunk 1: Morning (8:00 AM) - Completed */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 transition-all">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary font-bold">
                  <span className="material-symbols-outlined text-2xl">wb_twilight</span>
                </span>
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">
                    Morning Routine
                  </h3>
                  <span className="text-sm text-on-surface-variant">Scheduled for 8:00 AM</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-xs sm:text-sm">
                <span className="material-symbols-outlined text-lg material-symbols-fill">
                  check_circle
                </span>
                Completed at 8:12 AM
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doses
                .filter((d) => d.timeSlot === "MORNING")
                .map((dose) => (
                  <div
                    key={dose.id}
                    className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-4"
                  >
                    <div className="w-14 h-14 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                      <span className="material-symbols-outlined text-3xl text-secondary">
                        medication
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-headline text-lg font-bold text-on-surface">
                        {dose.medicationName} {dose.strength}
                      </h4>
                      <p className="text-sm text-on-surface-variant">{dose.instructions}</p>
                      <p className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">check</span>
                        {dose.mealContext || "Taken as scheduled"}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Time Chunk 2: Afternoon (1:00 PM) - Highlighted Active Hero Card */}
          {doses.find((d) => d.timeSlot === "AFTERNOON") && (
            (() => {
              const dose = doses.find((d) => d.timeSlot === "AFTERNOON")!;
              const isDueNow = dose.status === "DUE_NOW";
              const isTaken = dose.status === "TAKEN";

              return (
                <div
                  className={`bg-surface-container-lowest rounded-2xl border-2 p-6 relative overflow-hidden transition-all ${
                    isDueNow
                      ? "border-tertiary warm-active-shadow"
                      : "border-outline-variant/30 warm-card-shadow"
                  }`}
                >
                  {isDueNow && <div className="absolute top-0 left-0 right-0 h-2 bg-tertiary"></div>}

                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-outline-variant/20 pt-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
                          isDueNow
                            ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                            : "bg-surface-container text-secondary"
                        }`}
                      >
                        <span className="material-symbols-outlined text-2xl material-symbols-fill">
                          light_mode
                        </span>
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-headline text-xl font-bold text-on-surface">
                            Afternoon Dose
                          </h3>
                          {isDueNow && (
                            <span className="px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-extrabold text-xs tracking-wide uppercase animate-pulse">
                              Due Right Now
                            </span>
                          )}
                          {isTaken && (
                            <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-xs uppercase">
                              ✓ Taken
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-on-surface-variant">
                          Scheduled for {dose.scheduledTime} (Lunchtime)
                        </span>
                      </div>
                    </div>

                    {isDueNow && (
                      <div className="flex items-center gap-2 text-tertiary font-bold text-sm sm:text-base">
                        <span className="material-symbols-outlined text-2xl">alarm</span>
                        <span>Ready now</span>
                      </div>
                    )}
                  </div>

                  {/* Medicine Card Hero Spec */}
                  <div className="p-6 rounded-xl bg-surface-container-low/60 border border-outline-variant/40 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-5">
                        <div className="w-20 h-20 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/50 shadow-sm flex flex-col items-center justify-center flex-shrink-0 p-2">
                          <div className="w-12 h-6 rounded-full bg-white border-2 border-outline shadow-inner flex items-center justify-center">
                            <div className="w-px h-4 bg-outline-variant"></div>
                          </div>
                          <span className="text-[11px] text-outline font-bold mt-1 uppercase">
                            {dose.imprintText || "M 500"}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-headline text-2xl font-bold text-on-surface">
                              {dose.medicationName} {dose.strength}
                            </h4>
                            <span className="px-3 py-0.5 rounded-full bg-surface-container text-secondary font-bold text-xs">
                              {dose.categoryTag || "Blood Sugar"}
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-medium text-on-surface mt-1">
                            {dose.instructions}
                          </p>
                          <p className="text-sm sm:text-base text-on-surface-variant flex items-center gap-2 mt-2">
                            <span className="material-symbols-outlined text-2xl text-secondary">
                              water_drop
                            </span>
                            <span>Drink with a full 8 oz glass of water to avoid stomach discomfort.</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accessible Action Buttons */}
                  {isDueNow ? (
                    <div className="flex flex-col sm:flex-row items-stretch gap-4">
                      {/* Big 'I Have Taken This' Button */}
                      <button
                        onClick={() => {
                          setActiveDose(dose);
                          setDialogMode("CONFIRM");
                        }}
                        className="flex-1 min-h-[60px] bg-primary hover:bg-on-primary-fixed-variant active:scale-[0.98] text-on-primary rounded-xl font-headline text-lg sm:text-xl font-bold flex items-center justify-center gap-3 shadow-lg transition-all focus:ring-4 focus:ring-primary-fixed"
                        id="mark-taken-btn"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-3xl material-symbols-fill">
                          task_alt
                        </span>
                        <span>✓ I Have Taken This</span>
                      </button>

                      {/* Snooze Button */}
                      <button
                        onClick={() => {
                          setActiveDose(dose);
                          setDialogMode("SNOOZE");
                        }}
                        className="min-h-[60px] px-6 bg-surface-container-lowest hover:bg-surface-container active:scale-[0.98] text-secondary border-2 border-secondary rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-base"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-2xl">snooze</span>
                        <span>Remind in 15 mins</span>
                      </button>

                      {/* Skip Button */}
                      <button
                        onClick={() => {
                          setActiveDose(dose);
                          setDialogMode("SKIP");
                        }}
                        className="min-h-[60px] px-5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-error border border-outline-variant/40 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-sm"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-xl">block</span>
                        <span>Hold / Skip</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-primary-fixed/30 rounded-xl border border-primary/20 flex items-center justify-between">
                      <span className="text-base text-primary font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-2xl">check_circle</span>
                        Confirmed taken at {dose.takenAtTime || "1:15 PM"}
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        {dose.takenBy || "Margaret"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* Time Chunk 3: Evening & Night - Upcoming */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary font-bold">
                  <span className="material-symbols-outlined text-2xl">bedtime</span>
                </span>
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">Later Tonight</h3>
                  <span className="text-sm text-on-surface-variant">2 Upcoming doses</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-bold text-xs sm:text-sm">
                <span className="material-symbols-outlined text-lg">schedule</span>
                Upcoming
              </span>
            </div>

            <div className="space-y-4">
              {doses
                .filter((d) => d.timeSlot === "EVENING" || d.timeSlot === "NIGHT")
                .map((dose) => (
                  <div
                    key={dose.id}
                    className="p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/30 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-3xl text-secondary">
                          pill
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-headline text-base sm:text-lg font-bold text-on-surface">
                            {dose.medicationName} {dose.strength}
                          </h4>
                          <span className="text-xs text-on-surface-variant font-semibold">
                            ({dose.categoryTag || "Prescription"})
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant">
                          {dose.scheduledTime} • {dose.instructions}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/medications"
                      className="min-h-[48px] px-5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-sm transition-colors whitespace-nowrap flex items-center"
                    >
                      View Details
                    </Link>
                  </div>
                ))}
            </div>
          </div>

          {/* Health Vitals Quick Preview Module */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6" id="vitals">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-primary material-symbols-fill">
                  monitor_heart
                </span>
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  Today&apos;s Health Vitals
                </h3>
              </div>
              <span className="text-sm text-on-surface-variant font-medium hidden sm:inline">
                Logged wirelessly via Omron Hub
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Vital 1: Blood Pressure */}
              <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-on-surface-variant font-semibold">
                    Blood Pressure
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-xl">favorite</span>
                  </span>
                </div>
                <div className="font-headline text-2xl font-bold text-on-surface">
                  122/80 <span className="text-sm font-normal text-on-surface-variant">mmHg</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span className="text-xs text-primary font-bold">Normal Range</span>
                  <span className="text-xs text-on-surface-variant ml-auto">8:30 AM</span>
                </div>
              </div>

              {/* Vital 2: Blood Glucose */}
              <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-on-surface-variant font-semibold">
                    Fasting Glucose
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-xl">bloodtype</span>
                  </span>
                </div>
                <div className="font-headline text-2xl font-bold text-on-surface">
                  108 <span className="text-sm font-normal text-on-surface-variant">mg/dL</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span className="text-xs text-primary font-bold">Stable &amp; Optimal</span>
                  <span className="text-xs text-on-surface-variant ml-auto">7:45 AM</span>
                </div>
              </div>

              {/* Vital 3: Hydration Glass Counter */}
              <HydrationWidget initialCount={4} />
            </div>

            {/* Upcoming Doctor Appointment High Priority Banner */}
            <div className="p-5 rounded-xl bg-surface-container border-2 border-secondary/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">medical_information</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase">
                      Tomorrow
                    </span>
                    <h4 className="font-headline text-lg font-bold text-on-surface">
                      Cardiology Check-up with Dr. Robert Chen
                    </h4>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Tomorrow at 2:00 PM • Memorial Heart Pavilion, Suite 304
                  </p>
                  <p className="text-sm text-primary font-bold flex items-center gap-1.5 mt-1">
                    <span className="material-symbols-outlined text-base">directions_car</span>
                    Transport confirmed via SilverRide at 1:15 PM (Door-to-door escort)
                  </p>
                </div>
              </div>
              <Link
                href="/appointments"
                className="min-h-[48px] px-6 py-2.5 rounded-xl bg-surface-container-lowest text-secondary border border-secondary font-bold text-sm hover:bg-surface-container-high transition-colors whitespace-nowrap flex items-center justify-center"
              >
                Review Ride &amp; Prep
              </Link>
            </div>
          </div>
        </section>

        {/* Right Column: Family & Care Circle Stream (4 cols) */}
        <aside aria-label="Family and Care Circle" className="xl:col-span-4 space-y-6">
          <CareCircleSidebarCard />
        </aside>
      </div>

      {/* Action Dialogs */}
      <ConfirmDoseDialog
        isOpen={dialogMode === "CONFIRM"}
        onClose={() => {
          setDialogMode(null);
          setActiveDose(null);
        }}
        dose={activeDose}
        onSuccess={handleConfirmSuccess}
      />

      <SkipDoseDialog
        isOpen={dialogMode === "SKIP"}
        onClose={() => {
          setDialogMode(null);
          setActiveDose(null);
        }}
        dose={activeDose}
        onSuccess={handleSkipSuccess}
      />

      <SnoozeDoseDialog
        isOpen={dialogMode === "SNOOZE"}
        onClose={() => {
          setDialogMode(null);
          setActiveDose(null);
        }}
        dose={activeDose}
        onSuccess={handleSnoozeSuccess}
      />

      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onVoiceCommand={(cmd) => {
          if (cmd === "MARK_TAKEN") {
            const dueDose = doses.find((d) => d.status === "DUE_NOW");
            if (dueDose) {
              setActiveDose(dueDose);
              handleConfirmSuccess();
            }
          }
        }}
      />
    </div>
  );
}
