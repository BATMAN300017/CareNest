# CareNest – Telephony & Notification Engine Architecture

## 1. Provider-Independent Architecture & Hexagonal Ports

CareNest isolates all third-party telecom and email dependencies behind clean, swappable interfaces in `src/modules/notifications/interfaces/`:

```typescript
// INotificationProvider
export interface INotificationProvider {
  readonly channel: NotificationChannel;
  send(options: NotificationSendOptions): Promise<NotificationSendResult>;
}

// IVoiceCallProvider
export interface IVoiceCallProvider {
  initiateCall(options: VoiceCallOptions): Promise<VoiceCallResult>;
}

// ISmsProvider
export interface ISmsProvider {
  sendSms(options: SmsOptions): Promise<SmsSendResult>;
}

// IEmailProvider
export interface IEmailProvider {
  sendEmail(options: EmailOptions): Promise<EmailSendResult>;
}
```

### Supported Providers:
1. **Twilio Voice (`TwilioVoiceProvider`)**: Initiates outbound automated phone calls, supplies webhook and status-callback URLs, tracks `CallSid`.
2. **Twilio SMS (`TwilioSmsProvider`)**: Sends medication alerts, appointment reminders, and missed-dose escalation SMS notifications.
3. **Resend Email (`ResendEmailProvider`)**: Delivers HTML/plain-text reminders, daily schedules, and caregiver escalation notices.
4. **In-App Provider (`InAppNotificationProvider`)**: Stores notifications in PostgreSQL and creates `NotificationAttempt` records for the real-time dashboard.
5. **Mock Providers (`MockVoiceProvider`, `MockSmsProvider`, `MockEmailProvider`)**: Used for automated testing and local development when live third-party API credentials are not set.

---

## 2. Interactive Voice Response (IVR) State Machine & TwiML Builder

When an automated call is answered by an elderly patient, Twilio executes our webhook:

```
[DoseScheduler / Worker]
         │
         ▼
[Check Quiet Hours & Overlapping Calls]
         │ (Clear)
         ▼
[TelephonyService.initiateMedicationReminderCall]
         │
         ▼
[Twilio Voice Webhook: POST /api/v1/telephony/voice/remind]
         │
         ▼
[Accessible TwiML with Amazon Polly Joanna TTS]
         │
         ▼
[Gather DTMF Keypad Input (Digits 1 to 4, numDigits=1, timeout=8s)]
 ├── 1 ("Taken") ──────────► [Atomic DB: DoseStatus = TAKEN, takenAtUtc = Now]
 │                           [Cancel Pending Reminder Notifications]
 │                           [Play: "Thank you! We have recorded that your dose was taken."]
 │
 ├── 2 ("Not Taken") ──────► [Atomic DB: CallOutcome = DOSE_NOT_TAKEN]
 │                           [Play: "Understood. Please consult your caregiver or doctor if you have concerns."]
 │
 ├── 3 ("Snooze 15m") ─────► [Atomic DB: DoseStatus = SNOOZED, snoozedUntilUtc = +15m]
 │                           [Play: "Understood. We will remind you again in 15 minutes."]
 │
 ├── 4 ("Transfer") ───────► [Query Primary Caregiver Phone]
 │                           [TwiML <Dial>: Connect patient directly to caregiver phone]
 │                           [Play: "Connecting you now..."]
 │
 └── [Invalid / Timeout] ──► [Play: "We did not receive your input. A caregiver has been notified."]
                             [Status Callback triggers Tier 2 escalation]
```

### Senior Accessibility Telephony Rules:
- **Amazon Polly Voice**: Configured with `Polly.Joanna` (natural, friendly female voice) and `en-US` language.
- **Pacing Controls**: Pacing is adjustable per patient via `voiceSpeed` (`SLOW` uses `<prosody rate="85%">` with deliberate pauses, `NORMAL` uses standard pacing).
- **Phonetic Pronunciation**: Dosages and medications are spoken clearly with natural pauses between instructions:
  `"Hello Margaret. This is your CareNest medication reminder. It is time for your Metformin 500 milligrams. Instructions: Take with food."`
- **DTMF Keypad Redundancy**: Seniors do not need complex menus; simple single-digit options (1=Taken, 2=Not Taken, 3=Snooze, 4=Caregiver).

---

## 3. Webhook Signature Security

Twilio webhooks are protected with HMAC-SHA1 signature verification in `src/core/security/webhook-verifier.ts`:
- Webhook endpoints inspect `X-Twilio-Signature` and validate the incoming request body and URL using Twilio's cryptographic validator.
- In automated test environments or when `TWILIO_SIGNATURE_BYPASS=true` is set, verification can be cleanly bypassed for integration testing.

---

## 4. Status Callbacks & Call Tracking

Twilio posts asynchronous status callbacks to `POST /api/v1/telephony/voice/status-callback`:
- Supported statuses: `completed`, `busy`, `no-answer`, `failed`, `canceled`.
- Stores `durationSeconds`, `callOutcome`, and `failureReason` in `VoiceCallRecord`.
- If an unanswered or busy call reaches the patient's `maxCallAttempts`, the system marks the attempt failed and activates the escalation workflow.

---

## 5. Multi-Tier Missed-Dose Escalation

CareNest runs a continuous background adherence monitor (`DoseScheduler.detectAndEscalateMissedDoses`):

1. **Grace Period**: 30 minutes from scheduled dose time. Doses remain `DUE_NOW`.
2. **Tier 1 (Automated Voice Call)**:
   - Evaluated 60+ minutes after scheduled dose time.
   - Verifies the patient is not currently in Quiet Hours.
   - Places an automated telephone call to the patient's phone number.
   - If quiet hours are active, falls back to a quiet in-app/SMS alert.
3. **Tier 2 (Caregiver SMS Alert)**:
   - Evaluated 75+ minutes after scheduled dose time (15 minutes after Tier 1).
   - Identifies the primary caregiver or Family Admin in the patient's Care Circle (`receiveEmergencyAlerts=true`).
   - Sends an urgent SMS: `"CareNest Alert: Margaret has not confirmed taking Metformin 500mg (scheduled for 12:00 PM). Please check in with them."`
4. **Tier 3 (Care Circle Broadcast & Permanent Mark)**:
   - Evaluated 90+ minutes after scheduled dose time.
   - Dispatches emergency notifications to all active Care Circle members.
   - Atomically transitions `DoseOccurrence.status` to `MISSED`.

---

## 6. Doctor Appointment Reminders

`AppointmentReminderScheduler.sweepUpcomingAppointmentReminders` scans for upcoming appointments:
- **24-Hour Reminder**: Sweeps appointments 23 to 25 hours in advance. Sends SMS/In-App to patient with appointment location, doctor name, and transportation details (e.g. `"SilverRide Senior Escort"`).
- **2-Hour Reminder**: Sweeps appointments 1 to 2.5 hours in advance with urgent travel and preparation reminders.
- **Duplicate Prevention**: Queries existing notifications for the appointment reference ID and event type before creating duplicates.
- **Cancellation**: When an appointment is cancelled, `NotificationDispatcherService.cancelPendingNotificationsForAppointment` automatically marks all `QUEUED` reminders as `CANCELLED`.

---

## 7. Configuration & Environment Variables

```env
# Twilio Telephony & SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
TWILIO_PHONE_NUMBER=+15551234567

# Resend Email
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=CareNest Reminders <reminders@carenest.health>

# App Base URL (used for Twilio webhooks)
APP_URL=https://app.carenest.health
TWILIO_SIGNATURE_BYPASS=false
```
