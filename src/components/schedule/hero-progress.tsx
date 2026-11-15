"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

interface HeroProgressProps {
  completedCount: number;
  totalCount: number;
  onOpenVoice: () => void;
}

export function HeroProgress({
  completedCount,
  totalCount,
  onOpenVoice,
}: HeroProgressProps) {
  const { activePatient } = useAuth();
  const { t, formatNumber } = useLanguage();
  const firstName = activePatient?.fullName?.split(" ")[0] || "Margaret";

  const total = totalCount > 0 ? totalCount : 5;
  const completed = completedCount;
  const percentage = Math.min(100, Math.round((completed / total) * 100));

  // Stroke math for 96x96 circle with radius 40 (circumference = 2 * PI * 40 ≈ 251.2)
  const strokeDasharray = 251.2;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  return (
    <section className="mb-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-5 sm:p-7 warm-card-shadow flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-6 w-full md:w-auto">
        {/* Circular Progress Ring with Strict Defensive Sizing & Fills */}
        <div
          className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center"
          style={{ width: "96px", height: "96px", minWidth: "96px", minHeight: "96px" }}
        >
          <svg
            className="w-24 h-24 transform -rotate-90"
            viewBox="0 0 96 96"
            width="96"
            height="96"
            style={{ width: "96px", height: "96px", transform: "rotate(-90deg)" }}
          >
            {/* Background Track Circle: fill explicitly none */}
            <circle
              className="text-surface-container fill-none"
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              style={{ fill: "none" }}
            />
            {/* Dynamic Progress Circle: fill explicitly none, primary brand stroke */}
            <circle
              className="text-primary fill-none transition-all duration-1000 ease-out"
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeWidth="10"
              style={{ fill: "none" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="font-headline text-lg sm:text-2xl font-bold text-primary">
              {formatNumber(completed)} / {formatNumber(total)}
            </span>
            <span className="text-[11px] text-on-surface-variant font-medium leading-none">
              {t("hero.dosesLabel")}
            </span>
          </div>
        </div>

        {/* Reassurance text */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-semibold text-xs sm:text-sm mb-1.5">
            <span className="material-symbols-outlined text-base material-symbols-fill">
              sentiment_satisfied
            </span>
            <span>{percentage >= 60 ? t("hero.badgeOnTrack") : t("hero.badgeJourney")}</span>
          </div>
          <h2 className="font-headline text-lg sm:text-2xl font-bold text-on-surface">
            {t("hero.progressTitle", { completed, total })}
          </h2>
          <p className="text-sm sm:text-base text-on-surface-variant mt-1">
            {percentage === 100
              ? t("hero.progressSubComplete", { name: firstName })
              : t("hero.progressSubOnTrack", { name: firstName })}
          </p>
        </div>
      </div>

      {/* Quick Voice Prompt Pill */}
      <button
        onClick={onOpenVoice}
        type="button"
        className="flex-shrink-0 w-full md:w-auto bg-surface-container-low hover:bg-surface-container px-5 py-4 rounded-xl border border-primary/20 flex items-center gap-4 transition-all text-left active:scale-[0.98]"
      >
        <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-2xl material-symbols-fill">
            mic
          </span>
        </div>
        <div>
          <p className="text-xs text-on-surface-variant font-medium">{t("hero.voicePillActive")}</p>
          <p className="text-sm sm:text-base font-bold text-primary">
            {t("hero.voicePillPrompt")}
          </p>
        </div>
      </button>
    </section>
  );
}
