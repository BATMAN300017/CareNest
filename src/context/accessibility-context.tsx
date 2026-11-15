"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type TextSize = "normal" | "large" | "xlarge";

interface AccessibilityContextType {
  textSize: TextSize;
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  resetTextSize: () => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  // Speech Output (Read Aloud)
  isSpeaking: boolean;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  readScreen: () => void;
  // Speech Input (Voice Assistant)
  isListening: boolean;
  voiceSupported: boolean;
  startListening: (onResult?: (text: string) => void) => void;
  stopListening: () => void;
  lastSpokenText: string;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Load saved preferences
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedSize = localStorage.getItem("carenest_text_size") as TextSize;
    if (savedSize && ["normal", "large", "xlarge"].includes(savedSize)) {
      setTextSize(savedSize);
    }

    const savedContrast = localStorage.getItem("carenest_high_contrast") === "true";
    setHighContrast(savedContrast);

    // Check Web Speech API availability
    const hasSpeechRecognition =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    const hasSpeechSynthesis = "speechSynthesis" in window;
    setVoiceSupported(Boolean(hasSpeechRecognition && hasSpeechSynthesis));
  }, []);

  // Apply classes to <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.classList.remove("text-scale-large", "text-scale-xlarge");
    if (textSize === "large") root.classList.add("text-scale-large");
    if (textSize === "xlarge") root.classList.add("text-scale-xlarge");

    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
  }, [textSize, highContrast]);

  const increaseTextSize = () => {
    setTextSize((prev) => {
      const next = prev === "normal" ? "large" : "xlarge";
      localStorage.setItem("carenest_text_size", next);
      return next;
    });
  };

  const decreaseTextSize = () => {
    setTextSize((prev) => {
      const next = prev === "xlarge" ? "large" : "normal";
      localStorage.setItem("carenest_text_size", next);
      return next;
    });
  };

  const resetTextSize = () => {
    setTextSize("normal");
    localStorage.setItem("carenest_text_size", "normal");
  };

  const toggleHighContrast = () => {
    setHighContrast((prev) => {
      const next = !prev;
      localStorage.setItem("carenest_high_contrast", String(next));
      return next;
    });
  };

  // Text-to-Speech (Read Aloud)
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85; // Measured pace for senior clarity
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const readScreen = useCallback(() => {
    if (typeof document === "undefined") return;
    // Extract main readable headings and content
    const main = document.querySelector("main");
    if (!main) {
      speak("Welcome to CareNest Senior Care Platform.");
      return;
    }

    const headings = Array.from(main.querySelectorAll("h1, h2, h3, p"))
      .map((el) => el.textContent?.trim())
      .filter((t): t is string => Boolean(t && t.length > 0))
      .slice(0, 10)
      .join(". ");

    speak(headings || "No text available to read.");
  }, [speak]);

  interface SpeechRecognitionEvent {
  results: Array<Array<{ transcript: string }>>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

// Speech-to-Text (Voice Assistant)
  const startListening = useCallback(
    (onResult?: (text: string) => void) => {
      if (typeof window === "undefined") return;

      const win = window as unknown as WindowWithSpeech;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        speak("Voice recognition is not supported in this browser.");
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0]?.[0]?.transcript || "";
          setLastSpokenText(transcript);
          setIsListening(false);
          if (onResult && transcript) {
            onResult(transcript);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (e) {
        setIsListening(false);
      }
    },
    [speak]
  );

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        textSize,
        increaseTextSize,
        decreaseTextSize,
        resetTextSize,
        highContrast,
        toggleHighContrast,
        isSpeaking,
        speak,
        stopSpeaking,
        readScreen,
        isListening,
        voiceSupported,
        startListening,
        stopListening,
        lastSpokenText,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
