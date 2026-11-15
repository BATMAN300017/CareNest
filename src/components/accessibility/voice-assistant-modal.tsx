"use client";

import React, { useState } from "react";
import { useAccessibility } from "@/context/accessibility-context";

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCommand?: (command: string) => void;
}

export function VoiceAssistantModal({
  isOpen,
  onClose,
  onVoiceCommand,
}: VoiceAssistantModalProps) {
  const { isListening, startListening, stopListening, speak, voiceSupported } =
    useAccessibility();
  const [transcript, setTranscript] = useState<string>("");
  const [feedback, setFeedback] = useState<string>(
    "Tap the microphone and speak your request clearly."
  );

  if (!isOpen) return null;

  const handleStartListening = () => {
    setFeedback("Listening now... please speak clearly.");
    startListening((spokenText) => {
      setTranscript(spokenText);
      const lower = spokenText.toLowerCase();

      if (lower.includes("taken") || lower.includes("took")) {
        setFeedback("Processing: Marking your due medication as taken.");
        speak("Understood. Recording your medication as taken.");
        if (onVoiceCommand) onVoiceCommand("MARK_TAKEN");
      } else if (lower.includes("read") || lower.includes("schedule")) {
        setFeedback("Reading your schedule for today.");
        speak(
          "You have five doses scheduled today. Three are already completed. Your afternoon Metformin is ready now."
        );
      } else if (lower.includes("call") || lower.includes("sarah")) {
        setFeedback("Connecting you to your daughter Sarah.");
        speak("Connecting you to Sarah Jenkins now.");
      } else if (lower.includes("emergency") || lower.includes("help")) {
        setFeedback("Opening Emergency Assistance.");
        speak("Opening emergency assistance immediately.");
        if (onVoiceCommand) onVoiceCommand("EMERGENCY");
      } else {
        setFeedback(`Heard: "${spokenText}". Command received.`);
        speak(`You said: ${spokenText}`);
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full border border-primary/20 p-6 sm:p-8 shadow-warm-dialog text-center">
        {/* Header */}
        <h2 id="voice-modal-title" className="font-headline text-2xl font-bold text-primary mb-2">
          CareNest Voice Assistant
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          Speak in natural, conversational English
        </p>

        {/* Big Mic Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={isListening ? stopListening : handleStartListening}
            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
              isListening
                ? "bg-error text-on-error animate-ping"
                : "bg-primary text-on-primary hover:bg-primary-container"
            }`}
            aria-label={isListening ? "Listening... Tap to stop" : "Tap to speak"}
          >
            <span className="material-symbols-outlined text-5xl material-symbols-fill">
              {isListening ? "graphic_eq" : "mic"}
            </span>
          </button>
        </div>

        {/* Live Feedback */}
        <div className="bg-surface-container-low rounded-xl p-4 mb-6 border border-outline-variant/30 min-h-[72px] flex items-center justify-center">
          <p className="text-base text-on-surface font-medium">
            {transcript ? `"${transcript}"` : feedback}
          </p>
        </div>

        {/* Helpful Voice Commands */}
        <div className="text-left bg-surface-container rounded-xl p-4 mb-6 text-xs sm:text-sm text-on-surface-variant space-y-1.5">
          <p className="font-bold text-on-surface">Sample voice commands:</p>
          <p>• &quot;Hey CareNest, mark as taken&quot;</p>
          <p>• &quot;Read my daily schedule&quot;</p>
          <p>• &quot;Call Sarah&quot;</p>
          <p>• &quot;Emergency help&quot;</p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full min-h-[52px] py-3 bg-surface-container-high hover:bg-surface-dim text-on-surface rounded-xl font-bold transition-colors"
        >
          Close Voice Assistant
        </button>
      </div>
    </div>
  );
}
