"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { AddMedicationDialog } from "@/components/medications/add-medication-dialog";
import { DiscontinueDialog } from "@/components/medications/discontinue-dialog";

interface MedicationItem {
  id: string;
  brandName: string;
  genericName?: string;
  strength: string;
  dosageForm: string;
  status: "ACTIVE" | "PAUSED" | "DISCONTINUED";
  instructions: string;
  prescribingDoctorName?: string;
  currentStock: number;
  refillsRemaining?: number;
  scheduledTimes: string[];
  streakDays: number;
  adherenceRate: number;
  specialPrecautions?: string;
}

const DEFAULT_MEDICATIONS: MedicationItem[] = [
  {
    id: "med_lisinopril",
    brandName: "Lisinopril",
    genericName: "Lisinopril",
    strength: "10mg",
    dosageForm: "TABLET",
    status: "ACTIVE",
    instructions: "Take 1 tablet daily in the morning with food",
    prescribingDoctorName: "Dr. Robert Chen (Cardiology)",
    currentStock: 24,
    refillsRemaining: 2,
    scheduledTimes: ["8:00 AM"],
    streakDays: 14,
    adherenceRate: 98,
    specialPrecautions: "Monitor blood pressure; take with orange juice or food",
  },
  {
    id: "med_metformin",
    brandName: "Metformin",
    genericName: "Metformin HCl",
    strength: "500mg",
    dosageForm: "TABLET",
    status: "ACTIVE",
    instructions: "Take 1 tablet twice daily with meals and full 8 oz glass of water",
    prescribingDoctorName: "Dr. Sarah Al-Mansoor (Endocrinology)",
    currentStock: 8, // Low stock badge!
    refillsRemaining: 1,
    scheduledTimes: ["8:00 AM", "1:00 PM"],
    streakDays: 12,
    adherenceRate: 95,
    specialPrecautions: "Do not crush tablet. Drink plenty of fluids.",
  },
  {
    id: "med_atorvastatin",
    brandName: "Atorvastatin",
    genericName: "Atorvastatin Calcium",
    strength: "20mg",
    dosageForm: "TABLET",
    status: "ACTIVE",
    instructions: "Take 1 tablet at dinner time",
    prescribingDoctorName: "Dr. Robert Chen",
    currentStock: 28,
    refillsRemaining: 3,
    scheduledTimes: ["7:00 PM"],
    streakDays: 20,
    adherenceRate: 100,
    specialPrecautions: "Avoid excessive grapefruit juice consumption",
  },
  {
    id: "med_vitamin_d",
    brandName: "Vitamin D3",
    genericName: "Cholecalciferol",
    strength: "2000 IU",
    dosageForm: "SOFTGEL",
    status: "ACTIVE",
    instructions: "Take 1 softgel every morning with breakfast",
    prescribingDoctorName: "Dr. Emily Taylor (Primary Care)",
    currentStock: 45,
    refillsRemaining: 4,
    scheduledTimes: ["8:00 AM"],
    streakDays: 30,
    adherenceRate: 100,
    specialPrecautions: "Fat-soluble; best absorbed with dietary fat",
  },
  {
    id: "med_melatonin",
    brandName: "Melatonin",
    genericName: "Melatonin",
    strength: "3mg",
    dosageForm: "TABLET",
    status: "ACTIVE",
    instructions: "Take 1 chewable tablet 30 minutes before sleep",
    currentStock: 18,
    scheduledTimes: ["9:30 PM"],
    streakDays: 8,
    adherenceRate: 90,
  },
];

export default function MedicationsPage() {
  const { activePatientId } = useAuth();
  const [medications, setMedications] = useState<MedicationItem[]>(DEFAULT_MEDICATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PAUSED" | "DISCONTINUED">("ACTIVE");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [discontinueTarget, setDiscontinueTarget] = useState<MedicationItem | null>(null);

  const fetchMedications = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/patients/${activePatientId}/medications`);
      if (Array.isArray(res) && res.length > 0) {
        const mapped = res.map((m: any) => ({
          id: m.id,
          brandName: m.brandName,
          genericName: m.genericName,
          strength: m.strength,
          dosageForm: m.dosageForm || "TABLET",
          status: m.status || "ACTIVE",
          instructions: m.instructions || "Take as prescribed",
          prescribingDoctorName: m.prescribingDoctorName,
          currentStock: m.currentStock || 30,
          refillsRemaining: m.refillsRemaining,
          scheduledTimes: m.schedules?.flatMap((s: any) => s.specificTimes) || ["08:00"],
          streakDays: m.streakDays || 14,
          adherenceRate: m.adherenceRate || 95,
          specialPrecautions: m.specialPrecautions,
        }));
        setMedications(mapped);
      }
    } catch (e) {
      // Retain verified defaults
    }
  }, [activePatientId]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const filteredMeds = medications.filter((m) => {
    const matchesTab = m.status === activeTab;
    const matchesSearch =
      m.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.genericName && m.genericName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
            My Medications
          </h2>
          <p className="text-base text-on-surface-variant">
            Manage your daily prescriptions, schedules, and pharmacy refills
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="min-h-[56px] px-6 py-3 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-2xl material-symbols-fill">
            add_circle
          </span>
          <span>Add New Medication</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4 warm-card-shadow flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-2xl">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medications by name..."
            className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-outline-variant/50 focus:border-primary text-base bg-surface-container-low"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 bg-surface-container rounded-xl p-1 w-full md:w-auto">
          {(["ACTIVE", "PAUSED", "DISCONTINUED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-bold text-sm transition-all min-h-[40px] ${
                activeTab === tab
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab === "ACTIVE"
                ? `Active (${medications.filter((m) => m.status === "ACTIVE").length})`
                : tab === "PAUSED"
                ? "Paused"
                : "Discontinued"}
            </button>
          ))}
        </div>
      </div>

      {/* Medication Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMeds.map((med) => {
          const isLowStock = med.currentStock <= 10;

          return (
            <div
              key={med.id}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 flex flex-col justify-between transition-all hover:shadow-md"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-center flex-shrink-0 shadow-inner">
                      <span className="material-symbols-outlined text-3xl text-secondary material-symbols-fill">
                        {med.dosageForm === "SOFTGEL"
                          ? "bubble_chart"
                          : med.dosageForm === "INHALER"
                          ? "air"
                          : "medication"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline text-xl font-bold text-on-surface">
                        {med.brandName} {med.strength}
                      </h3>
                      {med.genericName && med.genericName !== med.brandName && (
                        <p className="text-xs text-on-surface-variant font-medium">
                          Generic: {med.genericName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stock Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      isLowStock
                        ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    {isLowStock
                      ? `⚠️ Only ${med.currentStock} left`
                      : `${med.currentStock} in bottle`}
                  </span>
                </div>

                {/* Instructions */}
                <p className="text-base text-on-surface font-medium mb-3">
                  {med.instructions}
                </p>

                {/* Schedule Times */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-xs text-on-surface-variant font-semibold">
                    Scheduled Times:
                  </span>
                  {med.scheduledTimes.map((time, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-primary-fixed/40 text-on-primary-fixed text-xs font-bold"
                    >
                      {time}
                    </span>
                  ))}
                </div>

                {/* Adherence Streak */}
                <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-primary bg-primary-fixed/20 p-2.5 rounded-xl border border-primary/20">
                  <span className="text-base">🔥</span>
                  <span>
                    {med.streakDays}-day streak • {med.adherenceRate}% adherence rate
                  </span>
                </div>

                {/* Prescriber & Notes */}
                {med.prescribingDoctorName && (
                  <p className="text-xs text-on-surface-variant mb-1">
                    <span className="font-semibold">Prescriber:</span>{" "}
                    {med.prescribingDoctorName}
                  </p>
                )}
                {med.specialPrecautions && (
                  <p className="text-xs text-secondary mb-1">
                    <span className="font-semibold">Precautions:</span>{" "}
                    {med.specialPrecautions}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-outline-variant/20 flex items-center justify-between gap-3">
                <span className="text-xs text-on-surface-variant">
                  {med.refillsRemaining !== undefined
                    ? `${med.refillsRemaining} refills remaining`
                    : "Prescription on file"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDiscontinueTarget(med)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-outline-variant/40 hover:bg-error-container hover:text-on-error-container text-on-surface-variant text-xs font-bold transition-colors"
                  >
                    Discontinue
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMeds.length === 0 && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-12 text-center warm-card-shadow">
          <span className="material-symbols-outlined text-5xl text-outline mb-3">
            medication_liquid
          </span>
          <h3 className="font-headline text-xl font-bold text-on-surface">
            No medications found
          </h3>
          <p className="text-sm text-on-surface-variant mt-1 mb-6">
            There are no medications matching your current filter.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="min-h-[48px] px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm"
          >
            Add New Medication
          </button>
        </div>
      )}

      {/* Modals */}
      <AddMedicationDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          fetchMedications();
        }}
      />

      <DiscontinueDialog
        isOpen={Boolean(discontinueTarget)}
        onClose={() => setDiscontinueTarget(null)}
        medication={discontinueTarget}
        onSuccess={() => {
          if (discontinueTarget) {
            setMedications((prev) =>
              prev.map((m) =>
                m.id === discontinueTarget.id
                  ? { ...m, status: "DISCONTINUED" as const }
                  : m
              )
            );
          }
        }}
      />
    </div>
  );
}
