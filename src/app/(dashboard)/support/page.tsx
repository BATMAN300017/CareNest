"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { api } from "@/lib/api-client";
import { useAccessibility } from "@/context/accessibility-context";

interface NotificationPrefState {
  voiceRemindersEnabled: boolean;
  smsRemindersEnabled: boolean;
  emailRemindersEnabled: boolean;
  appointmentRemindersEnabled: boolean;
  voiceSpeed: "SLOW" | "NORMAL";
  quietHoursStart: string;
  quietHoursEnd: string;
  caregiverEscalationEnabled: boolean;
  maxCallAttempts: number;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  channel: "TELEPHONE_CALL" | "SMS" | "EMAIL" | "IN_APP";
  eventType: string;
  status: "QUEUED" | "DELIVERED" | "FAILED" | "CANCELLED";
  createdAt: string;
  readAtUtc?: string | null;
}

const DEFAULT_PREFS: NotificationPrefState = {
  voiceRemindersEnabled: true,
  smsRemindersEnabled: true,
  emailRemindersEnabled: false,
  appointmentRemindersEnabled: true,
  voiceSpeed: "SLOW",
  quietHoursStart: "21:00",
  quietHoursEnd: "08:00",
  caregiverEscalationEnabled: true,
  maxCallAttempts: 3,
};

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif_1",
    title: "Medication Reminder: Metformin 500mg",
    body: "Time for your afternoon dose with lunch.",
    channel: "TELEPHONE_CALL",
    eventType: "MEDICATION_REMINDER",
    status: "DELIVERED",
    createdAt: new Date().toISOString(),
    readAtUtc: new Date().toISOString(),
  },
  {
    id: "notif_2",
    title: "Appointment Reminder: Dr. Robert Chen",
    body: "Cardiology check-up tomorrow at 2:00 PM. Transportation confirmed via SilverRide.",
    channel: "SMS",
    eventType: "APPOINTMENT_REMINDER_24H",
    status: "DELIVERED",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    readAtUtc: null,
  },
  {
    id: "notif_3",
    title: "Morning Lisinopril Dose Confirmed",
    body: "Recorded as taken at 8:12 AM with toast.",
    channel: "IN_APP",
    eventType: "DOSE_CONFIRMED",
    status: "DELIVERED",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    readAtUtc: new Date().toISOString(),
  },
];

export default function SupportPage() {
  const { activePatientId } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { textSize, increaseTextSize, decreaseTextSize, highContrast, toggleHighContrast } =
    useAccessibility();

  const [prefs, setPrefs] = useState<NotificationPrefState>(DEFAULT_PREFS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const prefRes = await api.get(
          `/api/v1/patients/${activePatientId}/notification-preferences`
        );
        if (prefRes && typeof prefRes === "object") {
          setPrefs((prev) => ({ ...prev, ...prefRes }));
        }
      } catch (e) {}

      try {
        const notifRes = await api.get<{ items?: NotificationItem[] }>(`/api/v1/patients/${activePatientId}/notifications`);
        if (Array.isArray(notifRes?.items) && notifRes.items.length > 0) {
          setNotifications(notifRes.items);
        }
      } catch (e) {}
    }
    loadData();
  }, [activePatientId]);

  const handleUpdatePref = async (updates: Partial<NotificationPrefState>) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    setIsSavingPrefs(true);
    setSaveSuccessMsg(null);

    try {
      await api.patch(
        `/api/v1/patients/${activePatientId}/notification-preferences`,
        updates
      );
      setSaveSuccessMsg("Preferences saved successfully!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      // Local optimistic update
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAtUtc: new Date().toISOString() } : n))
    );
    try {
      await api.patch(`/api/v1/patients/${activePatientId}/notifications/${id}/read`);
    } catch (e) {}
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
          Support &amp; Notification Settings
        </h2>
        <p className="text-base text-on-surface-variant">
          Customize automated telephone calls, quiet hours, and senior accessibility options
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-primary-fixed text-on-primary-fixed rounded-xl font-bold text-sm flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Notification & Telephony Preferences (7 cols) */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 sm:p-7 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/30">
              <span className="material-symbols-outlined text-3xl text-primary material-symbols-fill">
                notifications_active
              </span>
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  Automated Reminder Channels
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  Control how you and your care team receive medication alerts
                </p>
              </div>
            </div>

            {/* Voice Calls Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <div className="flex items-center gap-3.5">
                <span className="material-symbols-outlined text-3xl text-primary">phone_in_talk</span>
                <div>
                  <span className="block text-base font-bold text-on-surface">
                    Automated Voice Phone Reminders
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Receives a friendly telephone call when a dose is due
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.voiceRemindersEnabled}
                onChange={(e) =>
                  handleUpdatePref({ voiceRemindersEnabled: e.target.checked })
                }
                className="w-6 h-6 text-primary focus:ring-primary rounded"
              />
            </div>

            {/* Voice Pacing Selector */}
            {prefs.voiceRemindersEnabled && (
              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/40 space-y-2">
                <label className="block text-sm font-bold text-on-surface">
                  Voice Speech Rate &amp; Pacing:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdatePref({ voiceSpeed: "SLOW" })}
                    className={`min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      prefs.voiceSpeed === "SLOW"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <span>🐢 Slow &amp; Clear (Recommended)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdatePref({ voiceSpeed: "NORMAL" })}
                    className={`min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      prefs.voiceSpeed === "NORMAL"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <span>🐇 Normal Speed</span>
                  </button>
                </div>
              </div>
            )}

            {/* SMS Reminders Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <div className="flex items-center gap-3.5">
                <span className="material-symbols-outlined text-3xl text-secondary">sms</span>
                <div>
                  <span className="block text-base font-bold text-on-surface">
                    SMS Text Reminders
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Sends text message reminders for doses and upcoming visits
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.smsRemindersEnabled}
                onChange={(e) => handleUpdatePref({ smsRemindersEnabled: e.target.checked })}
                className="w-6 h-6 text-secondary focus:ring-secondary rounded"
              />
            </div>

            {/* Appointment Reminders Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <div className="flex items-center gap-3.5">
                <span className="material-symbols-outlined text-3xl text-secondary">
                  event_upcoming
                </span>
                <div>
                  <span className="block text-base font-bold text-on-surface">
                    Advance Appointment Alerts (24h &amp; 2h)
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Includes travel confirmation &amp; doctor preparation instructions
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.appointmentRemindersEnabled}
                onChange={(e) =>
                  handleUpdatePref({ appointmentRemindersEnabled: e.target.checked })
                }
                className="w-6 h-6 text-secondary focus:ring-secondary rounded"
              />
            </div>

            {/* Quiet Hours Configuration */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
              <div className="flex items-center gap-2 text-on-surface font-bold text-base">
                <span className="material-symbols-outlined text-2xl text-secondary">bedtime</span>
                <span>Quiet Hours (No automated calls during sleep)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Start (Nighttime)
                  </label>
                  <input
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={(e) => handleUpdatePref({ quietHoursStart: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    End (Morning)
                  </label>
                  <input
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={(e) => handleUpdatePref({ quietHoursEnd: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-bold"
                  />
                </div>
              </div>
              <p className="text-xs text-on-surface-variant">
                Calls will be suppressed between {prefs.quietHoursStart} and {prefs.quietHoursEnd}.
                Silent in-app notifications will be recorded instead.
              </p>
            </div>

            {/* Caregiver Escalation Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <div>
                <span className="block text-base font-bold text-on-surface">
                  Caregiver Missed-Dose Escalation
                </span>
                <span className="text-xs text-on-surface-variant">
                  Notify primary caregiver if a dose remains unconfirmed after 75 minutes
                </span>
              </div>
              <input
                type="checkbox"
                checked={prefs.caregiverEscalationEnabled}
                onChange={(e) =>
                  handleUpdatePref({ caregiverEscalationEnabled: e.target.checked })
                }
                className="w-6 h-6 text-primary focus:ring-primary rounded"
              />
            </div>
          </div>

          {/* Language & Regional Preferences Card */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/30">
              <span className="material-symbols-outlined text-3xl text-primary material-symbols-fill">
                translate
              </span>
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  {language === "hi" ? "भाषा और क्षेत्रीय प्राथमिकताएं" : "Language & Regional Preferences"}
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  {language === "hi"
                    ? "इंटरफ़ेस भाषा, सूचना टेम्पलेट और आवाज़ सहायक सेटिंग्स चुनें"
                    : "Choose application language, reminder templates, and speech synthesis voice"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* English Option */}
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                  language === "en"
                    ? "border-primary bg-primary-fixed/20 shadow-sm"
                    : "border-outline-variant/30 bg-surface-container-low hover:bg-surface-container"
                }`}
              >
                <span className="text-2xl">🇺🇸</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-headline font-bold text-base text-on-surface">English</span>
                    {language === "en" && (
                      <span className="material-symbols-outlined text-primary text-xl material-symbols-fill">
                        check_circle
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    English UI, US dates, standard automated voice reminders
                  </p>
                </div>
              </button>

              {/* Hindi Option */}
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                  language === "hi"
                    ? "border-primary bg-primary-fixed/20 shadow-sm"
                    : "border-outline-variant/30 bg-surface-container-low hover:bg-surface-container"
                }`}
              >
                <span className="text-2xl">🇮🇳</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-headline font-bold text-base text-on-surface">हिन्दी (Hindi)</span>
                    {language === "hi" && (
                      <span className="material-symbols-outlined text-primary text-xl material-symbols-fill">
                        check_circle
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 font-hindi">
                    देवनागरी इंटरफ़ेस, भारतीय दिनांक प्रारूप, हिन्दी आवाज़ वाचन
                  </p>
                </div>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant">
              {language === "hi"
                ? "नोट: चिकित्सीय सुरक्षा के लिए दवा के नाम (उदा. Lisinopril 10mg) हमेशा मूल नुस्खे के अनुसार सुरक्षित रखे जाते हैं।"
                : "Note: For patient safety, medication brand names (e.g. Lisinopril 10mg) are always accurately preserved."}
            </p>
          </div>

          {/* Quick Accessibility Controls Box */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 space-y-4">
            <h3 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-primary">
                accessibility_new
              </span>
              <span>Visual Accessibility Options</span>
            </h3>

            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <div>
                <span className="block text-base font-bold text-on-surface">
                  Text Sizing ({textSize.toUpperCase()})
                </span>
                <span className="text-xs text-on-surface-variant">
                  Current scaling: {textSize === "normal" ? "100%" : textSize === "large" ? "115%" : "130%"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={decreaseTextSize}
                  className="min-h-[44px] px-4 rounded-xl bg-surface-container hover:bg-surface-container-high font-bold text-sm"
                >
                  A- Smaller
                </button>
                <button
                  type="button"
                  onClick={increaseTextSize}
                  className="min-h-[44px] px-4 rounded-xl bg-primary text-on-primary font-bold text-sm"
                >
                  A+ Larger
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <div>
                <span className="block text-base font-bold text-on-surface">
                  High Contrast Display Mode
                </span>
                <span className="text-xs text-on-surface-variant">
                  Sharper text contrast with bold black boundaries
                </span>
              </div>
              <button
                type="button"
                onClick={toggleHighContrast}
                className={`min-h-[44px] px-5 rounded-xl font-bold text-sm transition-colors ${
                  highContrast
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                }`}
              >
                {highContrast ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Notification Log & Emergency Directory (5 cols) */}
        <section className="lg:col-span-5 space-y-6">
          {/* Recent Delivery Log */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 space-y-4">
            <h3 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-secondary">history</span>
              <span>Recent Delivery History</span>
            </h3>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border text-sm space-y-1 transition-all ${
                    notif.readAtUtc
                      ? "bg-surface-container-low/50 border-outline-variant/20"
                      : "bg-primary-fixed/20 border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">{notif.title}</span>
                    <span className="text-[11px] text-on-surface-variant">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-snug">{notif.body}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] font-bold text-secondary">
                      {notif.channel}
                    </span>
                    {!notif.readAtUtc && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency & Physician Directory */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 space-y-4">
            <h3 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-primary">call</span>
              <span>Quick Call Directory</span>
            </h3>

            <div className="space-y-2.5">
              <a
                href="tel:+15559876543"
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-sm font-bold text-on-surface transition-colors"
              >
                <span>Sarah Jenkins (Daughter)</span>
                <span className="text-primary font-bold">Call →</span>
              </a>

              <a
                href="tel:+15554321098"
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-sm font-bold text-on-surface transition-colors"
              >
                <span>Dr. Robert Chen (Cardiology)</span>
                <span className="text-primary font-bold">Call →</span>
              </a>

              <a
                href="tel:+15557778899"
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-sm font-bold text-on-surface transition-colors"
              >
                <span>SilverRide Senior Transport</span>
                <span className="text-primary font-bold">Call →</span>
              </a>

              <a
                href="tel:+15552223344"
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-sm font-bold text-on-surface transition-colors"
              >
                <span>Walgreens Pharmacy (#4201)</span>
                <span className="text-primary font-bold">Call →</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
