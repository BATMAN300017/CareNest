"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ELDERLY_PATIENT");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
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
      });
      router.push("/schedule");
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please check your information.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary mx-auto flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-4xl material-symbols-fill">
              nest_eco_leaf
            </span>
          </div>
          <h1 className="font-headline text-3xl font-bold text-primary">CareNest</h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Create your account to get started
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
              Account Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low font-medium"
            >
              <option value="ELDERLY_PATIENT">👵 Senior / Elderly Patient</option>
              <option value="FAMILY_MEMBER">👨‍👩‍👧 Family Member / Care Circle</option>
              <option value="CAREGIVER">🩺 Professional Caregiver / Nurse</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Margaret Jenkins"
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              Email Address *
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
              Primary Phone (for automated reminders)
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
              Password (min. 8 characters) *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[56px] bg-primary hover:bg-primary-container text-on-primary rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] mt-2"
          >
            <span className="material-symbols-outlined text-2xl">person_add</span>
            <span>{isLoading ? "Creating Account..." : "Register Account"}</span>
          </button>
        </form>

        <div className="text-center pt-2 text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
