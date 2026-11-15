"use client";

import React, { useState, useEffect } from "react";
import { useAccessibility } from "@/context/accessibility-context";
import { useAuth, UserRole } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

interface HeaderProps {
  onOpenSos: () => void;
  onOpenVoiceAssistant?: () => void;
}

export function Header({ onOpenSos, onOpenVoiceAssistant }: HeaderProps) {
  const { increaseTextSize, decreaseTextSize } = useAccessibility();
  const { user, currentRole, switchRole, activePatient, linkedPatients, setActivePatientId } =
    useAuth();
  const { language, setLanguage, t, formatDate, speak, stopSpeaking, isSpeaking } = useLanguage();

  const [currentDateStr, setCurrentDateStr] = useState("");
  const [greeting, setGreeting] = useState("Good Morning");
  const [weatherIcon, setWeatherIcon] = useState("🌤️");
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    setCurrentDateStr(formatDate(now));

    const hour = now.getHours();
    if (hour < 12) {
      setGreeting(t("header.goodMorning"));
      setWeatherIcon("🌤️");
    } else if (hour < 17) {
      setGreeting(t("header.goodAfternoon"));
      setWeatherIcon("☀️");
    } else {
      setGreeting(t("header.goodEvening"));
      setWeatherIcon("🌙");
    }
  }, [language, t, formatDate]);

  const patientFirstName = activePatient?.fullName?.split(" ")[0] || "Margaret";

  const handleReadAloud = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const summaryText =
        language === "hi"
          ? `${greeting}, ${patientFirstName}। आज केयरनेस्ट पर आपका स्वागत है। आपकी आज की दवाइयाँ और स्वास्थ्य दिनचर्या समय पर हैं।`
          : `${greeting}, ${patientFirstName}. Welcome to CareNest. You have 2 out of 5 medications completed today. Your next dose is Metformin at 1:00 PM.`;
      speak(summaryText);
    }
  };

  return (
    <header className="w-full min-h-20 py-2 px-4 sm:px-8 flex flex-wrap justify-between items-center z-20 bg-surface-container-lowest shadow-sm sticky top-0 border-b border-outline-variant/20 gap-3">
      {/* Left: Greeting, Weather, and Multi-Patient / Role Status */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="font-headline text-lg sm:text-2xl text-primary font-bold tracking-tight flex items-center gap-2">
            <span>
              {greeting}, {patientFirstName}!
            </span>
            <span aria-hidden="true" className="text-xl sm:text-2xl">
              {weatherIcon}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            {currentDateStr || "Today"} • 68°F / 20°C
          </p>
        </div>

        {/* Multi-Patient Selector for Caregiver & Doctor Roles */}
        {(currentRole === "CAREGIVER" || currentRole === "DOCTOR") && (
          <div className="relative">
            <button
              onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold border border-secondary/30 hover:bg-secondary-container/80 transition-all"
              title="Switch managing patient"
            >
              <span className="material-symbols-outlined text-sm">person_pin</span>
              <span>
                {t("roles.managing")} {activePatient.fullName}
              </span>
              <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
            </button>

            {isPatientDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-lg z-50 p-2 space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold text-on-surface-variant uppercase">
                  {t("roles.switchPatient")}
                </div>
                {linkedPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => {
                      setActivePatientId(patient.id);
                      setIsPatientDropdownOpen(false);
                    }}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      activePatient.id === patient.id
                        ? "bg-primary text-on-primary font-bold"
                        : "hover:bg-surface-container text-on-surface"
                    }`}
                  >
                    <div>
                      <p>{patient.fullName}</p>
                      <p className="text-[10px] opacity-80">
                        {patient.relationshipLabel || "Patient"} • Age {patient.age || 76}
                      </p>
                    </div>
                    {activePatient.id === patient.id && (
                      <span className="material-symbols-outlined text-base">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Caretaker Sync Pill Indicator (Patient View) */}
        {currentRole === "PATIENT" && (
          <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 bg-surface-container-low border border-primary/20 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="text-xs text-primary font-semibold">
              {t("header.caregiversConnected")}
            </span>
          </div>
        )}
      </div>

      {/* Trailing Action Cluster: Language, Role Switcher, Accessibility & SOS */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Language Switcher Pill [EN | हिन्दी] */}
        <div className="flex items-center rounded-xl bg-surface-container border border-outline-variant/40 p-0.5">
          <button
            onClick={() => setLanguage("en")}
            type="button"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              language === "en"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Switch to English"
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("hi")}
            type="button"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              language === "hi"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="हिन्दी में बदलें"
          >
            हिन्दी
          </button>
        </div>

        {/* Portal Role Perspective Selector */}
        <div className="relative">
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-bold text-on-surface transition-colors"
            title="Switch portal view"
          >
            <span className="material-symbols-outlined text-base">switch_account</span>
            <span className="hidden md:inline">
              {currentRole === "PATIENT"
                ? t("roles.patientView")
                : currentRole === "CAREGIVER"
                ? t("roles.caregiverView")
                : currentRole === "DOCTOR"
                ? t("roles.doctorView")
                : t("roles.adminView")}
            </span>
            <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-lg z-50 p-2 space-y-1">
              <div className="px-2 py-1 text-[11px] font-bold text-on-surface-variant uppercase">
                {t("nav.switchRole")}
              </div>
              <button
                onClick={() => {
                  switchRole("PATIENT");
                  setIsRoleDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  currentRole === "PATIENT" ? "bg-primary text-on-primary" : "hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-base">elderly</span>
                <span>{t("roles.patientView")}</span>
              </button>
              <button
                onClick={() => {
                  switchRole("CAREGIVER");
                  setIsRoleDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  currentRole === "CAREGIVER" ? "bg-primary text-on-primary" : "hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-base">family_restroom</span>
                <span>{t("roles.caregiverView")}</span>
              </button>
              <button
                onClick={() => {
                  switchRole("DOCTOR");
                  setIsRoleDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  currentRole === "DOCTOR" ? "bg-primary text-on-primary" : "hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-base">medical_services</span>
                <span>{t("roles.doctorView")}</span>
              </button>
              <button
                onClick={() => {
                  switchRole("ADMIN");
                  setIsRoleDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  currentRole === "ADMIN" ? "bg-primary text-on-primary" : "hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                <span>{t("roles.adminView")}</span>
              </button>
            </div>
          )}
        </div>

        {/* Font Sizing Buttons [A- / A+] */}
        <div
          aria-label={t("header.textSize")}
          className="hidden sm:flex items-center bg-surface-container rounded-xl p-1 border border-outline-variant/40"
          role="group"
        >
          <button
            aria-label="Decrease text size"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-lowest text-on-surface font-bold text-sm transition-colors"
            title="Decrease Text Size"
            type="button"
            onClick={decreaseTextSize}
          >
            A-
          </button>
          <div className="w-px h-5 bg-outline-variant/40"></div>
          <button
            aria-label="Increase text size"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-lowest text-on-surface font-bold text-base transition-colors"
            title="Increase Text Size"
            type="button"
            onClick={increaseTextSize}
          >
            A+
          </button>
        </div>

        {/* Multilingual Read Aloud Button (बोलकर सुनाएँ) */}
        <button
          aria-label={isSpeaking ? t("header.stopAudio") : t("header.readAloud")}
          className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors border border-outline-variant/30 active:scale-[0.98] ${
            isSpeaking
              ? "bg-primary text-on-primary animate-pulse"
              : "bg-surface-container hover:bg-surface-container-high text-primary"
          }`}
          type="button"
          onClick={handleReadAloud}
          title={isSpeaking ? t("header.stopAudio") : t("header.readAloud")}
        >
          <span className="material-symbols-outlined text-xl material-symbols-fill">
            {isSpeaking ? "volume_off" : "hearing"}
          </span>
          <span className="text-xs sm:text-sm hidden md:inline">
            {isSpeaking ? t("header.stopAudio") : t("header.readAloud")}
          </span>
        </button>

        {/* Emergency SOS Primary Action */}
        <button
          aria-label="Emergency SOS"
          className="min-h-[44px] px-4 sm:px-5 py-2 bg-error hover:bg-red-700 text-on-error rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
          type="button"
          onClick={onOpenSos}
          title={t("header.sosButton")}
        >
          <span className="material-symbols-outlined text-xl material-symbols-fill">
            emergency
          </span>
          <span className="text-xs sm:text-sm tracking-wide">{t("header.sosButton")}</span>
        </button>
      </div>
    </header>
  );
}
