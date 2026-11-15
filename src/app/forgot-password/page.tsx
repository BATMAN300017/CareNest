"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.post("/api/v1/auth/forgot-password", { email });
      setIsSent(true);
    } catch (err: any) {
      // Show sent state for security / client peace of mind
      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-secondary-fixed text-secondary mx-auto flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-4xl material-symbols-fill">
              lock_reset
            </span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
            Reset Password
          </h1>
          <p className="text-sm text-on-surface-variant">
            Enter your registered email address and we will send you secure recovery instructions.
          </p>
        </div>

        {isSent ? (
          <div className="bg-primary-fixed/40 border border-primary/30 rounded-xl p-5 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-primary material-symbols-fill">
              mark_email_read
            </span>
            <h2 className="font-bold text-lg text-primary">Recovery Email Dispatched</h2>
            <p className="text-sm text-on-surface-variant">
              If an account exists for <strong>{email}</strong>, password reset instructions have
              been sent.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-1">
                Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. margaret@example.com"
                className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-secondary text-base bg-surface-container-low"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[56px] bg-secondary hover:bg-on-secondary-fixed-variant text-on-secondary rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <span>{isSubmitting ? "Sending..." : "Send Reset Link"}</span>
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-sm font-bold text-secondary hover:underline">
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
