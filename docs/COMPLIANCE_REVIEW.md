# ShawScope — Compliance Requirements Review

**Context:** ShawScope is a UK domiciliary (home-visiting) audiology and cryotherapy healthcare provider, handling special-category personal data (health records, hearing screenings, clinical notes, consent forms) for patients in their own homes. This places the system under **UK GDPR / Data Protection Act 2018**, and the application already contains a built-in clinical governance framework consistent with CQC-style domiciliary care record-keeping.

This review covers what's in place, what's working, and what gaps exist.

---

## 1. Data residency

✅ **Satisfied.** The production database now runs in AWS `eu-west-2` (London), Postgres 17.6. All patient data is stored within the UK, which was the explicit requirement for this migration.

## 2. Special category data — consent management

✅ **In place.** The system has dedicated tables for consent capture:
- `consent_form_templates` — the question sets patients must complete
- `consent_form_responses` — patient's actual recorded responses, tied to a specific appointment

Consent forms are sent via a unique access-token link (not a guessable URL) and delivery can be tracked per-channel (email/SMS/in-person), with admin alerts if a patient struggles to complete one.

## 3. Clinical governance framework

✅ **Extensive, already built-in.** The database includes 21 dedicated governance tables covering areas a CQC-registered or similarly regulated UK care provider is expected to maintain records for:

| Area | Table |
|---|---|
| Incident reporting | `gov_incidents`, `gov_significant_events` |
| Safeguarding | `gov_safeguarding` |
| Complaints & compliments | `gov_complaints`, `gov_compliments`, `gov_patient_feedback` |
| Risk assessments | `gov_risk_assessments` |
| Business continuity | `gov_continuity_plans` |
| Infection prevention & control | `gov_ipc_audits` |
| Equipment safety | `gov_equipment`, `gov_equipment_service_log`, `gov_calibration_checks` |
| Clinical waste handling | `gov_clinical_waste` |
| Staff credentials & training | `gov_credentials`, `gov_training_cpd` |
| Lone worker safety | `gov_lone_worker_checkins` |
| **GDPR breach log** | `gov_gdpr_breaches` |
| Access/audit trail | `gov_access_log` |
| Document/policy management | `gov_documents`, `gov_folders`, `gov_files` |
| Internal audits | `gov_audits` |

This is a meaningfully complete framework — it was not something introduced during this migration, it already existed in the application and has been carried over intact with zero data loss.

## 3a. RLS policy correction (post-migration finding)

⚠️→✅ **Found and fixed.** During migration, an extra `admin_all_access` policy (and a set of duplicate `anon_*` policies) was added on top of the original, more precisely-scoped policy set as a defensive measure. This was confirmed via Lovable to be unnecessary — the original granular named policies (e.g. `"Service role only"` on `admin_authenticator_factors`, `"Anyone can insert appointments"`) already provided complete and correct coverage, and are the actual intended security model from the live source project.

Worse, the added `admin_all_access` policy was present on sensitive service-role-only tables — `admin_authenticator_factors` (stores TOTP secrets), `login_otp_codes`, `email_send_log`, and `phone_call_sessions`. Because Postgres RLS policies are OR'd together, this meant any authenticated admin could read these tables directly via the client SDK, bypassing the intended restriction that they only be accessible through the backend Edge Functions (using the service role key).

**Fix applied:** removed the added `admin_all_access` and `anon_*` policies from all tables except two (`gov_files`, `gov_folders`) where they were the only policy present (these two tables were created manually after the original schema push failed on them, so they never inherited an original policy). Verified after the fix: every table retains at least one working policy, admin dashboard access still works via the original named policies, and the sensitive service-role-only tables are no longer reachable by authenticated admins directly.

## 4. Access control & audit logging

✅ **In place.** `gov_access_log` records who did what: `user_id`, `user_email`, `action`, `entity`, `entity_id`, `ip`, `user_agent`, `occurred_at` — giving a genuine audit trail of admin actions against patient/clinical records, not just a basic login log.

Database-level access is enforced via Row Level Security — every table requires either admin authentication or a valid access token (see Task 5's RLS review). There is no path for an unauthenticated user to read patient data directly from the database.

## 5. Data retention & right to erasure

⚠️ **Gap found.** The codebase includes a `cleanup-expired-patients` function that automatically deletes patient records **8 years** after their last appointment — aligning with the NHS Records Management Code of Practice retention period for adult clinical records.

**However:** this function exists but is **not currently scheduled to run**. It was written as an Edge Function but has no cron job triggering it automatically, meaning right now the 8-year deletion policy exists in code but isn't actually being enforced in practice on the live system.

**Recommendation:** schedule this to run automatically (e.g. monthly) — same mechanism already used for `process-scheduled-comms`. This has not been enabled yet because automatic deletion is a meaningful, hard-to-reverse action and should only be turned on with your explicit sign-off, ideally after Matt confirms the 8-year rule is still the policy he wants enforced.

## 6. Encryption

✅ **Satisfied by platform default.** Supabase encrypts all data at rest (AES-256) and all connections are TLS-encrypted in transit. No additional configuration was required or is outstanding here.

## 7. Storage bucket access control

✅ **Verified correct.** Buckets containing patient/clinical content (`shawscope`, `governance`, `accounts-receipts`) are private. Only genuinely public marketing assets (`blog-images`, `email-assets`) are public. The new `system-backups` bucket (added this week) is private and admin-only.

✅ The two unidentified empty buckets (`fleet-documents`, `quote-attachments`) have been removed after confirming they contained zero files.

---

## Summary

| Area | Status |
|---|---|
| UK data residency | ✅ Satisfied |
| Consent management | ✅ In place |
| Clinical governance records | ✅ Extensive, pre-existing |
| Access control & audit logging | ✅ In place |
| Encryption (at rest & in transit) | ✅ Satisfied (platform default) |
| Storage bucket access control | ✅ Correct |
| **Data retention / 8-year deletion policy** | ⚠️ **Written but not scheduled — needs sign-off to enable** |
| Two unidentified empty storage buckets | ✅ Removed |

**Action needed from you:** confirm with Matt that the 8-year patient record retention rule is still correct, then give the go-ahead to schedule `cleanup-expired-patients` to run automatically.
