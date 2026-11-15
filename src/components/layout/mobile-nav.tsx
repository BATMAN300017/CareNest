"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/language-context";

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const mobileNavItems = [
    { name: t("nav.schedule"), href: "/schedule", icon: "calendar_today" },
    { name: t("nav.medications"), href: "/medications", icon: "medication" },
    { name: t("nav.appointments"), href: "/appointments", icon: "medical_services" },
    { name: t("nav.careCircle"), href: "/care-circle", icon: "group" },
    { name: t("nav.vitals"), href: "/vitals", icon: "favorite" },
    { name: t("nav.support"), href: "/support", icon: "help" },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-container-lowest border-t border-outline-variant/30 px-2 py-1 shadow-lg flex items-center justify-around"
    >
      {mobileNavItems.map((item) => {
        const isActive =
          pathname === item.href || (item.href === "/schedule" && pathname === "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1.5 px-1.5 rounded-xl min-h-[52px] min-w-[52px] transition-colors ${
              isActive
                ? "text-primary font-bold bg-primary-fixed/30"
                : "text-on-surface-variant hover:text-on-surface font-medium"
            }`}
          >
            <span
              className={`material-symbols-outlined text-xl ${
                isActive ? "material-symbols-fill" : ""
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[11px] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[56px] text-center">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
