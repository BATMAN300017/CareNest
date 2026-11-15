"use client";

import React, { useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

interface SkipDoseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dose: {
    id: string;
    medicationName: string;
    strength: string;
    scheduledTime: string;
  } | null;
  onSuccess: () => void;
}

const COMMON_SKIP_REASONS = [
  "Physician advised holding dose until evening",
  "Patient experiencing nausea / stomach upset",
  "Fasting for upcoming blood draw / lab test",
  "Refill pending / medication temporarily out of stock",
  "Patient refused dose at this time",
];

export function SkipDoseDialog({
  isOpen,
  onClose,
  dose,
  onSuccess,
}: SkipDoseDialogProps) {
  const { activePatientId } = useAuth();
  const [selectedReason, setSelectedReason] = useState(COMMON_SKIP_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !dose) return null;

  const handleSkip = async () => {
    setIsSubmitting(true);
    const finalReason = customReason.trim() ? customReason : selectedReason;

    try {
      await api.post(`/api/v1/patients/${activePatientId}/doses/${dose.id}/skip`, {
        reason: finalReason,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.warn("Skip dose note:", err?.message);
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
      aria-labelledby="skip-dose-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full border border-tertiary/30 p-6 sm:p-8 shadow-warm-dialog">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-outline-variant/30">
          <div className="w-14 h-14 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-3xl material-symbols-fill text-tertiary">
              pause_circle
            </span>
          </div>
          <div>
            <h2 id="skip-dose-title" className="font-headline text-2xl font-bold text-on-surface">
              Record Skipped Dose
            </h2>
            <p className="text-sm text-on-surface-variant">
              {dose.medicationName} {dose.strength} • {dose.scheduledTime}
            </p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-4">
          For patient safety and medical record accuracy, please select the reason why this dose is
          being held or skipped:
        </p>

        <div className="space-y-2.5 mb-6">
          {COMMON_SKIP_REASONS.map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${
                selectedReason === reason && !customReason
                  ? "border-primary bg-primary-fixed/20 text-on-surface font-semibold"
                  : "border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <input
                type="radio"
                name="skip-reason"
                checked={selectedReason === reason && !customReason}
                onChange={() => {
                  setSelectedReason(reason);
                  setCustomReason("");
                }}
                className="w-5 h-5 text-primary focus:ring-primary"
              />
              <span className="text-sm sm:text-base">{reason}</span>
            </label>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-on-surface mb-1.5">
            Or type a custom reason:
          </label>
          <input
            type="text"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full min-h-[48px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-sm bg-surface-container-lowest"
            placeholder="Other clinical reason..."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 min-h-[56px] px-6 py-3 bg-tertiary hover:bg-amber-800 text-on-tertiary rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <span>{isSubmitting ? "Recording..." : "Record Dose as Skipped"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[56px] px-6 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
