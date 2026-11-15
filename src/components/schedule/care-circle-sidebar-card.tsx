"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";

interface Member {
  id: string;
  name: string;
  relation: string;
  role: string;
  status: string;
  lastActive: string;
  phone: string;
  isPrimary?: boolean;
}

const mockCaregivers: Member[] = [
  {
    id: "mem_sarah",
    name: "Sarah Jenkins",
    relation: "Daughter",
    role: "Primary Caregiver",
    status: "Active now",
    lastActive: "Active 3m ago",
    phone: "+15559876543",
    isPrimary: true,
  },
  {
    id: "mem_elena",
    name: "Nurse Elena Vance",
    relation: "Home Health Aide",
    role: "Visiting Nurse",
    status: "Active now",
    lastActive: "Checked in 25m ago",
    phone: "+15558881234",
  },
  {
    id: "mem_michael",
    name: "Michael Jenkins",
    relation: "Son (Chicago)",
    role: "Family Circle",
    status: "Offline",
    lastActive: "Viewed 2h ago",
    phone: "+15554447890",
  },
];

export function CareCircleSidebarCard() {
  const { t } = useLanguage();

  return (
    <div
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6"
      id="carecircle"
    >
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-primary material-symbols-fill">
            diversity_1
          </span>
          <h3 className="font-headline text-xl font-bold text-on-surface">
            {t("careCircle.title")}
          </h3>
        </div>
        <span className="text-xs sm:text-sm text-primary font-bold flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span> 3 Active
        </span>
      </div>

      {/* Caregivers List */}
      <div className="space-y-3.5">
        {mockCaregivers.map((member) => (
          <div
            key={member.id}
            className={`p-4 rounded-xl border transition-all ${
              member.isPrimary
                ? "bg-surface-container-low border-primary/30"
                : "bg-surface-container-lowest border-outline-variant/30"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary font-bold flex items-center justify-center text-lg shadow-inner">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  {member.status === "Active now" && (
                    <span
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-primary border-2 border-surface-container-lowest"
                      title="Active now"
                    ></span>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-base text-on-surface leading-tight">
                    {member.name}
                  </h4>
                  <p className="text-xs text-on-surface-variant font-medium">
                    {member.relation} • {member.role}
                  </p>
                  <p className="text-[11px] text-primary font-semibold mt-0.5">
                    {member.lastActive}
                  </p>
                </div>
              </div>

              {/* Quick Dial Button */}
              <a
                href={`tel:${member.phone}`}
                className="w-10 h-10 rounded-xl bg-surface-container hover:bg-primary hover:text-on-primary text-primary flex items-center justify-center transition-colors shadow-sm flex-shrink-0"
                title={`Call ${member.name}`}
                aria-label={`Call ${member.name}`}
              >
                <span className="material-symbols-outlined text-xl">call</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-outline-variant/20">
        <Link
          href="/care-circle"
          className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <span>View All Care Circle Members &amp; Notes</span>
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
