"use client";

import React from "react";
import { useLanguage } from "@/context/language-context";
import Link from "next/link";

const MOCK_AUDIT_LOGS = [
  {
    id: "aud_1",
    action: "MEDICATION_CONFIRMED",
    actor: "Margaret Jenkins (Self-reported)",
    role: "PATIENT",
    resource: "DoseOccurrence: Lisinopril 10mg",
    ip: "192.168.1.45",
    time: "8:12 AM Today",
    status: "SUCCESS",
  },
  {
    id: "aud_2",
    action: "VITAL_RECORDED",
    actor: "Margaret Jenkins (Kiosk)",
    role: "PATIENT",
    resource: "HealthVital: Fasting Glucose 108 mg/dL",
    ip: "192.168.1.45",
    time: "7:45 AM Today",
    status: "SUCCESS",
  },
  {
    id: "aud_3",
    action: "CONSENT_VERIFIED",
    actor: "Dr. Robert Chen",
    role: "DOCTOR",
    resource: "Patient: Margaret Jenkins",
    ip: "10.0.4.12",
    time: "Yesterday 4:30 PM",
    status: "SUCCESS",
  },
  {
    id: "aud_4",
    action: "CARE_CIRCLE_INVITE_ACCEPTED",
    actor: "Elena Rostova (Visiting Nurse)",
    role: "NURSE",
    resource: "CareCircleMembership: Margaret Jenkins",
    ip: "172.16.8.90",
    time: "Oct 28 10:00 AM",
    status: "SUCCESS",
  },
];

const MOCK_PLATFORM_USERS = [
  {
    id: "usr_1",
    name: "Margaret Jenkins",
    email: "margaret.jenkins@example.com",
    role: "PATIENT",
    phone: "+15552345678",
    status: "ACTIVE",
    lang: "en",
  },
  {
    id: "usr_2",
    name: "Robert Jenkins",
    email: "robert.jenkins@example.com",
    role: "PATIENT",
    phone: "+15553456789",
    status: "ACTIVE",
    lang: "hi",
  },
  {
    id: "usr_3",
    name: "Sarah Jenkins",
    email: "sarah.jenkins@example.com",
    role: "FAMILY_ADMIN",
    phone: "+15559876543",
    status: "ACTIVE",
    lang: "en",
  },
  {
    id: "usr_4",
    name: "Dr. Robert Chen",
    email: "dr.chen@metroheart.com",
    role: "HEALTHCARE_PROFESSIONAL",
    phone: "+15554321098",
    status: "VERIFIED",
    lang: "en",
  },
];

export default function AdminDashboardPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Admin Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 warm-card-shadow">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-inverse-surface text-inverse-on-surface text-xs font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            <span>{t("roles.adminView")}</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
            {t("admin.overviewTitle")}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {t("admin.overviewSub")}
          </p>
        </div>

        <Link
          href="/schedule"
          className="min-h-[48px] px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm flex items-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
        >
          <span className="material-symbols-outlined text-xl">elderly</span>
          <span>Switch to Patient Dashboard</span>
        </Link>
      </div>

      {/* Infrastructure Observability Grid */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow space-y-4">
        <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-primary">lan</span>
          <span>Infrastructure &amp; Service Health</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span>Database Engine</span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
            </div>
            <p className="font-headline text-base font-bold text-on-surface mt-2">
              PostgreSQL 16
            </p>
            <p className="text-xs text-primary font-bold mt-1">
              Active • 12ms latency • Pool: 10
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span>Job Queues</span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            </div>
            <p className="font-headline text-base font-bold text-on-surface mt-2">
              BullMQ + Redis
            </p>
            <p className="text-xs text-primary font-bold mt-1">
              0 Failed • 1,420 Completed
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span>Telephony IVR</span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            </div>
            <p className="font-headline text-base font-bold text-on-surface mt-2">
              Twilio Voice/SMS
            </p>
            <p className="text-xs text-primary font-bold mt-1">
              Webhook Verified • E.164 Clean
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span>Voice AI &amp; i18n</span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
            </div>
            <p className="font-headline text-base font-bold text-on-surface mt-2">
              Gemini + Devanagari
            </p>
            <p className="text-xs text-primary font-bold mt-1">
              Hindi &amp; English Bilingual Active
            </p>
          </div>
        </div>
      </div>

      {/* Platform User Accounts Directory */}
      <div id="users" className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow space-y-4">
        <h3 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-secondary">people</span>
          <span>{t("admin.userAccounts")}</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant uppercase tracking-wider font-bold">
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Language</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {MOCK_PLATFORM_USERS.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-3 px-3 font-bold text-on-surface">{u.name}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{u.email}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface font-semibold">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold uppercase">{u.lang}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-bold">
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Audit Trail */}
      <div id="audit" className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 warm-card-shadow space-y-4">
        <h3 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-primary">security</span>
          <span>{t("admin.auditLog")}</span>
        </h3>

        <div className="space-y-3">
          {MOCK_AUDIT_LOGS.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-bold text-primary mr-2">[{log.action}]</span>
                <span className="text-on-surface font-semibold mr-2">{log.actor}</span>
                <span className="text-on-surface-variant mr-2">({log.role})</span>
                <span className="text-secondary font-medium">• {log.resource}</span>
              </div>
              <div className="flex items-center gap-3 text-on-surface-variant">
                <span>IP: {log.ip}</span>
                <span>• {log.time}</span>
                <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-bold text-[10px]">
                  {log.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
