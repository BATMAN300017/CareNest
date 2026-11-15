import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Deep Sage Brand CTA
        primary: {
          DEFAULT: "#00523C",
          container: "#1E6B52",
          fixed: "#A7F2D2",
          "fixed-dim": "#8CD5B7",
        },
        "primary-container": "#1E6B52",
        "primary-fixed": "#A7F2D2",
        "primary-fixed-dim": "#8CD5B7",
        "on-primary": {
          DEFAULT: "#FFFFFF",
          container: "#9EE9C9",
          fixed: "#002116",
          "fixed-variant": "#00513B",
        },
        "on-primary-container": "#9EE9C9",
        "on-primary-fixed": "#002116",
        "on-primary-fixed-variant": "#00513B",
        "inverse-primary": "#8CD5B7",

        // Secondary - Trust Navy
        secondary: {
          DEFAULT: "#455F87",
          container: "#B5D0FD",
          fixed: "#D5E3FF",
          "fixed-dim": "#ADC8F5",
        },
        "secondary-container": "#B5D0FD",
        "secondary-fixed": "#D5E3FF",
        "secondary-fixed-dim": "#ADC8F5",
        "on-secondary": {
          DEFAULT: "#FFFFFF",
          container: "#3E5980",
          fixed: "#001C3B",
          "fixed-variant": "#2D486D",
        },
        "on-secondary-container": "#3E5980",
        "on-secondary-fixed": "#001C3B",
        "on-secondary-fixed-variant": "#2D486D",

        // Tertiary - Warm Amber Warning & Due Now
        tertiary: {
          DEFAULT: "#6E3900",
          container: "#914D00",
          fixed: "#FFDCC3",
          "fixed-dim": "#FFB77D",
        },
        "tertiary-container": "#914D00",
        "tertiary-fixed": "#FFDCC3",
        "tertiary-fixed-dim": "#FFB77D",
        "on-tertiary": {
          DEFAULT: "#FFFFFF",
          container: "#FFD0AD",
          fixed: "#2F1500",
          "fixed-variant": "#6E3900",
        },
        "on-tertiary-container": "#FFD0AD",
        "on-tertiary-fixed": "#2F1500",
        "on-tertiary-fixed-variant": "#6E3900",

        // Error - Urgent SOS & Alert Red
        error: {
          DEFAULT: "#BA1A1A",
          container: "#FFDAD6",
        },
        "error-container": "#FFDAD6",
        "on-error": {
          DEFAULT: "#FFFFFF",
          container: "#93000A",
        },
        "on-error-container": "#93000A",

        // Surfaces - Tactile Warmth
        surface: {
          DEFAULT: "#F6FAFF",
          dim: "#D2DBE4",
          bright: "#F6FAFF",
          container: "#E6EFF8",
          "container-low": "#EBF5FE",
          "container-lowest": "#FFFFFF",
          "container-high": "#E0E9F2",
          "container-highest": "#DAE4ED",
          variant: "#DAE4ED",
          tint: "#1D6A51",
        },
        "surface-dim": "#D2DBE4",
        "surface-bright": "#F6FAFF",
        "surface-container": "#E6EFF8",
        "surface-container-low": "#EBF5FE",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-high": "#E0E9F2",
        "surface-container-highest": "#DAE4ED",
        "surface-variant": "#DAE4ED",
        "surface-tint": "#1D6A51",
        "inverse-surface": "#293138",
        "inverse-on-surface": "#E9F2FB",

        // Text & Background
        "on-surface": {
          DEFAULT: "#141D23",
          variant: "#3F4944",
        },
        "on-surface-variant": "#3F4944",
        background: "#F6FAFF",
        "on-background": "#141D23",

        // Outlines & Borders
        outline: {
          DEFAULT: "#6F7974",
          variant: "#BFC9C2",
        },
        "outline-variant": "#BFC9C2",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Noto Sans Devanagari", "system-ui", "sans-serif"],
        headline: ["Plus Jakarta Sans", "Noto Sans Devanagari", "sans-serif"],
      },
      fontSize: {
        "headline-xl": ["40px", { lineHeight: "52px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "42px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "34px", fontWeight: "600" }],
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-xl": ["20px", { lineHeight: "32px", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-lg": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "label-md": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "label-sm": ["14px", { lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "600" }],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        "warm-card": "0 4px 16px -2px rgba(43, 52, 59, 0.05), 0 2px 6px -1px rgba(43, 52, 59, 0.03)",
        "warm-active": "0 8px 24px -4px rgba(30, 107, 82, 0.14), 0 4px 12px -2px rgba(43, 52, 59, 0.05)",
        "warm-dialog": "0 20px 32px -8px rgba(30, 58, 95, 0.18)",
      },
      minHeight: {
        touch: "56px",
      },
      minWidth: {
        touch: "56px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
