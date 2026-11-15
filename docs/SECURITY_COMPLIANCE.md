# CareNest – Security, Privacy & Healthcare Compliance Architecture

## 1. Regulatory Context & Security Posture

CareNest handles sensitive Protected Health Information (PHI) and Personally Identifiable Information (PII). The platform's security architecture adheres to **HIPAA Security & Privacy Rules** and **GDPR** data protection standards:

1. **Patient Data Sovereignty**: All data belongs to the patient. Access by family or caregivers is derived strictly from explicit patient consent records (`patient_consents`), which can be revoked at any time.
2. **Zero Plaintext PHI in Transit or Rest**:
   - In Transit: Enforced TLS 1.3 with strict cipher suites and HSTS (`max-age=63072000; includeSubDomains; preload`).
   - At Rest: PostgreSQL storage encrypted via AES-256 transparent data encryption; sensitive medical columns (allergies, medical conditions, prescription notes) support field-level application encryption via AES-256-GCM.
3. **No Secret Keys in Frontend Code**: All Twilio credentials, database connection strings, JWT signing keys, and Resend API tokens are strictly isolated in server-side environment variables.

---

## 2. Authentication & Authorization Layers

```
[Incoming Request]
        │
        ▼
[1. Rate Limiting Middleware (Upstash / Redis Token Bucket)]
        │
        ▼
[2. JWT Authentication & Session Validation]
    ├── Validate Signature (RS256 / HS256)
    ├── Check Token Blacklist in Redis (Immediate revocation upon logout/revocation)
    └── Populate req.user context
        │
        ▼
[3. Patient Consent & RBAC Guard]
    ├── Extract target patientId from route (/patients/:patientId/...)
    ├── Verify actor has active Care Circle Membership for patientId
    ├── Check granular permission flags (e.g. can_manage_medications)
    └── Rejection (403 Forbidden) if consent revoked or missing
        │
        ▼
[4. Audit Logging Interceptor]
    └── Writes structured audit event to PostgreSQL audit_logs
        │
        ▼
[5. Domain Controller & Service Execution]
```

---

## 3. Emergency Break-Glass Architecture

In true medical crises, care cannot be paralyzed by administrative barriers:
- When the **Emergency SOS** button is tapped:
  1. The system creates an `emergency_events` log.
  2. Designated emergency contacts (`is_authorized_break_glass == true`) receive temporary 24-hour elevated read access to the patient's critical emergency sheet (allergies, primary conditions, active medications, emergency contacts).
  3. Every access under break-glass conditions triggers an immutable audit log and notifies the primary family administrator via email and SMS.

---

## 4. Immutable Audit Trails & Privacy Controls

- **Audit Log Schema**: Every mutation records `actor_user_id`, `patient_id`, `action`, `resource_type`, `previous_state`, `new_state`, `ip_address`, and `user_agent`.
- **Retention & Data Deletion (GDPR Right to be Forgotten)**:
  - Account deletion purges user credentials and personal identifiers.
  - Medical audit records are scrubbed of personal identifiers and retained in anonymized format in accordance with medical statutory retention mandates (e.g. 7 years).
