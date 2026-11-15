import { describe, it, expect } from "vitest";
import { newDb } from "pg-mem";
import fs from "fs";
import path from "path";

describe("Database Foundation: PostgreSQL Schema Compilation & Constraints", () => {
  it("should successfully execute the complete Prisma PostgreSQL migration SQL", () => {
    const db = newDb();

    // Register necessary PostgreSQL extension functions that pg-mem supports
    db.public.registerFunction({
      name: "gen_random_uuid",
      implementation: () => "00000000-0000-0000-0000-000000000000",
    });

    const migrationPath = path.join(
      __dirname,
      "../../prisma/migrations/20261115000000_init/migration.sql"
    );
    // pg-mem AST planner doesn't evaluate precision brackets on decimals, so we adapt for in-memory AST
    const rawSql = fs.readFileSync(migrationPath, "utf-8");
    const sql = rawSql.replace(/DECIMAL\(\d+,\s*\d+\)/gi, "DECIMAL");

    // Execute the complete DDL migration
    expect(() => db.public.none(sql)).not.toThrow();

    // Verify all essential tables exist
    const tables = [
      "users",
      "patients",
      "care_circle_memberships",
      "patient_consents",
      "invitations",
      "medications",
      "medication_schedules",
      "dose_occurrences",
      "adherence_records",
      "medication_stock",
      "doctors",
      "appointments",
      "health_vitals",
      "symptom_logs",
      "family_notes",
      "caregiver_observations",
      "emergency_contacts",
      "notifications",
      "notification_attempts",
      "voice_call_records",
      "audit_logs",
      "device_registrations",
    ];

    for (const table of tables) {
      const result = db.public.many(`SELECT * FROM "${table}" LIMIT 1`);
      expect(Array.isArray(result)).toBe(true);
    }
  });

  it("should enforce primary and foreign key constraints on patient and medication models", () => {
    const db = newDb();
    const migrationPath = path.join(
      __dirname,
      "../../prisma/migrations/20261115000000_init/migration.sql"
    );
    const rawSql = fs.readFileSync(migrationPath, "utf-8");
    const sql = rawSql.replace(/DECIMAL\(\d+,\s*\d+\)/gi, "DECIMAL");
    db.public.none(sql);

    // Insert user
    db.public.none(`
      INSERT INTO "users" ("id", "phone_number", "password_hash", "full_name", "system_role", "is_active", "phone_verified", "email_verified", "failed_login_attempts", "created_at", "updated_at")
      VALUES ('usr_1', '+15551234567', 'hash123', 'Sarah Jenkins', 'FAMILY_ADMIN', true, true, false, 0, NOW(), NOW())
    `);

    // Insert patient
    db.public.none(`
      INSERT INTO "patients" ("id", "user_id", "full_name", "date_of_birth", "primary_phone", "preferred_language", "timezone", "high_contrast_preference", "text_scale_preference", "audio_readout_enabled", "quiet_hours_start", "quiet_hours_end", "created_at", "updated_at")
      VALUES ('pat_1', 'usr_1', 'Margaret Jenkins', '1948-06-14', '+15551234567', 'en-US', 'America/New_York', false, 1.00, true, '22:00', '07:00', NOW(), NOW())
    `);

    // Foreign key violation test: Inserting medication with non-existent patient must fail
    expect(() => {
      db.public.none(`
        INSERT INTO "medications" ("id", "patient_id", "brand_name", "generic_name", "dosage_form", "strength", "route", "instructions", "pill_appearance", "start_date", "is_active", "created_at", "updated_at")
        VALUES ('med_invalid', 'pat_non_existent', 'Lisinopril', 'Lisinopril', 'TABLET', '10mg', 'ORAL', '1 tablet daily', 'Round White', '2026-11-01', true, NOW(), NOW())
      `);
    }).toThrow();

    // Valid insertion with existing patient succeeds
    expect(() => {
      db.public.none(`
        INSERT INTO "medications" ("id", "patient_id", "brand_name", "generic_name", "dosage_form", "strength", "route", "instructions", "pill_appearance", "start_date", "is_active", "created_at", "updated_at")
        VALUES ('med_1', 'pat_1', 'Lisinopril', 'Lisinopril', 'TABLET', '10mg', 'ORAL', '1 tablet daily', 'Round White', '2026-11-01', true, NOW(), NOW())
      `);
    }).not.toThrow();
  });
});
