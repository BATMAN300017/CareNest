# CareNest – Critical Business Logic & Workflows

## 1. Concurrency Control & Adherence Integrity

In multi-generational healthcare management, multiple actors (patient on a tablet, caretaker on a phone, automated telephony service, and scheduled cron jobs) may interact with the same medication record within seconds of each other. CareNest enforces strict concurrency controls:

1. **Distributed Mutex (Redis Redlock)**:
   - When a confirmation request arrives (via HTTP, Voice, or Twilio Webhook), a distributed lock is acquired on `lock:dose:<dose_occurrence_id>` with a 5000ms TTL.
   - Any concurrent request for the same dose waits or is safely rejected as a duplicate.
2. **Database Row-Level Locking (`SELECT FOR UPDATE`)**:
   - Inside the PostgreSQL transaction, `dose_occurrences` is locked with `FOR UPDATE`.
   - The system checks if `status == 'TAKEN'`. If already taken, the transaction aborts with a graceful response: `"Dose already recorded as taken at <timestamp> by <actor>"`.
3. **Idempotency Keys**:
   - Every mutation accepts an `Idempotency-Key` header. Repeated button presses from senior tremors or network retries are deduplicated at the gateway.

---

## 2. Detailed Workflows (1 through 12)

```mermaid
sequenceDiagram
    autonumber
    actor Senior as Elderly Patient (Tablet)
    actor Family as Family Admin (Sarah)
    participant API as CareNest API Gateway
    participant DB as PostgreSQL
    participant Worker as BullMQ Scheduler
    participant Twilio as Twilio Voice Service

    %% Workflow 1: Family Member Invites Elderly Patient
    Note over Family, API: 1. Family Member Invites Patient / Sets Up Account
    Family->>API: POST /patients (Create Profile: Margaret)
    API->>DB: INSERT INTO patients, care_circle_memberships (Role: FAMILY_ADMIN)
    Family->>API: POST /care-circle/invites (Generate PIN/QR for Margaret's Tablet)
    API->>DB: INSERT INTO invitations (Code: "CN-894215")

    %% Workflow 2: Joining Care Circle
    Note over Senior, API: 2. Tablet Kiosk Activated / Joins Circle
    Senior->>API: POST /care-circle/join (Code: "CN-894215", PIN: "1948")
    API->>DB: Bind device_fingerprint, issue scoped Senior Session

    %% Workflow 3 & 4: Medication Creation & Dose Generation
    Note over Family, Worker: 3 & 4. Medication Schedule Creation & Occurrence Generation
    Family->>API: POST /medications (Metformin 500mg, Daily 13:00)
    API->>DB: INSERT INTO medications, medication_schedules
    API->>Worker: Enqueue "generate-daily-occurrences" (30-day window)
    Worker->>DB: INSERT INTO dose_occurrences (UTC times calculated from patient timezone)

    %% Workflow 5: Upcoming Reminder
    Note over Worker, Senior: 5. Upcoming Reminder Triggered (12:45 PM - 15m lead)
    Worker->>API: Trigger In-App Notification & Tablet Ambient Glow
    API->>Senior: Display "Afternoon Dose: Metformin due at 1:00 PM"

    %% Workflow 6 & 7: Confirmation & Adherence Update
    Note over Senior, Family: 6 & 7. Patient Confirms via Dashboard UI
    Senior->>API: POST /doses/:id/confirm (Idempotency-Key: "uuid")
    API->>DB: BEGIN TRANSACTION (SELECT FOR UPDATE)
    API->>DB: UPDATE dose_occurrences SET status='TAKEN'
    API->>DB: INSERT INTO adherence_records
    API->>DB: UPDATE medication_stock SET current_quantity = current_quantity - 1
    API->>DB: COMMIT TRANSACTION
    API->>Family: WebSocket Broadcast: "Dose logged! Streak: 14 days"
    API->>Senior: Audio Confirmation: "Recorded as taken just now!"
```

### Workflow 8 & 9: Missed Dose Escalation Engine

```mermaid
stateDiagram-v2
    [*] --> Scheduled: Dose Created
    Scheduled --> DueNow: Scheduled Time Reached
    DueNow --> Taken: Confirmed by Senior (UI / Voice / Phone)
    DueNow --> Snoozed: Senior requests 15 min Snooze
    Snoozed --> DueNow: Snooze Timer Expires

    DueNow --> Tier1_Escalation: Grace Period (30m) Expired with No Response
    state Tier1_Escalation {
        [*] --> OutboundCall
        OutboundCall --> KeypadConfirmed: Senior presses 1
        OutboundCall --> CallFailed: Busy / No Answer
    }
    KeypadConfirmed --> Taken
    CallFailed --> Tier2_Escalation: 15m after Tier 1

    state Tier2_Escalation {
        [*] --> NotifyPrimaryCaregiver
        NotifyPrimaryCaregiver --> PushSent: High-Priority Push to Sarah
        NotifyPrimaryCaregiver --> SMSSent: SMS Alert to Sarah
    }
    Tier2_Escalation --> Taken: Caretaker confirms manually
    Tier2_Escalation --> Tier3_Escalation: 30m without acknowledgment

    state Tier3_Escalation {
        [*] --> AlertAllCircleMembers
        AlertAllCircleMembers --> AutomatedVoiceCallToAdmin
    }
    Tier3_Escalation --> Missed: Final status logged if unreachable
```

### Detailed Workflow Step Summaries:
1. **Family Admin Invites Patient**: Adult daughter creates profile for parent; system provisions initial patient sovereignty records.
2. **Joining Care Circle**: Caretaker receives secure 6-character alphanumeric code; joins with granular scope (e.g. nurse can view vitals and mark doses, but cannot edit family notes).
3. **Medication Schedule Creation**: Prescriptions entered with frequency, dosage form, pill visual identifiers, and food constraints.
4. **Scheduled Dose Occurrence Generation**: Rolling cron calculates exact UTC timestamps adjusting for daylight savings in patient's registered timezone.
5. **Upcoming Reminder Dispatch**: 15 minutes before intake, tablet UI transitions card from upcoming to active, softly playing chime if audio readout is enabled.
6. **Confirmation via Dashboard or Keypad**: Senior taps primary 60px "✓ I Have Taken This" button, or answers automated phone reminder and presses DTMF `1`.
7. **Adherence Update**: Atomically updates `dose_occurrences`, creates immutable `adherence_records`, deducts medication stock, and checks if remaining pills are below `refill_threshold`.
8. **Missed Dose Escalation**: If grace period elapses without confirmation, BullMQ worker triggers Tier 1 automated telephone call. If unanswered, escalates to Tier 2 caregiver push notification and SMS.
9. **Family Email Notification**: Daily digest sent at 8:00 PM summarizing adherence score, vitals, and notes; immediate alerts sent on Tier 2 escalation.
10. **Doctor Appointment Advance Reminders**: Automated alerts at 48h, 24h, and 2h prior to visit, verifying transportation escort status (`SilverRide`).
11. **Caretaker Records Observation**: Visiting nurse logs morning vitals and shift handover notes; flags `requires_admin_review` if blood pressure exceeds systolic 140.
12. **Patient Revokes Access**: Elderly patient selects Care Circle member $\rightarrow$ Revoke. All active JWTs for that relationship are revoked in Redis blacklist, and future API requests fail with `403 Forbidden`.
