"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { InviteMemberDialog } from "@/components/care-circle/invite-member-dialog";

interface CareCircleMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  relationship: string;
  circleRole: "FAMILY_ADMIN" | "PRIMARY_CAREGIVER" | "CAREGIVER" | "MEMBER";
  canManageMedications: boolean;
  canManageAppointments: boolean;
  canViewVitals: boolean;
  receiveEmergencyAlerts: boolean;
  lastActive?: string;
  avatarInitials: string;
}

interface CareNote {
  id: string;
  authorName: string;
  authorRole: string;
  timestamp: string;
  content: string;
}

const DEFAULT_MEMBERS: CareCircleMember[] = [
  {
    id: "mem_sarah",
    fullName: "Sarah Jenkins",
    email: "sarah.jenkins@example.com",
    phone: "+15559876543",
    relationship: "Daughter",
    circleRole: "PRIMARY_CAREGIVER",
    canManageMedications: true,
    canManageAppointments: true,
    canViewVitals: true,
    receiveEmergencyAlerts: true,
    lastActive: "Active 3 minutes ago",
    avatarInitials: "SJ",
  },
  {
    id: "mem_elena",
    fullName: "Elena Vance, RN",
    email: "elena.vance@baycare.org",
    phone: "+15558881234",
    relationship: "Home Health Aide",
    circleRole: "CAREGIVER",
    canManageMedications: true,
    canManageAppointments: true,
    canViewVitals: true,
    receiveEmergencyAlerts: true,
    lastActive: "Checked in 25m ago",
    avatarInitials: "EV",
  },
  {
    id: "mem_michael",
    fullName: "Michael Jenkins",
    email: "michael.jenkins@example.com",
    phone: "+15554447890",
    relationship: "Son (Chicago)",
    circleRole: "MEMBER",
    canManageMedications: false,
    canManageAppointments: false,
    canViewVitals: true,
    receiveEmergencyAlerts: false,
    lastActive: "Viewed 2 hours ago",
    avatarInitials: "MJ",
  },
  {
    id: "mem_doc_chen",
    fullName: "Dr. Robert Chen",
    email: "dr.chen@metroheart.com",
    phone: "+15554321098",
    relationship: "Cardiologist",
    circleRole: "MEMBER",
    canManageMedications: true,
    canManageAppointments: true,
    canViewVitals: true,
    receiveEmergencyAlerts: false,
    avatarInitials: "RC",
  },
];

const DEFAULT_NOTES: CareNote[] = [
  {
    id: "note_1",
    authorName: "Sarah Jenkins",
    authorRole: "Daughter (Primary)",
    timestamp: "Today at 9:30 AM",
    content:
      "Mom had a wonderful morning. Lisinopril and Vitamin D taken with toast. Blood pressure was steady at 122/80.",
  },
  {
    id: "note_2",
    authorName: "Elena Vance, RN",
    authorRole: "Visiting Nurse",
    timestamp: "Yesterday at 3:15 PM",
    content:
      "Checked vitals. Hydration looks good (4+ glasses). Reminded Margaret about fasting before tomorrow's cardiology visit.",
  },
];

export default function CareCirclePage() {
  const { activePatientId } = useAuth();
  const [members, setMembers] = useState<CareCircleMember[]>(DEFAULT_MEMBERS);
  const [notes, setNotes] = useState<CareNote[]>(DEFAULT_NOTES);
  const [newNoteText, setNewNoteText] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const fetchCareCircle = useCallback(async () => {
    try {
      const res = await api.get(`/api/v1/patients/${activePatientId}/care-circle`);
      if (Array.isArray(res) && res.length > 0) {
        const mapped = res.map((m: any) => ({
          id: m.id,
          fullName: m.user?.fullName || m.fullName || "Caregiver",
          email: m.user?.email || m.email || "",
          phone: m.user?.primaryPhone || m.phone,
          relationship: m.relationship || "Family",
          circleRole: m.circleRole || "CAREGIVER",
          canManageMedications: m.canManageMedications,
          canManageAppointments: m.canManageAppointments,
          canViewVitals: m.canViewVitals,
          receiveEmergencyAlerts: m.receiveEmergencyAlerts,
          lastActive: "Connected",
          avatarInitials: (m.user?.fullName || m.fullName || "C")
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2),
        }));
        setMembers(mapped);
      }
    } catch (e) {
      // Retain verified defaults
    }
  }, [activePatientId]);

  useEffect(() => {
    fetchCareCircle();
  }, [fetchCareCircle]);

  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: CareNote = {
      id: `note_${Date.now()}`,
      authorName: "Margaret Jenkins",
      authorRole: "Patient Note",
      timestamp: "Just now",
      content: newNoteText.trim(),
    };

    setNotes([newNote, ...notes]);
    setNewNoteText("");
  };

  return (
    <div className="space-y-8">
      {/* Header and Invite Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
            Care Circle &amp; Messages
          </h2>
          <p className="text-base text-on-surface-variant">
            Family members, professional caretakers, and shared medical notes
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="min-h-[56px] px-6 py-3 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-2xl material-symbols-fill">
            person_add
          </span>
          <span>Invite New Member</span>
        </button>
      </div>

      {/* Grid: Left Column Members (7 cols), Right Column Notes Feed (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Members Column */}
        <section className="lg:col-span-7 space-y-4">
          <h3 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-primary">diversity_1</span>
            <span>Active Care Circle Members ({members.length})</span>
          </h3>

          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary-fixed text-primary font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-inner">
                    {member.avatarInitials}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-headline text-lg font-bold text-on-surface">
                        {member.fullName}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-secondary text-xs font-bold uppercase">
                        {member.circleRole.replace("_", " ")}
                      </span>
                    </div>

                    <p className="text-sm text-on-surface-variant font-medium mt-0.5">
                      {member.relationship} • {member.email}
                    </p>

                    {/* Permissions Badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {member.canManageMedications && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-primary-fixed/30 text-on-primary-fixed text-xs font-semibold">
                          ✓ Meds
                        </span>
                      )}
                      {member.canManageAppointments && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-secondary-fixed/40 text-on-secondary-fixed text-xs font-semibold">
                          ✓ Visits
                        </span>
                      )}
                      {member.receiveEmergencyAlerts && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold">
                          ⚠️ Emergency Alerts
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Call & SMS Actions */}
                {member.phone && (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={`tel:${member.phone}`}
                      className="min-h-[44px] px-3.5 rounded-xl bg-surface-container hover:bg-primary hover:text-on-primary text-primary font-bold text-sm flex items-center gap-1.5 transition-colors shadow-sm"
                      title={`Call ${member.fullName}`}
                    >
                      <span className="material-symbols-outlined text-lg">call</span>
                      <span>Call</span>
                    </a>
                    <a
                      href={`sms:${member.phone}`}
                      className="min-h-[44px] px-3.5 rounded-xl bg-surface-container hover:bg-secondary hover:text-on-secondary text-secondary font-bold text-sm flex items-center gap-1.5 transition-colors shadow-sm"
                      title={`Send SMS to ${member.fullName}`}
                    >
                      <span className="material-symbols-outlined text-lg">sms</span>
                      <span>SMS</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Shared Care Notes Feed */}
        <section className="lg:col-span-5 space-y-4">
          <h3 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-secondary">forum</span>
            <span>Shared Care Feed</span>
          </h3>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 space-y-5">
            {/* Post Note Form */}
            <form onSubmit={handlePostNote} className="space-y-3">
              <label className="block text-sm font-bold text-on-surface">
                Post an Update for the Care Team:
              </label>
              <textarea
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Share how Margaret is feeling, appetite notes, or reminders..."
                className="w-full px-4 py-3 rounded-xl border-2 border-outline-variant focus:border-primary text-sm bg-surface-container-low"
              />
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className="w-full min-h-[48px] py-2.5 px-4 bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                <span>Post Note</span>
              </button>
            </form>

            <div className="border-t border-outline-variant/30 pt-4 space-y-4 max-h-[500px] overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-xl bg-surface-container-low/70 border border-outline-variant/30 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface">{note.authorName}</span>
                    <span className="text-on-surface-variant">{note.timestamp}</span>
                  </div>
                  <span className="inline-block px-2 py-0.5 rounded bg-surface-container text-[11px] font-semibold text-secondary">
                    {note.authorRole}
                  </span>
                  <p className="text-sm text-on-surface pt-1 leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Invite Modal */}
      <InviteMemberDialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={() => fetchCareCircle()}
      />
    </div>
  );
}
