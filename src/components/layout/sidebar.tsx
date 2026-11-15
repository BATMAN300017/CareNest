"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccessibility } from "@/context/accessibility-context";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

interface SidebarProps {
  onOpenSos: () => void;
}

export function Sidebar({ onOpenSos }: SidebarProps) {
  const pathname = usePathname();
  const { toggleHighContrast, highContrast } = useAccessibility();
  const { currentRole, activePatient } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const baseNavItems = [
    {
      name: t("nav.schedule"),
      href: "/schedule",
      icon: "calendar_today",
    },
    {
      name: t("nav.medications"),
      href: "/medications",
      icon: "medication",
    },
    {
      name: t("nav.appointments"),
      href: "/appointments",
      icon: "medical_services",
    },
    {
      name: t("nav.careCircle"),
      href: "/care-circle",
      icon: "group",
    },
    {
      name: t("nav.vitals"),
      href: "/vitals",
      icon: "favorite",
    },
    {
      name: t("nav.support"),
      href: "/support",
      icon: "help",
    },
  ];

  // Role-specific primary portal links
  const roleSpecificItem =
    currentRole === "CAREGIVER"
      ? {
          name: t("caregiver.overviewTitle"),
          href: "/caregiver",
          icon: "dashboard_customize",
        }
      : currentRole === "DOCTOR"
      ? {
          name: t("doctor.overviewTitle"),
          href: "/doctor",
          icon: "stethoscope",
        }
      : currentRole === "ADMIN"
      ? {
          name: t("admin.overviewTitle"),
          href: "/admin",
          icon: "admin_panel_settings",
        }
      : null;

  const navItems = roleSpecificItem
    ? [roleSpecificItem, ...baseNavItems]
    : baseNavItems;

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
              {t("nav.brand")}
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              {t("nav.tagline")}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 pt-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href === "/schedule" && pathname === "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-150 min-h-[52px] active:scale-[0.98] ${
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
                <span className="text-sm font-semibold tracking-normal">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Bottom: Language Toggle, High Contrast & Emergency SOS */}
      <div className="flex flex-col gap-3 border-t border-outline-variant/30 pt-4">
        {/* Language Switcher Button */}
        <button
          onClick={() => setLanguage(language === "en" ? "hi" : "en")}
          className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl text-xs font-bold transition-colors min-h-[48px] active:scale-[0.98] w-full text-left border border-outline-variant/30"
          type="button"
          title="Switch language"
        >
          <span className="material-symbols-outlined text-xl">translate</span>
          <span>{language === "en" ? "हिन्दी में देखें (Hindi)" : "View in English"}</span>
        </button>

        {/* High Contrast Toggle */}
        <button
          onClick={toggleHighContrast}
          className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl text-xs font-semibold transition-colors min-h-[48px] active:scale-[0.98] w-full text-left"
          type="button"
          aria-pressed={highContrast}
        >
          <span className="material-symbols-outlined text-xl">contrast</span>
          <span>{highContrast ? t("nav.normalContrast") : t("nav.highContrast")}</span>
        </button>

        {/* Urgent Help Call Button */}
        <button
          onClick={onOpenSos}
          className="w-full min-h-[52px] bg-error hover:bg-red-700 active:scale-[0.98] text-on-error rounded-xl font-bold px-4 py-3 flex items-center justify-center gap-2 shadow-md transition-all text-sm"
          type="button"
        >
          <span className="material-symbols-outlined text-xl material-symbols-fill">
            emergency
          </span>
          <span>{t("nav.urgentHelp")}</span>
        </button>
      </div>
    </aside>
  );
}
