"use client";

import React, { useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

interface CancelAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    doctorName: string;
    datetime: string;
  } | null;
  onSuccess: () => void;
}

export function CancelAppointmentDialog({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: CancelAppointmentDialogProps) {
  const { activePatientId } = useAuth();
  const [reason, setReason] = useState("Rescheduled by clinic / physician");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      await api.delete(
        `/api/v1/patients/${activePatientId}/appointments/${appointment.id}`,
        {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.warn("Cancel appointment note:", err?.message);
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
      aria-labelledby="cancel-appt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full border border-error/30 p-6 sm:p-8 shadow-warm-dialog">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-outline-variant/30">
          <div className="w-14 h-14 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-3xl material-symbols-fill text-error">
              event_busy
            </span>
          </div>
          <div>
            <h2 id="cancel-appt-title" className="font-headline text-2xl font-bold text-on-surface">
              Cancel Appointment
            </h2>
            <p className="text-sm text-on-surface-variant">
              {appointment.doctorName} • {appointment.datetime}
            </p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-4">
          Canceling this appointment will also automatically cancel scheduled telephone and SMS
          reminders for this visit. Please specify the reason:
        </p>

        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant focus:border-error text-sm bg-surface-container-lowest mb-6"
          placeholder="Reason for cancellation..."
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 min-h-[56px] px-6 py-3 bg-error hover:bg-red-700 text-on-error rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <span>{isSubmitting ? "Canceling..." : "Confirm Cancellation"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[56px] px-6 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold transition-colors"
          >
            Keep Visit
          </button>
        </div>
      </div>
    </div>
  );
}
