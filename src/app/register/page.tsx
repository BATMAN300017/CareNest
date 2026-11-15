"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { getErrorMessage } from "@/core/errors/error-utils";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ELDERLY_PATIENT");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(language === "hi" ? "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।" : "Password must be at least 8 characters long.");
      return;
    }

    setError(null);
    try {
      await register({
        fullName,
        email,
        phone,
        password,
        role,
        preferredLanguage: language,
      });
      router.push("/schedule");
    } catch (err: unknown) {
      const fallback = language === "hi" ? "पंजीकरण विफल रहा। कृपया अपनी जानकारी जांचें।" : "Registration failed. Please check your information.";
      setError(getErrorMessage(err, fallback));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 sm:p-8 space-y-6">
        {/* Language Selection Header Pill */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-primary">translate</span>
            {language === "hi" ? "भाषा प्राथमिकता" : "Language"}
          </span>
          <div className="inline-flex rounded-xl bg-surface-container p-1 border border-outline-variant/30">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                language === "en"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage("hi")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                language === "hi"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary mx-auto flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-4xl material-symbols-fill">
              nest_eco_leaf
            </span>
          </div>
          <h1 className="font-headline text-3xl font-bold text-primary">
            {language === "hi" ? "केयरनेस्ट" : "CareNest"}
          </h1>
          <p className="text-sm text-on-surface-variant font-medium">
            {language === "hi" ? "शुरू करने के लिए अपना खाता बनाएँ" : "Create your account to get started"}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-error-container text-on-error-container rounded-xl text-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              {language === "hi" ? "खाता प्रकार / भूमिका *" : "Account Role *"}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low font-medium"
            >
              <option value="ELDERLY_PATIENT">
                {language === "hi" ? "👵 वरिष्ठ नागरिक / मरीज़ (Senior Patient)" : "👵 Senior / Elderly Patient"}
              </option>
              <option value="FAMILY_MEMBER">
                {language === "hi" ? "👨‍👩‍👧 परिवार के सदस्य (Family Care Circle)" : "👨‍👩‍👧 Family Member / Care Circle"}
              </option>
              <option value="CAREGIVER">
                {language === "hi" ? "🩺 पेशेवर देखभालकर्ता / नर्स (Professional Caregiver)" : "🩺 Professional Caregiver / Nurse"}
              </option>
              <option value="DOCTOR">
                {language === "hi" ? "👨‍⚕️ डॉक्टर / स्वास्थ्य पेशेवर (Doctor / Clinician)" : "👨‍⚕️ Doctor / Healthcare Professional"}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              {language === "hi" ? "पूरा नाम *" : "Full Name *"}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={language === "hi" ? "उदा. मार्गरेट जेनकिंस" : "e.g. Margaret Jenkins"}
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              {language === "hi" ? "ईमेल पता *" : "Email Address *"}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. margaret@example.com"
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              {language === "hi" ? "प्राथमिक फ़ोन नंबर (स्वचालित कॉल और SMS के लिए)" : "Primary Phone (for automated reminders)"}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 (555) 234-5678"
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              {language === "hi" ? "पासवर्ड (कम से कम 8 अक्षर) *" : "Password (min. 8 characters) *"}
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={language === "hi" ? "एक सुरक्षित पासवर्ड बनाएं" : "Create a secure password"}
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[56px] bg-primary hover:bg-primary-container text-on-primary rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] mt-2"
          >
            <span className="material-symbols-outlined text-2xl">person_add</span>
            <span>
              {isLoading
                ? (language === "hi" ? "खाता बनाया जा रहा है..." : "Creating Account...")
                : (language === "hi" ? "खाता पंजीकृत करें" : "Register Account")}
            </span>
          </button>
        </form>

        <div className="text-center pt-2 text-sm text-on-surface-variant">
          {language === "hi" ? "पहले से खाता है? " : "Already have an account? "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            {language === "hi" ? "यहाँ साइन इन करें" : "Sign In Here"}
          </Link>
        </div>
      </div>
    </div>
  );
}
