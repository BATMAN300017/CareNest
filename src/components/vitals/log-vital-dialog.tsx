"use client";

import React, { useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

interface LogVitalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogVitalDialog({
  isOpen,
  onClose,
  onSuccess,
}: LogVitalDialogProps) {
  const { activePatientId } = useAuth();
  const [vitalType, setVitalType] = useState("BLOOD_PRESSURE");
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [glucose, setGlucose] = useState("105");
  const [heartRate, setHeartRate] = useState("72");
  const [spo2, setSpo2] = useState("98");
  const [weight, setWeight] = useState("142");
  const [context, setContext] = useState("Resting morning reading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    let payload: any = {
      vitalType,
      measuredAtUtc: new Date().toISOString(),
      notes: context || undefined,
    };

    if (vitalType === "BLOOD_PRESSURE") {
      payload.primaryValue = Number(systolic);
      payload.secondaryValue = Number(diastolic);
      payload.unit = "mmHg";
    } else if (vitalType === "BLOOD_GLUCOSE") {
      payload.primaryValue = Number(glucose);
      payload.unit = "mg/dL";
      payload.mealContext = "FASTING";
    } else if (vitalType === "HEART_RATE") {
      payload.primaryValue = Number(heartRate);
      payload.unit = "bpm";
    } else if (vitalType === "OXYGEN_SATURATION") {
      payload.primaryValue = Number(spo2);
      payload.unit = "%";
    } else if (vitalType === "WEIGHT") {
      payload.primaryValue = Number(weight);
      payload.unit = "lbs";
    }

    try {
      await api.post(`/api/v1/patients/${activePatientId}/vitals`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.warn("Log vital note:", err?.message);
      onSuccess();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-vital-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full border border-primary/20 p-6 sm:p-8 shadow-warm-dialog">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-outline-variant/30">
          <div className="w-14 h-14 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-3xl material-symbols-fill text-primary">
              monitor_heart
            </span>
          </div>
          <div>
            <h2 id="log-vital-title" className="font-headline text-2xl font-bold text-on-surface">
              Log Health Measurement
            </h2>
            <p className="text-sm text-on-surface-variant">
              Record vitals for caregiver and physician review
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-sm font-semibold mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              Measurement Type
            </label>
            <select
              value={vitalType}
              onChange={(e) => setVitalType(e.target.value)}
              className="w-full min-h-[50px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-lowest"
            >
              <option value="BLOOD_PRESSURE">Blood Pressure (mmHg)</option>
              <option value="BLOOD_GLUCOSE">Blood Glucose (mg/dL)</option>
              <option value="HEART_RATE">Heart Rate (bpm)</option>
              <option value="OXYGEN_SATURATION">Pulse Oximetry (SpO2 %)</option>
              <option value="WEIGHT">Weight (lbs)</option>
            </select>
          </div>

          {vitalType === "BLOOD_PRESSURE" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">
                  Systolic (Top)
                </label>
                <input
                  type="number"
                  required
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="120"
                  className="w-full min-h-[50px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-lowest"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">
                  Diastolic (Bottom)
                </label>
                <input
                  type="number"
                  required
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="80"
                  className="w-full min-h-[50px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-lowest"
                />
              </div>
            </div>
          )}

          {vitalType === "BLOOD_GLUCOSE" && (
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                Glucose Level (mg/dL)
              </label>
              <input
                type="number"
                required
                value={glucose}
                onChange={(e) => setGlucose(e.target.value)}
                placeholder="100"
                className="w-full min-h-[50px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-lowest"
              />
            </div>
          )}

          {vitalType === "HEART_RATE" && (
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                Heart Rate (beats per minute)
              </label>
              <input
                type="number"
                required
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="72"
                className="w-full min-h-[50px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-lowest"
              />
            </div>
          )}

          {vitalType === "OXYGEN_SATURATION" && (
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                SpO2 Saturation Percentage (%)
              </label>
              <input
                type="number"
                required
                min={70}
                max={100}
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                placeholder="98"
                className="w-full min-h-[50px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-lowest"
              />
            </div>
          )}

          {vitalType === "WEIGHT" && (
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                Weight in Pounds (lbs)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="142.5"
                className="w-full min-h-[50px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-lowest"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              Context &amp; Notes
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Resting morning reading before breakfast"
              className="w-full min-h-[50px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-lowest"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-outline-variant/30">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[56px] px-6 py-3 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-2xl">check</span>
              <span>{isSubmitting ? "Saving..." : "Save Reading"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[56px] px-6 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
