"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccessibility } from "@/context/accessibility-context";

interface SidebarProps {
  onOpenSos: () => void;
}

const navItems = [
  {
    name: "Today's Schedule",
    href: "/schedule",
    icon: "calendar_today",
  },
  {
    name: "My Medications",
    href: "/medications",
    icon: "medication",
  },
  {
    name: "Doctor Appointments",
    href: "/appointments",
    icon: "medical_services",
  },
  {
    name: "Care Circle & Messages",
    href: "/care-circle",
    icon: "group",
  },
  {
    name: "Health Vitals",
    href: "/vitals",
    icon: "favorite",
  },
  {
    name: "Support & Settings",
    href: "/support",
    icon: "help",
  },
];

export function Sidebar({ onOpenSos }: SidebarProps) {
  const pathname = usePathname();
  const { toggleHighContrast, highContrast } = useAccessibility();

  return (
    <aside
      aria-label="Main Navigation"
      className="hidden lg:flex fixed left-0 top-0 h-screen w-72 flex-col justify-between p-6 z-30 bg-surface-container-low shadow-sm border-r border-outline-variant/30"
    >
      {/* Brand & Platform Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3.5 px-2">
          <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-3xl material-symbols-fill">
              nest_eco_leaf
            </span>
          </div>
          <div>
            <span className="font-headline text-2xl text-primary font-bold block leading-tight">
              CareNest
            </span>
            <span className="text-sm text-on-surface-variant font-medium">
              Senior Care Platform
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 pt-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href === "/schedule" && pathname === "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-150 min-h-[56px] active:scale-[0.98] ${
                  isActive
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-medium"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-2xl ${
                    isActive ? "material-symbols-fill" : ""
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-base tracking-normal">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Bottom: Accessibility Settings & Urgent Call CTA */}
      <div className="flex flex-col gap-4 border-t border-outline-variant/30 pt-4">
        <button
          onClick={toggleHighContrast}
          className="flex items-center gap-4 px-5 py-3.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl font-medium transition-colors duration-200 min-h-[56px] active:scale-[0.98] w-full text-left"
          type="button"
          aria-pressed={highContrast}
        >
          <span className="material-symbols-outlined text-2xl">contrast</span>
          <span className="text-base">
            {highContrast ? "Normal Contrast" : "High Contrast"}
          </span>
        </button>

        {/* Urgent Help Call Button */}
        <button
          onClick={onOpenSos}
          className="w-full min-h-[56px] bg-error hover:bg-red-700 active:scale-[0.98] text-on-error rounded-xl font-bold px-4 py-3 flex items-center justify-center gap-3 shadow-md transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-2xl material-symbols-fill">
            emergency
          </span>
          <span className="text-base">Urgent Help Call</span>
        </button>
      </div>
    </aside>
  );
}
