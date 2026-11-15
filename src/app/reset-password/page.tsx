"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { getErrorMessage } from "@/core/errors/error-utils";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post("/api/v1/auth/reset-password", {
        token,
        newPassword: password,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to reset password. The link may have expired."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 warm-card-shadow p-6 sm:p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
          Set New Password
        </h1>
        <p className="text-sm text-on-surface-variant">
          Enter your new secure password below
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-error-container text-on-error-container rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      {isSuccess ? (
        <div className="bg-primary-fixed/40 border border-primary/30 rounded-xl p-5 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-primary material-symbols-fill">
            check_circle
          </span>
          <h2 className="font-bold text-lg text-primary">Password Successfully Updated</h2>
          <p className="text-sm text-on-surface-variant">
            You can now sign in to CareNest using your new password.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              New Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full min-h-[52px] px-4 rounded-xl border-2 border-outline-variant focus:border-primary text-base bg-surface-container-low"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[56px] bg-primary hover:bg-primary-container text-on-primary rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <span>{isSubmitting ? "Updating..." : "Update Password"}</span>
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <Suspense
        fallback={
          <div className="p-8 text-center text-on-surface-variant">
            Loading reset form...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
