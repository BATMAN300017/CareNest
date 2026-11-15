"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getErrorMessage } from "@/core/errors/error-utils";

export default function LoginPage() {
  const router = useRouter();
  const { login, setDemoUser, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.push("/schedule");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Invalid email or password. Please try again."));
    }
  };

  const handleQuickDemo = (role: "PATIENT" | "CAREGIVER" | "DOCTOR") => {
    setDemoUser(role);
    router.push("/schedule");
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
            Senior Care &amp; Medication Management Platform
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-error-container text-on-error-container rounded-xl text-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              Email Address
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-bold text-on-surface">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full min-h-[52px] px-4 pr-12 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[56px] bg-primary hover:bg-primary-container text-on-primary rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-2xl">login</span>
            <span>{isLoading ? "Signing in..." : "Sign In to CareNest"}</span>
          </button>
        </form>

        {/* Quick Demo Access Bar */}
        <div className="border-t border-outline-variant/30 pt-4 space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            ⚡ Quick Demo Sign-in for Reviewers:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("PATIENT")}
              className="py-2 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors"
            >
              👵 Margaret (Patient)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("CAREGIVER")}
              className="py-2 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors"
            >
              👩 Sarah (Caregiver)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("DOCTOR")}
              className="py-2 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors"
            >
              👨‍⚕️ Dr. Chen (Physician)
            </button>
          </div>
        </div>

        {/* Register Footer */}
        <div className="text-center pt-2 text-sm text-on-surface-variant">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="font-bold text-primary hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
