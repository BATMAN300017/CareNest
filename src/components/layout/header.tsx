"use client";

import React, { useState, useEffect } from "react";
import { useAccessibility } from "@/context/accessibility-context";
import { useAuth } from "@/context/auth-context";
import { formatDate } from "@/lib/utils";

interface HeaderProps {
  onOpenSos: () => void;
  onOpenVoiceAssistant?: () => void;
}

export function Header({ onOpenSos, onOpenVoiceAssistant }: HeaderProps) {
  const { increaseTextSize, decreaseTextSize, readScreen, isSpeaking, stopSpeaking } =
    useAccessibility();
  const { user, patientProfile } = useAuth();
  const [currentDateStr, setCurrentDateStr] = useState("");
  const [greeting, setGreeting] = useState("Good Morning");
  const [weatherIcon, setWeatherIcon] = useState("🌤️");

  useEffect(() => {
    const now = new Date();
    setCurrentDateStr(formatDate(now));

    const hour = now.getHours();
    if (hour < 12) {
      setGreeting("Good Morning");
      setWeatherIcon("🌤️");
    } else if (hour < 17) {
      setGreeting("Good Afternoon");
      setWeatherIcon("☀️");
    } else {
      setGreeting("Good Evening");
      setWeatherIcon("🌙");
    }
  }, []);

  const patientFirstName = patientProfile?.fullName?.split(" ")[0] || "Margaret";

  return (
    <header className="w-full h-20 px-4 sm:px-8 flex justify-between items-center z-20 bg-surface-container-lowest shadow-sm sticky top-0 border-b border-outline-variant/20">
      {/* Greeting and Date Anchor */}
      <div className="flex items-center gap-5">
        <div>
          <h1 className="font-headline text-xl sm:text-2xl text-primary font-bold tracking-tight flex items-center gap-2">
            <span>
              {greeting}, {patientFirstName}!
            </span>
            <span aria-hidden="true" className="text-xl sm:text-2xl">
              {weatherIcon}
            </span>
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant hidden sm:block">
            {currentDateStr || "Today"} • Gentle 68°F
          </p>
        </div>

        {/* Caretaker Sync Pill Indicator */}
        <div className="hidden xl:flex items-center gap-2.5 px-4 py-2 bg-surface-container-low border border-primary/20 rounded-full">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="text-xs sm:text-sm text-primary font-semibold">
            Sarah &amp; Nurse Elena connected (3m ago)
          </span>
        </div>
      </div>

      {/* Trailing Action Cluster */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Font Sizing Buttons [A- / A+] */}
        <div
          aria-label="Text size adjustment"
          className="flex items-center bg-surface-container rounded-xl p-1 border border-outline-variant/40"
          role="group"
        >
          <button
            aria-label="Decrease text size"
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg hover:bg-surface-container-lowest text-on-surface font-bold text-base transition-colors"
            id="font-decrease"
            title="Decrease Text Size"
            type="button"
            onClick={decreaseTextSize}
          >
            A-
          </button>
          <div className="w-px h-6 bg-outline-variant/40"></div>
          <button
            aria-label="Increase text size"
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg hover:bg-surface-container-lowest text-on-surface font-bold text-lg transition-colors"
            id="font-increase"
            title="Increase Text Size"
            type="button"
            onClick={increaseTextSize}
          >
            A+
          </button>
        </div>

        {/* Read Screen Aloud Button */}
        <button
          aria-label={isSpeaking ? "Stop Reading Screen" : "Read Screen Aloud"}
          className={`min-h-[48px] sm:min-h-[56px] px-3 sm:px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors border border-outline-variant/30 active:scale-[0.98] ${
            isSpeaking
              ? "bg-primary text-on-primary animate-pulse"
              : "bg-surface-container hover:bg-surface-container-high text-primary"
          }`}
          id="read-aloud-btn"
          type="button"
          onClick={isSpeaking ? stopSpeaking : readScreen}
        >
          <span className="material-symbols-outlined text-2xl material-symbols-fill">
            {isSpeaking ? "volume_off" : "hearing"}
          </span>
          <span className="text-sm sm:text-base hidden md:inline">
            {isSpeaking ? "Stop Audio" : "Read Aloud"}
          </span>
        </button>

        {/* Emergency SOS Primary Action */}
        <button
          aria-label="Emergency SOS 1-Click Call"
          className="min-h-[48px] sm:min-h-[56px] px-4 sm:px-6 py-2.5 bg-error hover:bg-red-700 text-on-error rounded-xl font-bold flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
          type="button"
          onClick={onOpenSos}
        >
          <span className="material-symbols-outlined text-2xl material-symbols-fill">
            emergency
          </span>
          <span className="text-sm sm:text-base tracking-wide">SOS</span>
        </button>
      </div>
    </header>
  );
}
