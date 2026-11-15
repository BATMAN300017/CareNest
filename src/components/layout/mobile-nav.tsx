"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mobileNavItems = [
  { name: "Schedule", href: "/schedule", icon: "calendar_today" },
  { name: "Meds", href: "/medications", icon: "medication" },
  { name: "Doctors", href: "/appointments", icon: "medical_services" },
  { name: "Care Circle", href: "/care-circle", icon: "group" },
  { name: "Vitals", href: "/vitals", icon: "favorite" },
  { name: "Settings", href: "/support", icon: "help" },
];

export function MobileNav() {
  const pathname = usePathname();

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
            className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl min-h-[56px] min-w-[56px] transition-colors ${
              isActive
                ? "text-primary font-bold bg-primary-fixed/30"
                : "text-on-surface-variant hover:text-on-surface font-medium"
            }`}
          >
            <span
              className={`material-symbols-outlined text-2xl ${
                isActive ? "material-symbols-fill" : ""
              }`}
            >
              {item.icon}
            </span>
            <span className="text-xs mt-0.5">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
