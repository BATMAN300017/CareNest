-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('PATIENT', 'FAMILY_ADMIN', 'FAMILY_MEMBER', 'CARETAKER', 'HEALTHCARE_PROFESSIONAL', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "CircleRole" AS ENUM ('FAMILY_ADMIN', 'FAMILY_MEMBER', 'CARETAKER', 'NURSE', 'CLINICIAN');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('FULL_HEALTHCARE_PROXY', 'MEDICATION_MANAGEMENT', 'VITALS_VIEW_ONLY', 'APPOINTMENT_ESCORT');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DosageForm" AS ENUM ('TABLET', 'CAPSULE', 'LIQUID', 'INHALER', 'INJECTION', 'PATCH', 'DROPS');

-- CreateEnum
CREATE TYPE "FrequencyType" AS ENUM ('DAILY', 'INTERVAL_DAYS', 'SPECIFIC_WEEKDAYS', 'PRN_AS_NEEDED');

-- CreateEnum
CREATE TYPE "MealRelation" AS ENUM ('BEFORE_MEAL', 'WITH_MEAL', 'AFTER_MEAL', 'EMPTY_STOMACH', 'NO_RESTRICTION');

-- CreateEnum
CREATE TYPE "TimeOfDayCategory" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "DoseStatus" AS ENUM ('PENDING', 'DUE_NOW', 'TAKEN', 'SNOOZED', 'MISSED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ConfirmationChannel" AS ENUM ('DASHBOARD_UI', 'VOICE_ASSISTANT_WEB', 'TELEPHONE_DTMF', 'TELEPHONE_SPEECH', 'CAREGIVER_MANUAL');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "VitalType" AS ENUM ('BLOOD_PRESSURE', 'BLOOD_GLUCOSE', 'HEART_RATE', 'SPO2', 'TEMPERATURE', 'WEIGHT', 'HYDRATION');

-- CreateEnum
CREATE TYPE "SymptomSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ObservationType" AS ENUM ('ROUTINE_CHECK', 'BEHAVIORAL', 'APPETITE', 'MOBILITY', 'HANDOVER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'TELEPHONE_CALL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'DISPATCHED', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('DOSE_CONFIRMED', 'SNOOZE_REQUESTED', 'TRANSFERRED_TO_CARETAKER', 'NO_RESPONSE_ESCALATED', 'VOICEMAIL_DETECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone_number" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "quick_passcode_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "system_role" "SystemRole" NOT NULL DEFAULT 'FAMILY_MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" TEXT,
    "primary_phone" TEXT NOT NULL,
    "preferred_language" TEXT NOT NULL DEFAULT 'en-US',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "address" JSONB,
    "medical_conditions" JSONB,
    "allergies" JSONB,
    "blood_type" TEXT,
    "high_contrast_preference" BOOLEAN NOT NULL DEFAULT false,
    "text_scale_preference" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    "audio_readout_enabled" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TEXT NOT NULL DEFAULT '22:00',
    "quiet_hours_end" TEXT NOT NULL DEFAULT '07:00',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_circle_memberships" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "circle_role" "CircleRole" NOT NULL,
    "relationship_label" TEXT NOT NULL,
    "is_primary_caregiver" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_medications" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_appointments" BOOLEAN NOT NULL DEFAULT false,
    "can_view_vitals" BOOLEAN NOT NULL DEFAULT true,
    "can_view_records" BOOLEAN NOT NULL DEFAULT true,
    "receive_emergency_alerts" BOOLEAN NOT NULL DEFAULT true,
    "receive_missed_dose_calls" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_circle_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "granted_to_user_id" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "digital_signature_hash" TEXT,
    "revocation_reason" TEXT,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "invited_by_user_id" TEXT NOT NULL,
    "invitee_email" TEXT,
    "invitee_phone" TEXT,
    "invite_code" TEXT NOT NULL,
    "circle_role" "CircleRole" NOT NULL,
    "permissions_preset" JSONB,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "generic_name" TEXT NOT NULL,
    "rx_norm_code" TEXT,
    "dosage_form" "DosageForm" NOT NULL,
    "strength" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'ORAL',
    "instructions" TEXT NOT NULL,
    "pill_appearance" TEXT NOT NULL,
    "pill_color" TEXT,
    "pill_shape" TEXT,
    "indication" TEXT,
    "special_precautions" TEXT,
    "prescribing_doctor_id" TEXT,
    "prescribing_doctor_name" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "discontinued_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_schedules" (
    "id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "frequency_type" "FrequencyType" NOT NULL,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "days_of_week" INTEGER[],
    "time_of_day_category" "TimeOfDayCategory" NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "meal_relation" "MealRelation" NOT NULL DEFAULT 'NO_RESTRICTION',
    "dose_quantity" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 60,
    "reminder_lead_minutes" INTEGER NOT NULL DEFAULT 15,
    "start_date" DATE,
    "end_date" DATE,
    "timezone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "medication_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dose_occurrences" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "scheduled_for_utc" TIMESTAMP(3) NOT NULL,
    "expected_local_time" TIMESTAMP(3) NOT NULL,
    "time_category" "TimeOfDayCategory" NOT NULL,
    "status" "DoseStatus" NOT NULL DEFAULT 'PENDING',
    "snoozed_until_utc" TIMESTAMP(3),
    "snooze_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_reason" TEXT,
    "escalation_tier" INTEGER NOT NULL DEFAULT 0,
    "escalated_at_utc" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dose_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adherence_records" (
    "id" TEXT NOT NULL,
    "dose_occurrence_id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "confirmed_by_user_id" TEXT NOT NULL,
    "confirmation_channel" "ConfirmationChannel" NOT NULL,
    "confirmed_at_utc" TIMESTAMP(3) NOT NULL,
    "intake_meal_context" TEXT,
    "symptoms_or_notes" TEXT,
    "telephony_call_sid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adherence_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_stock" (
    "id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "current_quantity" INTEGER NOT NULL,
    "package_size" INTEGER NOT NULL DEFAULT 30,
    "refill_threshold" INTEGER NOT NULL DEFAULT 7,
    "last_refill_date" DATE,
    "pharmacy_name" TEXT,
    "pharmacy_phone" TEXT,
    "rx_number" TEXT,

    CONSTRAINT "medication_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "clinic_name" TEXT NOT NULL,
    "phone_number" TEXT,
    "email" TEXT,
    "address" JSONB,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "title" TEXT NOT NULL,
    "appointment_datetime_utc" TIMESTAMP(3) NOT NULL,
    "expected_local_datetime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "duration_minutes" INTEGER NOT NULL DEFAULT 45,
    "location_address" TEXT NOT NULL,
    "doctor_name" TEXT,
    "specialty" TEXT,
    "clinic_name" TEXT,
    "contact_phone" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "transport_booked" BOOLEAN NOT NULL DEFAULT false,
    "transport_service_name" TEXT,
    "transport_pickup_time" TIMESTAMP(3),
    "transport_notes" TEXT,
    "visit_notes" TEXT,
    "preparation_instructions" TEXT,
    "follow_up_instructions" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_vitals" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "vital_type" "VitalType" NOT NULL,
    "recorded_at_utc" TIMESTAMP(3) NOT NULL,
    "numeric_value_primary" DECIMAL(6,2) NOT NULL,
    "numeric_value_secondary" DECIMAL(6,2),
    "unit" TEXT NOT NULL,
    "reading_context" TEXT,
    "is_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "source_device" TEXT DEFAULT 'Manual Input',
    "logged_by_user_id" TEXT,

    CONSTRAINT "health_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_logs" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "logged_by_user_id" TEXT NOT NULL,
    "symptom_name" TEXT NOT NULL,
    "severity" "SymptomSeverity" NOT NULL,
    "notes" TEXT,
    "recorded_at_utc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_notes" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "patient_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_observations" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "caregiver_user_id" TEXT NOT NULL,
    "observation_type" "ObservationType" NOT NULL,
    "content" TEXT NOT NULL,
    "shift_date" DATE NOT NULL,
    "requires_admin_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caregiver_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "priority_order" INTEGER NOT NULL DEFAULT 1,
    "is_authorized_break_glass" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "reference_id" TEXT,
    "scheduled_for_utc" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_attempts" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "response_payload" JSONB,
    "is_successful" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "attempted_at_utc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_call_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "dose_occurrence_id" TEXT,
    "call_sid" TEXT NOT NULL,
    "to_phone" TEXT NOT NULL,
    "from_phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "dtmf_digit_received" TEXT,
    "speech_transcription" TEXT,
    "call_outcome" "CallOutcome",
    "call_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "call_ended_at" TIMESTAMP(3),

    CONSTRAINT "voice_call_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "previous_state" JSONB,
    "new_state" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_registrations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_fingerprint" TEXT NOT NULL,
    "fcm_push_token" TEXT,
    "device_model" TEXT,
    "is_tablet_kiosk" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "device_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_number_idx" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "users_system_role_idx" ON "users"("system_role");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE INDEX "patients_primary_phone_idx" ON "patients"("primary_phone");

-- CreateIndex
CREATE INDEX "care_circle_memberships_patient_id_idx" ON "care_circle_memberships"("patient_id");

-- CreateIndex
CREATE INDEX "care_circle_memberships_user_id_idx" ON "care_circle_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "care_circle_memberships_patient_id_user_id_key" ON "care_circle_memberships"("patient_id", "user_id");

-- CreateIndex
CREATE INDEX "patient_consents_patient_id_granted_to_user_id_idx" ON "patient_consents"("patient_id", "granted_to_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_invite_code_key" ON "invitations"("invite_code");

-- CreateIndex
CREATE INDEX "invitations_invite_code_idx" ON "invitations"("invite_code");

-- CreateIndex
CREATE INDEX "invitations_patient_id_idx" ON "invitations"("patient_id");

-- CreateIndex
CREATE INDEX "medications_patient_id_is_active_idx" ON "medications"("patient_id", "is_active");

-- CreateIndex
CREATE INDEX "medication_schedules_medication_id_idx" ON "medication_schedules"("medication_id");

-- CreateIndex
CREATE INDEX "medication_schedules_patient_id_idx" ON "medication_schedules"("patient_id");

-- CreateIndex
CREATE INDEX "dose_occurrences_patient_id_status_idx" ON "dose_occurrences"("patient_id", "status");

-- CreateIndex
CREATE INDEX "dose_occurrences_scheduled_for_utc_idx" ON "dose_occurrences"("scheduled_for_utc");

-- CreateIndex
CREATE UNIQUE INDEX "dose_occurrences_schedule_id_scheduled_for_utc_key" ON "dose_occurrences"("schedule_id", "scheduled_for_utc");

-- CreateIndex
CREATE UNIQUE INDEX "adherence_records_dose_occurrence_id_key" ON "adherence_records"("dose_occurrence_id");

-- CreateIndex
CREATE INDEX "adherence_records_patient_id_confirmed_at_utc_idx" ON "adherence_records"("patient_id", "confirmed_at_utc");

-- CreateIndex
CREATE UNIQUE INDEX "medication_stock_medication_id_key" ON "medication_stock"("medication_id");

-- CreateIndex
CREATE INDEX "medication_stock_patient_id_idx" ON "medication_stock"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_patient_id_appointment_datetime_utc_idx" ON "appointments"("patient_id", "appointment_datetime_utc");

-- CreateIndex
CREATE INDEX "health_vitals_patient_id_vital_type_recorded_at_utc_idx" ON "health_vitals"("patient_id", "vital_type", "recorded_at_utc");

-- CreateIndex
CREATE INDEX "symptom_logs_patient_id_recorded_at_utc_idx" ON "symptom_logs"("patient_id", "recorded_at_utc");

-- CreateIndex
CREATE INDEX "family_notes_patient_id_created_at_idx" ON "family_notes"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "caregiver_observations_patient_id_shift_date_idx" ON "caregiver_observations"("patient_id", "shift_date");

-- CreateIndex
CREATE INDEX "emergency_contacts_patient_id_priority_order_idx" ON "emergency_contacts"("patient_id", "priority_order");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_status_idx" ON "notifications"("recipient_user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_patient_id_event_type_idx" ON "notifications"("patient_id", "event_type");

-- CreateIndex
CREATE INDEX "notification_attempts_notification_id_idx" ON "notification_attempts"("notification_id");

-- CreateIndex
CREATE UNIQUE INDEX "voice_call_records_call_sid_key" ON "voice_call_records"("call_sid");

-- CreateIndex
CREATE INDEX "voice_call_records_patient_id_call_started_at_idx" ON "voice_call_records"("patient_id", "call_started_at");

-- CreateIndex
CREATE INDEX "audit_logs_patient_id_timestamp_idx" ON "audit_logs"("patient_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_registrations_device_fingerprint_key" ON "device_registrations"("device_fingerprint");

-- CreateIndex
CREATE INDEX "device_registrations_user_id_idx" ON "device_registrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "revoked_tokens_token_hash_key" ON "revoked_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "revoked_tokens_token_hash_idx" ON "revoked_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "revoked_tokens_user_id_idx" ON "revoked_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_circle_memberships" ADD CONSTRAINT "care_circle_memberships_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_circle_memberships" ADD CONSTRAINT "care_circle_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_granted_to_user_id_fkey" FOREIGN KEY ("granted_to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_prescribing_doctor_id_fkey" FOREIGN KEY ("prescribing_doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dose_occurrences" ADD CONSTRAINT "dose_occurrences_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "medication_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dose_occurrences" ADD CONSTRAINT "dose_occurrences_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dose_occurrences" ADD CONSTRAINT "dose_occurrences_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adherence_records" ADD CONSTRAINT "adherence_records_dose_occurrence_id_fkey" FOREIGN KEY ("dose_occurrence_id") REFERENCES "dose_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adherence_records" ADD CONSTRAINT "adherence_records_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adherence_records" ADD CONSTRAINT "adherence_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adherence_records" ADD CONSTRAINT "adherence_records_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_stock" ADD CONSTRAINT "medication_stock_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_stock" ADD CONSTRAINT "medication_stock_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_vitals" ADD CONSTRAINT "health_vitals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_vitals" ADD CONSTRAINT "health_vitals_logged_by_user_id_fkey" FOREIGN KEY ("logged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_logs" ADD CONSTRAINT "symptom_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_logs" ADD CONSTRAINT "symptom_logs_logged_by_user_id_fkey" FOREIGN KEY ("logged_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_notes" ADD CONSTRAINT "family_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_notes" ADD CONSTRAINT "family_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_observations" ADD CONSTRAINT "caregiver_observations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_observations" ADD CONSTRAINT "caregiver_observations_caregiver_user_id_fkey" FOREIGN KEY ("caregiver_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_call_records" ADD CONSTRAINT "voice_call_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_call_records" ADD CONSTRAINT "voice_call_records_dose_occurrence_id_fkey" FOREIGN KEY ("dose_occurrence_id") REFERENCES "dose_occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_registrations" ADD CONSTRAINT "device_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revoked_tokens" ADD CONSTRAINT "revoked_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

