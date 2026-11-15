---
name: Warm Clinical Solace
colors:
  surface: '#f6faff'
  surface-dim: '#d2dbe4'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ebf5fe'
  surface-container: '#e6eff8'
  surface-container-high: '#e0e9f2'
  surface-container-highest: '#dae4ed'
  on-surface: '#141d23'
  on-surface-variant: '#3f4944'
  inverse-surface: '#293138'
  inverse-on-surface: '#e9f2fb'
  outline: '#6f7974'
  outline-variant: '#bfc9c2'
  surface-tint: '#1d6a51'
  primary: '#00523c'
  on-primary: '#ffffff'
  primary-container: '#1e6b52'
  on-primary-container: '#9ee9c9'
  inverse-primary: '#8cd5b7'
  secondary: '#455f87'
  on-secondary: '#ffffff'
  secondary-container: '#b5d0fd'
  on-secondary-container: '#3e5980'
  tertiary: '#6e3900'
  on-tertiary: '#ffffff'
  tertiary-container: '#914d00'
  on-tertiary-container: '#ffd0ad'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a7f2d2'
  primary-fixed-dim: '#8cd5b7'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#00513b'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#adc8f5'
  on-secondary-fixed: '#001c3b'
  on-secondary-fixed-variant: '#2d486d'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f6faff'
  on-background: '#141d23'
  surface-variant: '#dae4ed'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 34px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1.25rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is engineered for dual-generation usability: elderly individuals managing daily medication regimens, and adult caretakers monitoring care remotely. The emotional tone must evoke safety, warmth, patience, and absolute clinical clarity. It avoids sterile white-coat intimidation and the patronizing aesthetics often found in simplified interfaces.

The visual style blends **Modern Humanist Healthcare** with **Tactile Warmth**:
- Generous touch targets (minimum 48px to 56px) accommodating hand tremors and diminished dexterity.
- High-contrast visual cues paired with gentle, welcoming surfaces to prevent visual fatigue.
- Reassuring tactile feedback through soft container tiers, gentle borders, and pill-shaped interactive anchors.
- Uncompromising clarity: every critical data point (dosage, timing, status) communicates through multiple redundant signifiers (color, text label, and geometric iconography).

## Colors

The color architecture is built strictly on WCAG AAA standards for text legibility against soft, light backdrops.

- **Primary (`#1E6B52` - Deep Sage):** Evokes vitality, restorative care, and calm reassurance. Used for primary CTAs ("Mark as Taken"), active states, and routine schedule milestones.
- **Secondary (`#1E3A5F` - Trust Navy):** Provides clinical authority and diagnostic weight. Used for verified prescription headers, doctor's notes, caretaker synchronizations, and institutional validation.
- **Tertiary / Warning (`#D97706` - Warm Amber):** Denotes upcoming scheduled doses (within 30 minutes), refill reminders, and attention flags without inducing panic.
- **Critical Alert (`#DC2626` - Soft Rose/Crimson):** Reserved strictly for missed doses, critical contraindications, and urgent caregiver escalation. Must always be accompanied by high-contrast white or deep slate typography and distinct non-color iconography.
- **Surfaces & Neutrals (`#2B343B` - Deep Warm Slate):** Body text defaults to this deep warm slate rather than pure black to reduce harsh glare on older corneas while retaining 11:1+ contrast against the warm off-white canvas (`#FBFBF9`) and card containers (`#FFFFFF`).

## Typography

The platform utilizes **Plus Jakarta Sans** across all typographic tiers for its friendly aperture, distinct letterforms (e.g., differentiating capital `I`, lowercase `l`, and digit `1`), and generous x-height.

- **Senior-Optimized Base Size:** Default body text is anchored at `18px` (`body-lg`) with an expansive line height of `28px` to guarantee effortless line tracking. Sub-16px text is strictly limited to non-critical auxiliary metadata (`label-sm`).
- **Headings & Wayfinding:** Headings prioritize immediate comprehension. Key information—such as medication names and intake times—employs semi-bold (`600`) or bold (`700`) weights with increased line height to avoid overlapping descenders/ascenders.
- **Accessibility Scalability:** When the user enables the built-in "Large Text" accessibility mode, all font dimensions scale up by a factor of 1.25x across the application, with cards and containers adapting their vertical geometry automatically.

## Layout & Spacing

The layout system prioritizes spatial breathing room and uncluttered visual paths, reducing cognitive overload for patients and stressed caregivers alike.

- **Grid Architecture:** Desktop and tablet layouts rely on a centered, fixed-width content container (max-width `1120px`) across an 8-column layout to prevent over-extended eye scans. Mobile screens employ a 4-column fluid layout with generous `1.25rem` outer margins.
- **Touch-First Spatial Buffers:** Interactive targets (dose completion checkboxes, profile cards, voice prompts) require a minimum tap area of `56px × 56px` with an enforced spatial gap of `space-md` (`1.25rem`) between adjacent touch targets to eliminate accidental taps.
- **Card-Centric Vertical Rhythm:** Content is organized into self-contained stacked modules separated by `space-lg` (`1.75rem`). Sections transition smoothly between daily routines (Morning, Afternoon, Evening, Night) with prominent structural dividing headers.

## Elevation & Depth

This design system utilizes **Tonal Layering paired with Gentle Ambient Warm Shadows** to communicate tactile affordability and natural order.

- **Canvas Tier:** Soft off-white base (`#FBFBF9`), grounding the screen with warmth and zero glare.
- **Surface Level 1 (Resting Cards):** Solid pure white (`#FFFFFF`) with a subtle 1px border (`#E5E7EB` with a touch of warm amber tint: `rgba(229, 227, 222, 0.9)`) and an ultra-soft, warm ambient shadow: `box-shadow: 0 4px 16px -2px rgba(43, 52, 59, 0.05), 0 2px 6px -1px rgba(43, 52, 59, 0.03)`.
- **Surface Level 2 (Upcoming / Active Interaction):** Highlighted cards elevate slightly on hover or active time windows: `box-shadow: 0 8px 24px -4px rgba(30, 107, 82, 0.12), 0 4px 12px -2px rgba(43, 52, 59, 0.04)`.
- **Surface Level 3 (Dialogs, Dose Confirmation Modals, Drawers):** High-focus floating surfaces feature a deep calming scrim (`rgba(30, 58, 95, 0.4)`) and pronounced shadow: `box-shadow: 0 20px 32px -8px rgba(30, 58, 95, 0.18)`.

## Shapes

The shape system employs roundedness level **2** (`0.5rem` / 8px baseline, scaling to `1rem` / 16px on medium components and `1.5rem` / 24px on prominent containers).

- **Medication Cards:** Feature uniform `16px` corner rounding (`rounded-lg`), creating friendly, organic boundaries that soften the technical nature of medical data.
- **Pill Badges & Status Tags:** Implement fully rounded circular capsules (`9999px` or pill radius), reinforcing physical pill forms and making status labels instantly distinguishable from square-ish content blocks.
- **Action Buttons & Inputs:** Styled with `12px` to `16px` radii, offering comfortable tactile guidance under thumb or finger taps without dissolving into slippery hyper-ellipses.

## Components

### 1. Medication Routine Cards
- **Structure:** Encased in a `16px` radius white container with high-contrast text and a left-aligned visual color badge corresponding to medication type or intake urgency.
- **Content Flow:** Displays a pill-shape SVG silhouette (capsule, round tablet, liquid drop, inhaler) on the left, followed by the brand and generic drug name (`headline-sm`), explicit dosage (e.g., "1 Tablet with breakfast" in `body-lg`), and intake time in an amber or sage pill tag.
- **Action Area:** Features a wide, high-contrast action button: "Mark as Taken" using the primary sage green (`#1E6B52`) with white bold text, transitioning to a checked neutral state ("Taken at 8:05 AM") upon confirmation.

### 2. Buttons
- **Primary Button:** Minimum height `56px`. Solid Sage Green background (`#1E6B52`), white `label-lg` text, `12px` border radius. 
- **Urgent Action Button:** For missed doses or emergency contact, uses Soft Rose (`#DC2626`) with white text.
- **Secondary Button:** Outlined with a 2px `#1E3A5F` border and deep navy text on transparent or white backgrounds.
- **Touch Target Rule:** Enforces an absolute minimum click target size of `56px × 56px`, even if visual icon boundaries are smaller.

### 3. Pill Status Tags & Time Badges
- **Form:** Pill-shaped capsules (`height: 36px`, `padding: 0 16px`, `radius: 9999px`).
- **Variants:**
  - *Upcoming:* Warm amber fill (`#FEF3C7`), text and border `#92400E`.
  - *Completed:* Light sage fill (`#E6F4EA`), text `#1E6B52`.
  - *Missed:* Light rose fill (`#FEE2E2`), text `#B91C1C`.
  - *Caretaker Sync:* Soft periwinkle fill (`#E0E7FF`), text `#1E3A5F`, featuring a pulsing presence indicator dot.

### 4. Accessibility Control Bar
- Anchored persistently at the top-right header or bottom navigation sheet.
- Contains three persistent one-touch switches:
  - **Text Size Toggle (`A-` / `A+`):** Increases base scaling across the entire interface.
  - **High Contrast Toggle:** Switches off subtle shadows and shifts warm off-white surfaces to stark black/white outlines.
  - **Audio Readout Button:** Accompanied by a clear speaker icon, reading the selected card's contents aloud at a measured, articulate pace.

### 5. Caretaker Sync Presence Indicator
- Displays a pill component showcasing the active caretaker's avatar, connection status, and last checked timestamp (e.g., "Daughter Sarah checked in 12m ago").
- Incorporates a calm, rhythmic pulsing green status ring to reassure the elderly user that they are continuously monitored and supported.

### 6. Input Fields & Selectors
- Extra-large input fields (`56px` height) with thick `2px` focus borders in `#1E6B52`.
- Floating or fixed high-contrast labels in `16px` bold text that never disappear or shrink below legibility thresholds during input.
- Clear, distinct helper text placed directly beneath input boundaries.