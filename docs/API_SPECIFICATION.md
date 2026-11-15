# CareNest – RESTful API & Service Contract Specification

All endpoints are prefixed with `/api/v1`. All requests returning medical or patient information require an `Authorization: Bearer <JWT>` header and enforce **Patient Consent & RBAC Middleware**.

Standard Error Response Envelope:
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "User does not hold active consent for patient medication management.",
    "details": null,
    "timestamp": "2026-11-15T14:30:00.000Z",
    "correlation_id": "req_88f01b92"
  }
}
```

Standard Success Response Envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-15T14:30:00.000Z",
    "correlation_id": "req_88f01b92"
  }
}
```

---

## 1. Authentication & Session Module (`/api/v1/auth`)

### 1.1 Register User
- **Method / URL**: `POST /api/v1/auth/register`
- **Purpose**: Creates a new user account (Family Admin, Family Member, Caretaker, or Patient).
- **Authentication**: None (Public).
- **Permissions**: Public.
- **Request Body**:
  ```json
  {
    "email": "sarah.jenkins@example.com",
    "phone_number": "+15552345678",
    "password": "SecurePassword123!",
    "full_name": "Sarah Jenkins",
    "system_role": "FAMILY_ADMIN"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "user": { "id": "usr_uuid", "email": "sarah.jenkins@example.com", "full_name": "Sarah Jenkins" },
    "token": "jwt_token_string",
    "refresh_token": "refresh_token_string"
  }
  ```

### 1.2 Login with Password
- **Method / URL**: `POST /api/v1/auth/login`
- **Purpose**: Authenticates user via email/phone and password.
- **Request Body**: `{ "identifier": "sarah.jenkins@example.com", "password": "SecurePassword123!" }`
- **Response**: `200 OK` with JWT, user profile, and associated Care Circle patients.
- **Protection**: IP & account rate-limiting with 5-attempt brute-force lockout (15 minutes).

### 1.3 Logout / Session Invalidation
- **Method / URL**: `POST /api/v1/auth/logout`
- **Purpose**: Revokes current JWT session token by persisting its SHA-256 hash in `RevokedToken` table.
- **Authentication**: Bearer Token.
- **Response**: `200 OK`
  ```json
  { "success": true, "data": { "message": "Logged out successfully" } }
  ```

### 1.4 Request Password Recovery (Forgot Password)
- **Method / URL**: `POST /api/v1/auth/forgot-password`
- **Purpose**: Generates a single-use 32-byte hex reset token (stored as SHA-256 hash) with 1-hour expiration.
- **Authentication**: Public (Rate-limited to 3 requests per 15 minutes).
- **Anti-Enumeration**: Returns identical generic success response whether account exists or not.
- **Request Body**: `{ "identifier": "user@example.com" }`
- **Response**: `200 OK`
  ```json
  { "success": true, "data": { "message": "If an account matches that identifier, password reset instructions have been issued." } }
  ```

### 1.5 Reset Password
- **Method / URL**: `POST /api/v1/auth/reset-password`
- **Purpose**: Verifies recovery token hash, updates user password hash, invalidates token (`usedAt`), and resets lockout counters.
- **Authentication**: Public.
- **Request Body**: `{ "token": "4a7b...", "new_password": "NewStrongPassword456!" }`
- **Response**: `200 OK`
  ```json
  { "success": true, "data": { "message": "Password has been successfully reset. Please log in with your new password." } }
  ```

### 1.6 Refresh Access Token
- **Method / URL**: `POST /api/v1/auth/refresh`
- **Purpose**: Exchanges a valid refresh token for a newly issued access token.
- **Request Body**: `{ "refresh_token": "valid_refresh_token" }`
- **Response**: `200 OK` with newly generated JWT access token.

### 1.7 Senior Tablet Quick PIN Unlock
- **Method / URL**: `POST /api/v1/auth/tablet-unlock`
- **Purpose**: Allows an elderly patient on a bound tablet kiosk to unlock their daily dashboard with a 4-digit PIN.
- **Request Body**: `{ "device_fingerprint": "kiosk_tablet_livingroom", "passcode": "1948" }`
- **Response**: `200 OK` with scoped ephemeral session token (read dashboard, confirm dose only).

---

## 1.8 User Profile & Account Management (`/api/v1/users/me`)

### 1.8.1 Get Current User Profile
- **Method / URL**: `GET /api/v1/users/me`
- **Authentication**: Bearer Token.
- **Response**: `200 OK`
  ```json
  {
    "id": "usr_uuid",
    "email": "sarah.jenkins@example.com",
    "fullName": "Sarah Jenkins",
    "phoneNumber": "+15552345678",
    "systemRole": "FAMILY_ADMIN",
    "avatarUrl": null,
    "preferences": { "textSize": "LARGE", "highContrastMode": false },
    "accountStatus": "ACTIVE"
  }
  ```

### 1.8.2 Update User Profile
- **Method / URL**: `PATCH /api/v1/users/me`
- **Authentication**: Bearer Token.
- **Request Body**:
  ```json
  {
    "full_name": "Sarah Jenkins, RN",
    "phone_number": "+15559876543",
    "preferences": { "textSize": "DEFAULT", "highContrastMode": true }
  }
  ```
- **Response**: `200 OK` with updated profile.

### 1.8.3 Change Password
- **Method / URL**: `POST /api/v1/users/me/change-password`
- **Authentication**: Bearer Token.
- **Request Body**: `{ "current_password": "OldPassword123!", "new_password": "NewPassword456!" }`
- **Response**: `200 OK`
  ```json
  { "success": true, "data": { "message": "Password changed successfully" } }
  ```

---

## 2. Patient Profiles & Consents (`/api/v1/patients`)

### 2.1 Create Patient Profile
- **Method / URL**: `POST /api/v1/patients`
- **Purpose**: Creates an elderly patient record and establishes the creating user as primary `FAMILY_ADMIN`.
- **Authentication**: Bearer Token.
- **Permissions**: `system_role in ['FAMILY_ADMIN', 'PATIENT']`.
- **Request Body**:
  ```json
  {
    "full_name": "Margaret Jenkins",
    "date_of_birth": "1948-06-14",
    "gender": "Female",
    "primary_phone": "+15558889999",
    "timezone": "America/New_York",
    "preferred_language": "en-US",
    "medical_conditions": ["Hypertension", "Type 2 Diabetes"],
    "allergies": [{ "substance": "Penicillin", "severity": "SEVERE" }],
    "blood_type": "O+"
  }
  ```
- **Response**: `201 Created` with full patient object.

### 2.2 Get Patient Dashboard (Aggregated View)
- **Method / URL**: `GET /api/v1/patients/:patientId/dashboard`
- **Purpose**: Supplies the single-screen consolidated daily payload for the attached UI reference (today's schedule, care circle status, active vitals, daily note).
- **Authentication**: Bearer Token.
- **Permissions**: Patient themselves or active Care Circle member.
- **Response**: `200 OK`
  ```json
  {
    "patient": { "id": "pat_1", "full_name": "Margaret Jenkins", "timezone": "America/New_York" },
    "greeting": { "salutation": "Good Morning", "weather": "Sunny 68°F" },
    "progress": { "completed_doses": 3, "total_doses": 5, "percent": 60 },
    "caregiver_sync": { "active_names": ["Sarah", "Nurse Elena"], "last_checked_in_minutes_ago": 3 },
    "schedule_sections": [
      {
        "category": "MORNING",
        "time": "8:00 AM",
        "status": "COMPLETED",
        "completed_at": "8:12 AM",
        "items": [
          { "id": "med_1", "brand_name": "Lisinopril", "strength": "10mg", "instructions": "1 Tablet for blood pressure", "context": "Taken with orange juice" },
          { "id": "med_2", "brand_name": "Vitamin D3", "strength": "2000 IU", "instructions": "1 Softgel with morning meal", "context": "Taken with toast" }
        ]
      },
      {
        "category": "AFTERNOON",
        "time": "1:00 PM",
        "status": "DUE_NOW",
        "is_urgent": true,
        "items": [
          { "id": "med_3", "brand_name": "Metformin", "strength": "500mg", "instructions": "1 White Oval Tablet • Take with warm meal", "pill_code": "M 500" }
        ]
      }
    ],
    "vitals": {
      "blood_pressure": { "systolic": 122, "diastolic": 80, "status": "Normal Range", "logged_at": "8:30 AM" },
      "fasting_glucose": { "value": 108, "status": "Stable & Optimal", "logged_at": "7:45 AM" },
      "hydration": { "current_glasses": 4, "target_glasses": 6 }
    },
    "next_appointment": {
      "doctor_name": "Dr. Robert Chen",
      "specialty": "Cardiology Check-up",
      "datetime_formatted": "Tomorrow at 2:00 PM",
      "transport_note": "Transport confirmed via SilverRide at 1:15 PM"
    },
    "daily_family_note": {
      "author": "Sarah",
      "message": "Mom, don't forget to drink plenty of water after your afternoon walk! I'm bringing over homemade chicken soup at 5:30 PM. Love you bunches!",
      "timestamp": "9:02 AM today"
    }
  }
  ```

---

## 3. Care Circle & Collaboration (`/api/v1/patients/:patientId/care-circle`)

### 3.1 List Pending Invitations
- **Method / URL**: `GET /api/v1/patients/:patientId/care-circle/invites`
- **Purpose**: Lists all pending, unexpired invitations for a patient.
- **Authentication**: Bearer Token.
- **Permissions**: Patient or `FAMILY_ADMIN`.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "inv_uuid",
        "inviteCode": "CN-894215",
        "inviteeEmail": "nurse.elena@homehealth.org",
        "inviteePhone": "+15557778888",
        "role": "NURSE",
        "status": "PENDING",
        "expiresAt": "2026-11-22T14:30:00.000Z"
      }
    ]
  }
  ```

### 3.2 Create Care Circle Invitation
- **Method / URL**: `POST /api/v1/patients/:patientId/care-circle/invites`
- **Purpose**: Issues a 7-day TTL formatted code (`CN-XXXXXX`) to invite family members or caregivers.
- **Authentication**: Bearer Token.
- **Permissions**: `FAMILY_ADMIN` or Patient.
- **Request Body**:
  ```json
  {
    "invitee_email": "nurse.elena@homehealth.org",
    "invitee_phone": "+15557778888",
    "circle_role": "NURSE",
    "relationship_label": "Visiting Nurse",
    "permissions": {
      "can_manage_medications": true,
      "can_manage_appointments": true,
      "can_view_vitals": true
    }
  }
  ```
- **Response**: `201 Created` with invite code, expiration timestamp, and permission preset.

### 3.3 Revoke / Cancel Pending Invitation
- **Method / URL**: `DELETE /api/v1/patients/:patientId/care-circle/invites/:inviteId`
- **Purpose**: Revokes an unaccepted invitation before expiration.
- **Authentication**: Bearer Token.
- **Permissions**: `FAMILY_ADMIN` or Patient.
- **Response**: `200 OK`
  ```json
  { "success": true, "data": { "message": "Invitation revoked successfully" } }
  ```

### 3.4 Accept Care Circle Invitation
- **Method / URL**: `POST /api/v1/care-circle/invites/:inviteCode/accept`
- **Purpose**: Authenticated user redeems an active invitation code, creating Care Circle membership and patient consent records.
- **Authentication**: Bearer Token.
- **Response**: `200 OK`
  ```json
  { "success": true, "data": { "membership": { ... }, "message": "Successfully joined Care Circle" } }
  ```

### 3.5 Reject Care Circle Invitation
- **Method / URL**: `POST /api/v1/care-circle/invites/:inviteCode/reject`
- **Purpose**: Marks invitation as `REJECTED`, preventing future activation.
- **Authentication**: Bearer Token.
- **Response**: `200 OK`
  ```json
  { "success": true, "data": { "message": "Invitation rejected" } }
  ```

### 3.6 Update Member Granular Permissions
- **Method / URL**: `PATCH /api/v1/patients/:patientId/care-circle/members/:memberId/permissions`
- **Purpose**: Fine-tunes granular permission flags for an active member.
- **Authentication**: Bearer Token.
- **Permissions**: `FAMILY_ADMIN` or Patient.
- **Request Body**:
  ```json
  {
    "can_manage_medications": true,
    "can_manage_appointments": false,
    "can_view_vitals": true
  }
  ```
- **Response**: `200 OK` with updated membership.

### 3.7 Revoke Member Access
- **Method / URL**: `DELETE /api/v1/patients/:patientId/care-circle/members/:memberId`
- **Purpose**: Deactivates Care Circle membership and revokes all active consents.
- **Permissions**: Patient or `FAMILY_ADMIN`.
- **Response**: `200 OK`. Immediately invalidates active tokens and writes audit records.

---

## 3.8 Patient Consent Management (`/api/v1/patients/:patientId/consents`)

### 3.8.1 List Active Patient Consents
- **Method / URL**: `GET /api/v1/patients/:patientId/consents`
- **Purpose**: Returns all active and historical consent records for the patient.
- **Authentication**: Bearer Token.
- **Permissions**: Patient or `FAMILY_ADMIN`.
- **Response**: `200 OK` with consent records list.

### 3.8.2 Explicitly Grant Consent
- **Method / URL**: `POST /api/v1/patients/:patientId/consents`
- **Purpose**: Patient or legal surrogate grants specific consent scope to a caregiver/family member.
- **Authentication**: Bearer Token.
- **Permissions**: Patient or `FAMILY_ADMIN`.
- **Request Body**:
  ```json
  {
    "grantee_id": "usr_caregiver_uuid",
    "consent_type": "MEDICATION_MANAGEMENT",
    "expires_at": "2027-11-15T00:00:00.000Z"
  }
  ```
- **Response**: `201 Created` with newly created consent.

### 3.8.3 Revoke Patient Consent
- **Method / URL**: `DELETE /api/v1/patients/:patientId/consents/:consentId`
- **Purpose**: Immediately revokes patient consent and invalidates ongoing authorized actions.
- **Authentication**: Bearer Token.
- **Permissions**: Patient or `FAMILY_ADMIN`.
- **Response**: `200 OK`
  ```json
  { "success": true, "data": { "message": "Consent successfully revoked" } }
  ```

---

## 4. Medication Management (`/api/v1/patients/:patientId/medications`)

### 4.1 Create Medication & Schedule
- **Method / URL**: `POST /api/v1/patients/:patientId/medications`
- **Permissions**: `can_manage_medications == true`.
- **Request Body**:
  ```json
  {
    "brand_name": "Glucophage",
    "generic_name": "Metformin",
    "strength": "500mg",
    "dosage_form": "TABLET",
    "instructions": "1 White Oval Tablet • Take with warm meal and full glass of water",
    "pill_appearance": "White Oval Tablet with M 500 score",
    "pill_color": "#FFFFFF",
    "pill_shape": "OVAL",
    "start_date": "2026-11-01",
    "schedules": [
      {
        "frequency_type": "DAILY",
        "time_of_day_category": "AFTERNOON",
        "scheduled_time": "13:00",
        "meal_relation": "WITH_MEAL",
        "grace_period_minutes": 60
      }
    ],
    "initial_stock_quantity": 60,
    "refill_threshold": 10
  }
  ```
- **Response**: `201 Created`. Automatically queues background job to populate `dose_occurrences` for the rolling 30-day window.

---

## 5. Adherence & Dose Confirmation (`/api/v1/patients/:patientId/doses`)

### 5.1 Confirm Dose (Mark as Taken)
- **Method / URL**: `POST /api/v1/patients/:patientId/doses/:doseId/confirm`
- **Headers**: `Idempotency-Key: <unique_client_generated_uuid>`
- **Purpose**: Marks dose taken with zero duplicate risk.
- **Request Body**:
  ```json
  {
    "confirmation_channel": "DASHBOARD_UI",
    "intake_meal_context": "Taken with lunch and 8 oz water",
    "notes": "No discomfort reported"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "dose_occurrence_id": "dose_uuid",
    "status": "TAKEN",
    "confirmed_at": "2026-11-15T13:12:00.000Z",
    "stock_remaining": 59,
    "adherence_streak_days": 14
  }
  ```

### 5.2 Snooze Dose Reminder
- **Method / URL**: `POST /api/v1/patients/:patientId/doses/:doseId/snooze`
- **Request Body**: `{ "snooze_minutes": 15 }`
- **Response**: `200 OK` with updated `snoozed_until_utc`.

---

## 6. Telephony Integration & Webhooks (`/api/v1/telephony`)

### 6.1 Twilio Voice Reminder Webhook (Inbound / Outbound Call Handler)
- **Method / URL**: `POST /api/v1/telephony/voice/remind`
- **Authentication**: Twilio Signature Verification (`X-Twilio-Signature`).
- **Purpose**: Generates dynamic TwiML instructions when the patient answers an automated telephone reminder.
- **Response**: `200 OK (text/xml)`
  ```xml
  <Response>
    <Gather numDigits="1" action="/api/v1/telephony/voice/handle-keypad?doseId=dose_uuid" method="POST" timeout="10">
      <Say voice="Polly.Joanna" language="en-US">
        Hello Margaret. This is CareNest. It is time for your afternoon medication: Metformin 500 milligrams with your meal.
        Press 1 to confirm you have taken it.
        Press 2 to be reminded in 15 minutes.
        Press 0 to speak directly with your daughter Sarah.
      </Say>
    </Gather>
    <Redirect>/api/v1/telephony/voice/no-input?doseId=dose_uuid</Redirect>
  </Response>
  ```

### 6.2 Handle Keypad Input
- **Method / URL**: `POST /api/v1/telephony/voice/handle-keypad`
- **Purpose**: Processes DTMF digit (`1`, `2`, or `0`). If `1`, records adherence and cancels escalation; if `0`, executes `<Dial>` bridging call to primary caretaker.

---

## 7. Emergency SOS & Direct Calling (`/api/v1/patients/:patientId/emergency`)

### 7.1 Trigger Emergency SOS
- **Method / URL**: `POST /api/v1/patients/:patientId/emergency/sos`
- **Purpose**: Initiates high-priority Care Circle alert cascade:
  1. Sends high-priority push notifications and SMS to all designated emergency contacts.
  2. Initiates voice call to primary contact with automated TTS escalation summary.
  3. Displays on-screen medical emergency banner (allergies, conditions, emergency contacts).
- **Response**: `200 OK` with dispatched contact details and audit tracking ID.
