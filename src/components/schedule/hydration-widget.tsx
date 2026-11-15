"use client";

import React, { useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

interface HydrationWidgetProps {
  initialCount?: number;
}

export function HydrationWidget({ initialCount = 4 }: HydrationWidgetProps) {
  const { activePatientId } = useAuth();
  const [glasses, setGlasses] = useState(initialCount);
  const [isLogging, setIsLogging] = useState(false);

  const targetGlasses = 6;

  const handleLogGlass = async () => {
    setIsLogging(true);
    const newCount = glasses + 1;
    setGlasses(newCount);

    try {
      await api.post(`/api/v1/patients/${activePatientId}/vitals`, {
        vitalType: "HYDRATION",
        glassesCount: 1,
      });
    } catch (e: any) {
      console.warn("Hydration log note:", e?.message);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-on-surface-variant">
            Hydration Tracker
          </span>
          <span className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-xl">water_drop</span>
          </span>
        </div>
        <div className="font-headline text-2xl font-bold text-on-surface">
          {glasses} of {targetGlasses}{" "}
          <span className="text-sm font-normal text-on-surface-variant">Glasses</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-on-surface-variant font-medium">
          Target: 48 fl oz
        </span>
        <button
          onClick={handleLogGlass}
          disabled={isLogging}
          aria-label="Log one glass of water"
          className="min-h-[44px] px-4 py-1.5 rounded-xl bg-secondary text-on-secondary hover:bg-secondary/90 active:scale-[0.98] font-bold text-sm flex items-center gap-1 shadow-sm transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>Log Glass</span>
        </button>
      </div>
    </div>
  );
}
