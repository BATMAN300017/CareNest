"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations, SupportedLanguage } from "@/i18n/translations";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number) => string;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Initialize language from localStorage or default to English
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedLang = localStorage.getItem("carenest_language") as SupportedLanguage;
      if (savedLang === "en" || savedLang === "hi") {
        setLanguageState(savedLang);
        document.documentElement.lang = savedLang;
      } else {
        document.documentElement.lang = "en";
      }
    } catch (e) {
      // Default to English
    }
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("carenest_language", lang);
        document.documentElement.lang = lang;
      } catch (e) {}
    }
  }, []);

  // Translation function with parameter interpolation
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[language] || translations.en;
      let template = dict[key] || translations.en[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          template = template.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
        });
      }

      return template;
    },
    [language]
  );

  // Locale-aware date formatting
  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      const locale = language === "hi" ? "hi-IN" : "en-US";

      const defaultOptions: Intl.DateTimeFormatOptions = options || {
        weekday: "long",
        month: "short",
        day: "numeric",
      };

      try {
        return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
      } catch (e) {
        return d.toLocaleDateString();
      }
    },
    [language]
  );

  // Locale-aware number formatting
  const formatNumber = useCallback(
    (num: number): string => {
      const locale = language === "hi" ? "hi-IN" : "en-US";
      try {
        return new Intl.NumberFormat(locale).format(num);
      } catch (e) {
        return String(num);
      }
    },
    [language]
  );

  // Multilingual Text-to-Speech (TTS) with Hindi & English voice selection
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "hi" ? "hi-IN" : "en-US";
      utterance.rate = 0.9; // Slightly slower pace for elderly comprehension
      utterance.pitch = 1.0;

      // Select appropriate natural voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const targetLangPrefix = language === "hi" ? "hi" : "en";
        const voice =
          voices.find((v) => v.lang.startsWith(targetLangPrefix)) ||
          voices.find((v) => v.lang.includes(targetLangPrefix));
        if (voice) {
          utterance.voice = voice;
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatDate,
        formatNumber,
        speak,
        stopSpeaking,
        isSpeaking,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
