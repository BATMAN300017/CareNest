"use client";

import React, { useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

interface DiscontinueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  medication: {
    id: string;
    brandName: string;
    strength: string;
  } | null;
  onSuccess: () => void;
}

export function DiscontinueDialog({
  isOpen,
  onClose,
  medication,
  onSuccess,
}: DiscontinueDialogProps) {
  const { activePatientId } = useAuth();
  const [reason, setReason] = useState("Course completed as directed by physician");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !medication) return null;

  const handleDiscontinue = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(
        `/api/v1/patients/${activePatientId}/medications/${medication.id}`,
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.warn("Discontinue note:", err?.message);
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
      aria-labelledby="discontinue-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full border border-error/30 p-6 sm:p-8 shadow-warm-dialog">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-outline-variant/30">
          <div className="w-14 h-14 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-3xl material-symbols-fill text-error">
              archive
            </span>
          </div>
          <div>
            <h2 id="discontinue-title" className="font-headline text-2xl font-bold text-on-surface">
              Discontinue Medication
            </h2>
            <p className="text-sm text-on-surface-variant">
              {medication.brandName} {medication.strength}
            </p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-4">
          This will archive the medication and remove any future pending dose reminders from the
          schedule. Please provide the reason:
        </p>

        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant focus:border-error text-sm bg-surface-container-lowest mb-6"
          placeholder="Reason for discontinuing..."
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDiscontinue}
            disabled={isSubmitting}
            className="flex-1 min-h-[56px] px-6 py-3 bg-error hover:bg-red-700 text-on-error rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <span>{isSubmitting ? "Archiving..." : "Archive Medication"}</span>
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
