# CareNest – Elderly Care & Medication Management Platform

> **A smart, interconnected, dual-generation elderly healthcare platform placing the patient at the center of all decisions.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-black)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748)](https://www.prisma.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Redis-CC0000)](https://bullmq.io/)
[![Twilio](https://img.shields.io/badge/Twilio-Voice%20%26%20SMS-F22F46)](https://www.twilio.com/)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%20AAA-success)](#)

---

## 1. Executive Summary

**CareNest** bridges the digital generational divide by providing:
1. **For Elderly Patients**: An empowering, calm, high-contrast, large-touch-target interface (56px+ targets, WCAG AAA compliance, audio readouts, voice navigation, and direct 1-click caretaker/emergency calling) that respects their dignity and independence.
2. **For Family Administrators**: Complete real-time transparency over medication adherence, vital trends, appointment escorts, and daily notes without intrusive micromanagement.
3. **For Caretakers & Nurses**: Clear shift handover logs, verified medication administration routines, and clinical observations.
4. **For Healthcare Professionals**: Structured consultation summaries, clinical contraindication warnings, and verified adherence metrics.

---

## 2. Design System & Visual Tokens (from UI Reference)

CareNest adheres strictly to the design system established in `ui_reference/DESIGN.md`:

- **Brand**: CareNest
- **Typography**: Plus Jakarta Sans (`headline-xl`: 40px/52px, `headline-lg`: 32px/42px, `body-xl`: 20px/32px, `body-lg`: 18px/28px)
- **Primary Color**: `#00523C` (Deep Sage, Container: `#1E6B52`, Text: `#FFFFFF`)
- **Secondary Color**: `#455F87` (Trust Navy, Container: `#B5D0FD`)
- **Surface Canvas**: `#F6FAFF` (Warm Off-White/Soft Sky)
- **Primary Card Surfaces**: `#FFFFFF` with warm ambient elevation (`box-shadow: 0 4px 16px -2px rgba(43, 52, 59, 0.05)`)
- **Warning / Due Now**: `#D97706` (Warm Amber, Container: `#FEF3C7`)
- **Critical Alert / SOS**: `#DC2626` (Soft Rose / Crimson, Container: `#FFDAD6`)
- **Touch Target Floor**: Enforced minimum $56\text{px} \times 56\text{px}$ for all primary buttons and interactive elements.
- **Accessibility Modes**: One-click Text Sizing toggle (`A- / A+`, scaling up to 1.25x), High Contrast mode, and Web Speech API Audio Readout.

---

## 3. Architecture Blueprint & Documentation Index

Comprehensive engineering documents are located in [`/docs`](./docs):

- **[System Architecture (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)**: High-level C4 container diagrams, domain boundaries, tech stack rationale, and failure isolation.
- **[Database Schema & ERD (`docs/DATABASE_SCHEMA.md`)](./docs/DATABASE_SCHEMA.md)**: Complete PostgreSQL relational schema, Prisma models, foreign keys, composite indexes, constraints, and timezone handling.
- **[API Specification (`docs/API_SPECIFICATION.md`)](./docs/API_SPECIFICATION.md)**: RESTful API contracts, request/response envelopes, authentication, and RBAC guards.
- **[Roles & Permissions (`docs/ROLES_PERMISSIONS.md`)](./docs/ROLES_PERMISSIONS.md)**: User personas, granular authorization matrix, patient consent rules, and break-glass emergency protocols.
- **[Critical Workflows & Concurrency (`docs/WORKFLOWS_AND_STATE_MACHINES.md`)](./docs/WORKFLOWS_AND_STATE_MACHINES.md)**: Sequence diagrams for 12 core workflows, distributed locking (Redlock), and missed-dose escalation state machines.
- **[Telephony & Notifications (`docs/TELEPHONY_AND_NOTIFICATIONS.md`)](./docs/TELEPHONY_AND_NOTIFICATIONS.md)**: Twilio TwiML IVR state machine, DTMF keypad handlers, BullMQ worker architecture, retry backoff, and quiet hours.
- **[Security & Privacy (`docs/SECURITY_COMPLIANCE.md`)](./docs/SECURITY_COMPLIANCE.md)**: HIPAA/GDPR compliance, AES-256 field encryption for PHI, rate limiting, and immutable audit logging.
- **[Phased Implementation Plan (`docs/PHASED_IMPLEMENTATION_PLAN.md`)](./docs/PHASED_IMPLEMENTATION_PLAN.md)**: 10-phase engineering roadmap with dependencies, deliverables, and acceptance criteria.
- **[UI Reference Artifacts (`ui_reference/`)](./ui_reference)**: `code.html`, `DESIGN.md`, and `screen.png`.

---

## 4. Repository Structure Overview

```
carenest/
├── docs/                                 # Architectural blueprints & specifications
│   ├── ARCHITECTURE.md                   # System design & Mermaid diagrams
│   ├── DATABASE_SCHEMA.md                # Relational schema & Prisma models
│   ├── API_SPECIFICATION.md              # RESTful API contracts & payload schemas
│   ├── ROLES_PERMISSIONS.md              # RBAC & Patient Consent Matrix
│   ├── WORKFLOWS_AND_STATE_MACHINES.md   # Concurrency, state machines, 12 flows
│   ├── TELEPHONY_AND_NOTIFICATIONS.md    # Twilio IVR & BullMQ queue architecture
│   ├── SECURITY_COMPLIANCE.md            # HIPAA/GDPR, encryption, audit trails
│   └── PHASED_IMPLEMENTATION_PLAN.md     # 10-phase engineering roadmap
├── ui_reference/                         # Canonical UI Design Reference
│   ├── code.html                         # Reference HTML + Tailwind markup
│   ├── DESIGN.md                         # Color tokens, typography, component specs
│   └── screen.png                        # Visual reference screenshot
├── prisma/                               # Database schema & migrations
│   └── schema.prisma                     # Complete multi-tenant Prisma schema
├── src/                                  # Application Source Code
│   ├── app/                              # Next.js 14+ App Router
│   ├── core/                             # Shared domain interfaces & errors
│   ├── modules/                          # Bounded domain contexts
│   │   ├── auth/                         # Authentication & Sessions
│   │   ├── patients/                     # Patient profile & consents
│   │   ├── medications/                  # Medication registry & stock
│   │   ├── adherence/                    # Dose occurrence state machine
│   │   ├── care-circle/                  # Collaboration & family notes
│   │   ├── appointments/                 # Clinician visits & ride escorts
│   │   ├── vitals/                       # Blood pressure, glucose, hydration
│   │   ├── telephony/                    # Twilio IVR & DTMF handlers
│   │   ├── notifications/                # Multi-channel dispatcher & templates
│   │   ├── voice/                        # Web Speech & Gemini AI assistant
│   │   ├── emergency/                    # Emergency SOS & contact cascade
│   │   └── reporting/                    # Clinical export PDF & analytics
│   ├── adapters/                         # External provider integrations (Twilio, Resend, S3)
│   ├── jobs/                             # BullMQ background workers & schedulers
│   ├── components/                       # Shared design system components (56px targets)
│   ├── hooks/                            # Accessibility & query hooks
│   └── styles/                           # Design tokens & Tailwind CSS
├── tests/                                # Test suites (Unit, Integration, E2E)
└── README.md                             # Project index & technical overview
```

---

## 5. Technology Stack Summary

- **Frontend**: Next.js 14+ App Router, React 18/19, TypeScript, Tailwind CSS, TanStack Query v5, Zustand.
- **Backend & APIs**: Next.js Route Handlers / Modular Services, Zod validation, Argon2id, JWT.
- **Database**: PostgreSQL 16, Prisma ORM.
- **Queues & Jobs**: Redis 7.2, BullMQ.
- **Telephony & SMS**: Twilio Voice (TwiML IVR + DTMF keypad), Twilio Messaging.
- **Email**: Resend / SendGrid with React Email.
- **AI & Voice**: Web Speech API (Synthesis & Recognition) + Google Gemini Flash API.
- **Testing**: Vitest, React Testing Library, Playwright for cross-device E2E.
