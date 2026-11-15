// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HeroProgress } from "@/components/schedule/hero-progress";
import { ConfirmDoseDialog } from "@/components/schedule/confirm-dose-dialog";
import { SkipDoseDialog } from "@/components/schedule/skip-dose-dialog";
import { SnoozeDoseDialog } from "@/components/schedule/snooze-dose-dialog";
import { EmergencySosDialog } from "@/components/layout/emergency-sos-dialog";
import { AccessibilityProvider, useAccessibility } from "@/context/accessibility-context";
import { AuthProvider } from "@/context/auth-context";
import { LanguageProvider } from "@/context/language-context";

const storageMock: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storageMock[key] || null,
  setItem: (key: string, value: string) => {
    storageMock[key] = String(value);
  },
  removeItem: (key: string) => {
    delete storageMock[key];
  },
  clear: () => {
    Object.keys(storageMock).forEach((k) => delete storageMock[k]);
  },
};
Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

// Test wrapper with context providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <AccessibilityProvider>
      <AuthProvider>{children}</AuthProvider>
    </AccessibilityProvider>
  </LanguageProvider>
);

describe("CareNest Frontend Components & Accessibility Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe("HeroProgress Component", () => {
    it("renders progress ratio, on-track badge, and encouragement note", () => {
      const openVoiceMock = vi.fn();
      render(
        <TestWrapper>
          <HeroProgress
            completedCount={3}
            totalCount={5}
            onOpenVoice={openVoiceMock}
          />
        </TestWrapper>
      );

      expect(screen.getByText("3 / 5")).toBeDefined();
      expect(screen.getByText("On Track Today")).toBeDefined();
      expect(
        screen.getByText("You have 3 out of 5 medications completed today.")
      ).toBeDefined();

      const voiceBtn = screen.getByText(/Voice Assistant Active/i);
      fireEvent.click(voiceBtn);
      expect(openVoiceMock).toHaveBeenCalledTimes(1);
    });

    it("displays 100% completion celebration message when all doses taken", () => {
      render(
        <TestWrapper>
          <HeroProgress
            completedCount={5}
            totalCount={5}
            onOpenVoice={vi.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText("5 / 5")).toBeDefined();
      expect(
        screen.getByText(/All scheduled medications for today are confirmed taken/i)
      ).toBeDefined();
    });
  });

  describe("ConfirmDoseDialog Component", () => {
    const mockDose = {
      id: "dose_123",
      medicationName: "Metformin",
      strength: "500mg",
      scheduledTime: "1:00 PM",
      instructions: "Take with warm meal and 8 oz water",
    };

    it("renders dose info and handles confirmation submission", async () => {
      const successMock = vi.fn();
      const closeMock = vi.fn();

      render(
        <TestWrapper>
          <ConfirmDoseDialog
            isOpen={true}
            onClose={closeMock}
            dose={mockDose}
            onSuccess={successMock}
          />
        </TestWrapper>
      );

      expect(screen.getByText("Confirm Medication Dose")).toBeDefined();
      expect(screen.getByText("Metformin 500mg")).toBeDefined();

      const confirmBtn = screen.getByText("✓ Confirm Dose Taken");
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(successMock).toHaveBeenCalledTimes(1);
        expect(closeMock).toHaveBeenCalledTimes(1);
      });
    });

    it("does not render when isOpen is false", () => {
      const { container } = render(
        <TestWrapper>
          <ConfirmDoseDialog
            isOpen={false}
            onClose={vi.fn()}
            dose={mockDose}
            onSuccess={vi.fn()}
          />
        </TestWrapper>
      );

      expect(container.innerHTML).toBe("");
    });
  });

  describe("SkipDoseDialog Component", () => {
    const mockDose = {
      id: "dose_456",
      medicationName: "Lisinopril",
      strength: "10mg",
      scheduledTime: "8:00 AM",
    };

    it("requires clinical reason and submits skip record", async () => {
      const successMock = vi.fn();
      const closeMock = vi.fn();

      render(
        <TestWrapper>
          <SkipDoseDialog
            isOpen={true}
            onClose={closeMock}
            dose={mockDose}
            onSuccess={successMock}
          />
        </TestWrapper>
      );

      expect(screen.getByText("Record Skipped Dose")).toBeDefined();
      expect(
        screen.getByText("Physician advised holding dose until evening")
      ).toBeDefined();

      const skipBtn = screen.getByText("Record Dose as Skipped");
      fireEvent.click(skipBtn);

      await waitFor(() => {
        expect(successMock).toHaveBeenCalledTimes(1);
        expect(closeMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("SnoozeDoseDialog Component", () => {
    const mockDose = {
      id: "dose_789",
      medicationName: "Melatonin",
      strength: "3mg",
    };

    it("supports 15, 30, and 60-minute snooze intervals", async () => {
      const successMock = vi.fn();
      const closeMock = vi.fn();

      render(
        <TestWrapper>
          <SnoozeDoseDialog
            isOpen={true}
            onClose={closeMock}
            dose={mockDose}
            onSuccess={successMock}
          />
        </TestWrapper>
      );

      expect(screen.getByText("Snooze Reminder")).toBeDefined();

      // Click 30 min button
      const btn30 = screen.getByText("30 min");
      fireEvent.click(btn30);

      const snoozeActionBtn = screen.getByText("Remind in 30 Minutes");
      expect(snoozeActionBtn).toBeDefined();

      fireEvent.click(snoozeActionBtn);
      await waitFor(() => {
        expect(successMock).toHaveBeenCalledTimes(1);
        expect(closeMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("EmergencySosDialog Component", () => {
    it("renders primary caregiver phone call and 911 emergency dial options", () => {
      render(
        <TestWrapper>
          <EmergencySosDialog isOpen={true} onClose={vi.fn()} />
        </TestWrapper>
      );

      expect(screen.getByText("Emergency Assistance")).toBeDefined();
      expect(screen.getByText("Call Sarah (Daughter)")).toBeDefined();
      expect(screen.getByText("Call 911 Emergency")).toBeDefined();
      expect(
        screen.getByText(/Emergency Medical Summary for First Responders/i)
      ).toBeDefined();
    });
  });

  describe("Accessibility Context & Mode Toggles", () => {
    function AccessibilityInspector() {
      const {
        textSize,
        increaseTextSize,
        decreaseTextSize,
        highContrast,
        toggleHighContrast,
      } = useAccessibility();

      return (
        <div>
          <span data-testid="text-size">{textSize}</span>
          <span data-testid="contrast">{highContrast ? "HIGH" : "NORMAL"}</span>
          <button onClick={increaseTextSize}>A+</button>
          <button onClick={decreaseTextSize}>A-</button>
          <button onClick={toggleHighContrast}>Toggle Contrast</button>
        </div>
      );
    }

    it("cycles text scaling across normal -> large -> xlarge and updates document classes", () => {
      render(
        <TestWrapper>
          <AccessibilityInspector />
        </TestWrapper>
      );

      const sizeSpan = screen.getByTestId("text-size");
      expect(sizeSpan.textContent).toBe("normal");

      fireEvent.click(screen.getByText("A+"));
      expect(sizeSpan.textContent).toBe("large");

      fireEvent.click(screen.getByText("A+"));
      expect(sizeSpan.textContent).toBe("xlarge");

      fireEvent.click(screen.getByText("A-"));
      expect(sizeSpan.textContent).toBe("large");
    });

    it("toggles high contrast mode and updates localStorage", () => {
      render(
        <TestWrapper>
          <AccessibilityInspector />
        </TestWrapper>
      );

      const contrastSpan = screen.getByTestId("contrast");
      expect(contrastSpan.textContent).toBe("NORMAL");

      fireEvent.click(screen.getByText("Toggle Contrast"));
      expect(contrastSpan.textContent).toBe("HIGH");
      expect(localStorage.getItem("carenest_high_contrast")).toBe("true");

      fireEvent.click(screen.getByText("Toggle Contrast"));
      expect(contrastSpan.textContent).toBe("NORMAL");
      expect(localStorage.getItem("carenest_high_contrast")).toBe("false");
    });
  });
});
