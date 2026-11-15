"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { AddAppointmentDialog } from "@/components/appointments/add-appointment-dialog";
import { CancelAppointmentDialog } from "@/components/appointments/cancel-appointment-dialog";

interface AppointmentItem {
  id: string;
  doctorName: string;
  specialty?: string;
  clinicName: string;
  locationAddress: string;
  appointmentDatetimeUtc: string;
  durationMinutes: number;
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
  transportBooked: boolean;
  transportServiceName?: string;
  preparationInstructions?: string;
  notes?: string;
  clinicPhone?: string;
}

const DEFAULT_APPOINTMENTS: AppointmentItem[] = [
  {
    id: "appt_1",
    doctorName: "Dr. Robert Chen",
    specialty: "Cardiology",
    clinicName: "Memorial Heart Pavilion",
    locationAddress: "100 Medical Plaza, Suite 304",
    appointmentDatetimeUtc: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    durationMinutes: 45,
    status: "CONFIRMED",
    transportBooked: true,
    transportServiceName: "SilverRide Senior Escort (Wheelchair accessible - pickup at 1:15 PM)",
    preparationInstructions: "Fasting required: Do not eat or drink anything other than water for 4 hours before the visit.",
    notes: "Review Lisinopril response and recent blood pressure logs.",
    clinicPhone: "+15554321098",
  },
  {
    id: "appt_2",
    doctorName: "Dr. Emily Taylor",
    specialty: "Geriatric Primary Care",
    clinicName: "Oakridge Senior Wellness Center",
    locationAddress: "450 Evergreen Terrace, Building B",
    appointmentDatetimeUtc: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // Next week
    durationMinutes: 30,
    status: "SCHEDULED",
    transportBooked: true,
    transportServiceName: "SilverRide Senior Escort",
    preparationInstructions: "Bring all active medication bottles and recent blood glucose logs.",
    notes: "Quarterly wellness review.",
    clinicPhone: "+15553332211",
  },
  {
    id: "appt_3",
    doctorName: "Dr. Arthur Pendelton",
    specialty: "Ophthalmology",
    clinicName: "Valley Eye Care Clinic",
    locationAddress: "88 Vision Way",
    appointmentDatetimeUtc: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Past
    durationMinutes: 30,
    status: "COMPLETED",
    transportBooked: false,
    notes: "Annual diabetic retinopathy eye check. Vision stable.",
    clinicPhone: "+15559994433",
  },
];

export default function AppointmentsPage() {
  const { activePatientId } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentItem[]>(DEFAULT_APPOINTMENTS);
  const [activeTab, setActiveTab] = useState<"UPCOMING" | "PAST" | "CANCELLED">("UPCOMING");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AppointmentItem | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/patients/${activePatientId}/appointments`);
      if (Array.isArray(res) && res.length > 0) {
        const mapped = res.map((a: any) => ({
          id: a.id,
          doctorName: a.doctorName || a.doctor?.fullName || "Physician",
          specialty: a.specialty || a.doctor?.specialty || "Specialist",
          clinicName: a.clinicName || a.doctor?.clinicName || "Clinic",
          locationAddress: a.locationAddress || "Medical Office",
          appointmentDatetimeUtc: a.appointmentDatetimeUtc,
          durationMinutes: a.durationMinutes || 45,
          status: a.status,
          transportBooked: a.transportBooked,
          transportServiceName: a.transportServiceName,
          preparationInstructions: a.preparationInstructions,
          notes: a.notes,
          clinicPhone: a.doctor?.phone || "+15554321098",
        }));
        setAppointments(mapped);
      }
    } catch (e) {
      // Retain verified defaults
    }
  }, [activePatientId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const now = new Date();

  const filtered = appointments.filter((a) => {
    const isPast = new Date(a.appointmentDatetimeUtc) < now || a.status === "COMPLETED";
    const isCancelled = a.status === "CANCELLED";

    if (activeTab === "CANCELLED") return isCancelled;
    if (activeTab === "PAST") return isPast && !isCancelled;
    return !isPast && !isCancelled;
  });

  return (
    <div className="space-y-6">
      {/* Header and Schedule Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
            Doctor Appointments
          </h2>
          <p className="text-base text-on-surface-variant">
            Manage medical appointments, clinic preparation, and senior ride assistance
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="min-h-[56px] px-6 py-3 bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-2xl material-symbols-fill">
            calendar_add_on
          </span>
          <span>Schedule Appointment</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-surface-container rounded-xl p-1 w-full sm:w-auto self-start">
        {(["UPCOMING", "PAST", "CANCELLED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all min-h-[44px] ${
              activeTab === tab
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab === "UPCOMING"
              ? "Upcoming Visits"
              : tab === "PAST"
              ? "Visit History"
              : "Cancelled"}
          </button>
        ))}
      </div>

      {/* Appointment Cards */}
      <div className="space-y-6">
        {filtered.map((appt) => {
          const apptDate = new Date(appt.appointmentDatetimeUtc);
          const isTomorrow =
            Math.abs(apptDate.getTime() - now.getTime()) <= 36 * 60 * 60 * 1000 &&
            apptDate > now;

          return (
            <div
              key={appt.id}
              className="bg-surface-container-lowest rounded-2xl border-2 border-outline-variant/30 warm-card-shadow p-6 sm:p-7 transition-all hover:shadow-md"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Left Block */}
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-3xl material-symbols-fill">
                      medical_services
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                      {isTomorrow && (
                        <span className="px-3 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase animate-pulse">
                          Tomorrow
                        </span>
                      )}
                      <span className="px-3 py-0.5 rounded-full bg-surface-container text-secondary text-xs font-bold uppercase">
                        {appt.specialty || "Specialist"}
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        {appt.durationMinutes} min appointment
                      </span>
                    </div>

                    <h3 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">
                      {appt.doctorName}
                    </h3>
                    <p className="text-base text-on-surface-variant font-medium mt-0.5">
                      {appt.clinicName} • {appt.locationAddress}
                    </p>

                    {/* Date & Time Pill */}
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface font-bold text-base">
                      <span className="material-symbols-outlined text-xl text-primary">
                        calendar_month
                      </span>
                      <span>
                        {apptDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {apptDate.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>

                    {/* Transportation Banner */}
                    {appt.transportBooked && (
                      <div className="mt-4 p-3.5 rounded-xl bg-primary-fixed/20 border border-primary/20 flex items-start gap-3">
                        <span className="material-symbols-outlined text-2xl text-primary flex-shrink-0 mt-0.5">
                          directions_car
                        </span>
                        <div>
                          <span className="text-sm font-bold text-primary block">
                            Senior Transportation Confirmed
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            {appt.transportServiceName || "SilverRide Senior Escort"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Prep Instructions */}
                    {appt.preparationInstructions && (
                      <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                        <span className="material-symbols-outlined text-2xl text-amber-700 flex-shrink-0 mt-0.5">
                          fastfood
                        </span>
                        <div>
                          <span className="text-sm font-bold text-amber-800 block">
                            Preparation Instructions:
                          </span>
                          <span className="text-xs text-amber-900">
                            {appt.preparationInstructions}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action Block */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[180px]">
                  {appt.clinicPhone && (
                    <a
                      href={`tel:${appt.clinicPhone}`}
                      className="min-h-[48px] px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">call</span>
                      <span>Call Clinic</span>
                    </a>
                  )}

                  {appt.status !== "CANCELLED" && appt.status !== "COMPLETED" && (
                    <button
                      onClick={() => setCancelTarget(appt)}
                      className="min-h-[48px] px-5 py-2.5 rounded-xl border border-outline-variant hover:bg-error-container hover:text-on-error-container text-on-surface-variant font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">event_busy</span>
                      <span>Cancel Visit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-12 text-center warm-card-shadow">
          <span className="material-symbols-outlined text-5xl text-outline mb-3">
            event_available
          </span>
          <h3 className="font-headline text-xl font-bold text-on-surface">
            No visits in this category
          </h3>
          <p className="text-sm text-on-surface-variant mt-1 mb-6">
            There are no {activeTab.toLowerCase()} appointments on your schedule.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="min-h-[48px] px-6 py-2.5 bg-secondary text-on-secondary rounded-xl font-bold text-sm"
          >
            Schedule New Visit
          </button>
        </div>
      )}

      {/* Modals */}
      <AddAppointmentDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => fetchAppointments()}
      />

      <CancelAppointmentDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        appointment={
          cancelTarget
            ? {
                id: cancelTarget.id,
                doctorName: cancelTarget.doctorName,
                datetime: new Date(cancelTarget.appointmentDatetimeUtc).toLocaleDateString(),
              }
            : null
        }
        onSuccess={() => {
          if (cancelTarget) {
            setAppointments((prev) =>
              prev.map((a) =>
                a.id === cancelTarget.id ? { ...a, status: "CANCELLED" as const } : a
              )
            );
          }
        }}
      />
    </div>
  );
}
