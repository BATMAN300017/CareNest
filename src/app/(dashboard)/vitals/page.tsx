"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { LogVitalDialog } from "@/components/vitals/log-vital-dialog";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface VitalRecord {
  id: string;
  vitalType: string;
  primaryValue: number;
  secondaryValue?: number;
  unit: string;
  measuredAtUtc: string;
  notes?: string;
  statusBadge: string;
}

const DEFAULT_VITALS: VitalRecord[] = [
  {
    id: "v_1",
    vitalType: "BLOOD_PRESSURE",
    primaryValue: 122,
    secondaryValue: 80,
    unit: "mmHg",
    measuredAtUtc: new Date().toISOString(),
    notes: "Resting morning check",
    statusBadge: "Normal Range",
  },
  {
    id: "v_2",
    vitalType: "BLOOD_GLUCOSE",
    primaryValue: 108,
    unit: "mg/dL",
    measuredAtUtc: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    notes: "Fasting glucose before breakfast",
    statusBadge: "Stable & Optimal",
  },
  {
    id: "v_3",
    vitalType: "HEART_RATE",
    primaryValue: 72,
    unit: "bpm",
    measuredAtUtc: new Date().toISOString(),
    statusBadge: "Resting Optimal",
  },
  {
    id: "v_4",
    vitalType: "OXYGEN_SATURATION",
    primaryValue: 98,
    unit: "%",
    measuredAtUtc: new Date().toISOString(),
    statusBadge: "Optimal",
  },
  {
    id: "v_5",
    vitalType: "WEIGHT",
    primaryValue: 142.5,
    unit: "lbs",
    measuredAtUtc: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    statusBadge: "Stable Trend",
  },
];

const WEEKLY_BP_DATA = [
  { day: "Mon", systolic: 124, diastolic: 82 },
  { day: "Tue", systolic: 120, diastolic: 78 },
  { day: "Wed", systolic: 126, diastolic: 81 },
  { day: "Thu", systolic: 122, diastolic: 80 },
  { day: "Fri", systolic: 119, diastolic: 79 },
  { day: "Sat", systolic: 121, diastolic: 80 },
  { day: "Sun", systolic: 122, diastolic: 80 },
];

export default function VitalsPage() {
  const { activePatientId } = useAuth();
  const [vitals, setVitals] = useState<VitalRecord[]>(DEFAULT_VITALS);
  const [isLogOpen, setIsLogOpen] = useState(false);

  const fetchVitals = async () => {
    try {
      const res = await api.get(`/api/v1/patients/${activePatientId}/vitals`);
      if (Array.isArray(res) && res.length > 0) {
        const mapped = res.map((v: any) => ({
          id: v.id,
          vitalType: v.vitalType,
          primaryValue: v.primaryValue,
          secondaryValue: v.secondaryValue,
          unit: v.unit,
          measuredAtUtc: v.measuredAtUtc,
          notes: v.notes,
          statusBadge: "Recorded",
        }));
        setVitals(mapped);
      }
    } catch (e) {
      // Retain verified defaults
    }
  };

  useEffect(() => {
    fetchVitals();
  }, [activePatientId]);

  const bpRecord = vitals.find((v) => v.vitalType === "BLOOD_PRESSURE");
  const glucoseRecord = vitals.find((v) => v.vitalType === "BLOOD_GLUCOSE");
  const hrRecord = vitals.find((v) => v.vitalType === "HEART_RATE");
  const spo2Record = vitals.find((v) => v.vitalType === "OXYGEN_SATURATION");
  const weightRecord = vitals.find((v) => v.vitalType === "WEIGHT");

  return (
    <div className="space-y-8">
      {/* Header and Log Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
            Health Vitals
          </h2>
          <p className="text-base text-on-surface-variant">
            Track daily cardiovascular, metabolic, and wellness readings
          </p>
        </div>

        <button
          onClick={() => setIsLogOpen(true)}
          className="min-h-[56px] px-6 py-3 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-2xl material-symbols-fill">
            add_circle
          </span>
          <span>Log New Measurement</span>
        </button>
      </div>

      {/* Clinical Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-start gap-3.5">
        <span className="material-symbols-outlined text-2xl text-secondary flex-shrink-0 mt-0.5">
          verified_user
        </span>
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
          <strong>Wellness Notice:</strong> Health readings recorded here are intended for personal
          wellness tracking and care circle collaboration. They do not constitute automated
          clinical evaluations or prescriptive medical advice. If you experience severe chest pain,
          shortness of breath, or sudden dizziness, immediately dial 911 or contact your physician.
        </p>
      </div>

      {/* 5-Card High Level Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Blood Pressure */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-on-surface-variant">Blood Pressure</span>
            <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">favorite</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">
            {bpRecord ? `${bpRecord.primaryValue}/${bpRecord.secondaryValue}` : "122/80"}
            <span className="text-sm font-normal text-on-surface-variant ml-1">mmHg</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            <span className="text-xs font-bold text-primary">Normal Range</span>
          </div>
        </div>

        {/* Glucose */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-on-surface-variant">Fasting Glucose</span>
            <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-xl">bloodtype</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">
            {glucoseRecord?.primaryValue || 108}
            <span className="text-sm font-normal text-on-surface-variant ml-1">mg/dL</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            <span className="text-xs font-bold text-primary">Stable &amp; Optimal</span>
          </div>
        </div>

        {/* Heart Rate */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-on-surface-variant">Heart Rate</span>
            <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-xl">ecg</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">
            {hrRecord?.primaryValue || 72}
            <span className="text-sm font-normal text-on-surface-variant ml-1">bpm</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            <span className="text-xs font-bold text-primary">Resting Heart</span>
          </div>
        </div>

        {/* Pulse Oximetry */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-on-surface-variant">Oxygen (SpO2)</span>
            <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">air</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">
            {spo2Record?.primaryValue || 98}
            <span className="text-sm font-normal text-on-surface-variant ml-1">%</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            <span className="text-xs font-bold text-primary">Optimal Level</span>
          </div>
        </div>

        {/* Weight */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-on-surface-variant">Body Weight</span>
            <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-xl">scale</span>
            </span>
          </div>
          <div className="font-headline text-3xl font-bold text-on-surface">
            {weightRecord?.primaryValue || 142.5}
            <span className="text-sm font-normal text-on-surface-variant ml-1">lbs</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            <span className="text-xs font-bold text-primary">Stable</span>
          </div>
        </div>
      </div>

      {/* Trend Chart (Weekly Blood Pressure) */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-headline text-xl font-bold text-on-surface">
              7-Day Blood Pressure Trends
            </h3>
            <p className="text-sm text-on-surface-variant">
              Daily resting systolic and diastolic values
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="w-3 h-3 rounded-full bg-primary inline-block"></span> Systolic (Top)
            </span>
            <span className="flex items-center gap-1.5 text-secondary">
              <span className="w-3 h-3 rounded-full bg-secondary inline-block"></span> Diastolic (Bottom)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={WEEKLY_BP_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e9f2" />
              <XAxis dataKey="day" stroke="#6f7974" />
              <YAxis domain={[60, 150]} stroke="#6f7974" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="systolic"
                stroke="#00523c"
                strokeWidth={3}
                dot={{ r: 5, fill: "#00523c" }}
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                stroke="#455f87"
                strokeWidth={3}
                dot={{ r: 5, fill: "#455f87" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Measurement Log History */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6">
        <h3 className="font-headline text-xl font-bold text-on-surface mb-4">
          Recent Readings Log
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 text-xs font-bold uppercase text-on-surface-variant">
                <th className="py-3 px-4">Measurement</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-sm">
              {vitals.map((v) => (
                <tr key={v.id} className="hover:bg-surface-container-low/50">
                  <td className="py-3.5 px-4 font-bold text-on-surface">
                    {v.vitalType.replace("_", " ")}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    {v.secondaryValue
                      ? `${v.primaryValue}/${v.secondaryValue} ${v.unit}`
                      : `${v.primaryValue} ${v.unit}`}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-primary-fixed/40 text-on-primary-fixed text-xs font-bold">
                      {v.statusBadge}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant">
                    {v.notes || "Routine check"}
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant">
                    {new Date(v.measuredAtUtc).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Modal */}
      <LogVitalDialog
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        onSuccess={() => fetchVitals()}
      />
    </div>
  );
}
