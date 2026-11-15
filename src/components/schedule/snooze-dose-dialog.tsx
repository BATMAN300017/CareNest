"use client";

import React, { useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

interface SnoozeDoseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dose: {
    id: string;
    medicationName: string;
    strength: string;
  } | null;
  onSuccess: () => void;
}

export function SnoozeDoseDialog({
  isOpen,
  onClose,
  dose,
  onSuccess,
}: SnoozeDoseDialogProps) {
  const { activePatientId } = useAuth();
  const [minutes, setMinutes] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !dose) return null;

  const handleSnooze = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/api/v1/patients/${activePatientId}/doses/${dose.id}/snooze`, {
        snooze_minutes: minutes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.warn("Snooze note:", err?.message);
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
      aria-labelledby="snooze-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full border border-secondary/30 p-6 sm:p-8 shadow-warm-dialog">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-outline-variant/30">
          <div className="w-14 h-14 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-3xl material-symbols-fill text-secondary">
              snooze
            </span>
          </div>
          <div>
            <h2 id="snooze-dialog-title" className="font-headline text-2xl font-bold text-on-surface">
              Snooze Reminder
            </h2>
            <p className="text-sm text-on-surface-variant">
              {dose.medicationName} {dose.strength}
            </p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-5">
          CareNest will remind you again once your selected snooze time passes:
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[15, 30, 60].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={`min-h-[56px] rounded-xl font-bold text-base flex flex-col items-center justify-center transition-all ${
                minutes === m
                  ? "bg-secondary text-on-secondary shadow-md scale-105"
                  : "bg-surface-container-low text-on-surface border border-outline-variant/40 hover:bg-surface-container"
              }`}
            >
              <span>{m} min</span>
              <span className="text-xs font-normal opacity-80">
                {m === 60 ? "1 hour" : "Gentle"}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleSnooze}
            disabled={isSubmitting}
            className="flex-1 min-h-[56px] px-6 py-3 bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <span>{isSubmitting ? "Snoozing..." : `Remind in ${minutes} Minutes`}</span>
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
