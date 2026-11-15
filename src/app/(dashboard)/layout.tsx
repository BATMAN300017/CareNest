"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { EmergencySosDialog } from "@/components/layout/emergency-sos-dialog";
import { VoiceAssistantModal } from "@/components/accessibility/voice-assistant-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface flex">
      {/* Desktop Persistent Sidebar */}
      <Sidebar onOpenSos={() => setIsSosOpen(true)} />

      {/* Main App Canvas */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen">
        <Header
          onOpenSos={() => setIsSosOpen(true)}
          onOpenVoiceAssistant={() => setIsVoiceOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Global Modals */}
      <EmergencySosDialog isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} />
      <VoiceAssistantModal isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
    </div>
  );
}
