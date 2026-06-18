# ShawScope — Project Handover

**Last updated:** 18 June 2026
**Purpose:** A single, plain-English entry point to understand what this system is, what's been done, what's still outstanding, and where to find more detail.

---

## 1. What this is

ShawScope is a UK domiciliary (home-visiting) audiology and cryotherapy healthcare service. The application is a booking + clinical management system covering:

- **Public site**: service information, multi-step online booking wizard, consent form completion, appointment cancellation/rescheduling
- **Admin portal**: appointment management, patient records, clinical audit trail, marketing campaigns, governance/compliance tracking (incidents, safeguarding, risk assessments, GDPR breach log, etc.), staff scheduling tools (lone worker check-ins, mileage tracking)

It was originally built and hosted on **Lovable** (an AI app-building platform that wraps Supabase). This engagement migrated it to **client-owned infrastructure** so it no longer depends on Lovable.

## 2. Architecture at a glance

```
┌─────────────────┐        ┌──────────────────────────┐
│   React + Vite   │  HTTP  │   Supabase (London, UK)   │
│   frontend       │◄──────►│   - Postgres database     │
│  (TypeScript)    │        │   - Auth (email+password   │
└─────────────────┘        │     + SMS/TOTP 2FA)        │
                            │   - Storage (files)        │
                            │   - 65 Edge Functions      │
                            │     (Deno/TypeScript)      │
                            │   - pg_cron scheduled jobs │
                            └──────────────────────────┘
```

- **Frontend**: React + TypeScript + Vite + Tailwind + Radix UI. Talks to Supabase directly using the public anon key (safe to expose — access is controlled by Row Level Security, not key secrecy).
- **Backend**: Supabase project `egsapqxzgjxgyckjbshz`, region `eu-west-2` (London) — satisfies the UK data residency requirement.
- **Business logic**: 65 Edge Functions (Deno/TypeScript) handle bookings, notifications (email via Resend, SMS via TheSMSWorks), admin authentication, calendar sync, marketing campaigns, etc.
- **Source control**: `github.com/ShawScope/ShawScope`, `main` branch.

## 3. Current state — what's done

| Area | Status |
|---|---|
| Source code exported from Lovable | ✅ Done — 197 frontend files, 65 Edge Functions |
| Code pushed to client-owned GitHub | ✅ Done |
| Database migrated (schema + data) | ✅ Done — all 95 tables, verified row-for-row against source |
| Storage migrated | ✅ Done — all 86 files, verified by content |
| RLS (Row Level Security) | ✅ Done — every table covered; a security regression introduced during migration (admin access to TOTP/OTP secret tables) was found and fixed |
| MFA for admin login | ✅ Done — SMS one-time-code (always active) + optional TOTP authenticator app (enforced automatically once an admin enables it in Settings) |
| Least-privilege database grants | ✅ Done — unused `TRUNCATE`/`REFERENCES`/`TRIGGER` privileges revoked |
| Automated backups | ✅ Done — weekly, since the Supabase org is on the **Free plan** (no built-in backups). See §6. |
| End-to-end tests | ✅ Done — real Playwright tests for admin login (incl. MFA) and booking wizard navigation, verified passing against the live backend |
| **Production deployment (Vercel/CI/custom domain)** | ❌ **Not started** |
| Handover documentation | ✅ This document, plus the supporting docs in §8 |

## 4. What's still outstanding

1. **Vercel deployment.** No hosting, no CI/CD pipeline, no custom domain/SSL configured yet. `.env`'s `VITE_APP_URL` still points at the old Lovable URL as a placeholder. The app currently only runs locally (`npm run dev`) or via manual build (`npm run build`).
2. **Supabase plan.** The org is on the **Free plan**. The original plan called for Pro. Free plan has no built-in automated backups (worked around with a custom weekly backup job — see §6) and has lower compute/bandwidth limits. Decide whether to upgrade.
3. **E2E coverage is partial.** Covers admin login/MFA and booking wizard navigation, not full booking submission, consent forms, file uploads, or the admin dashboard's many sub-features. See `e2e/README.md`.

Resolved since the table above was written:
- `GOOGLE_SERVICE_ACCOUNT_JSON` and `GA4_PROPERTY_ID` are now set (18 June 2026). Google OAuth client ID/secret were intentionally skipped — Matt uses SMS-based admin login, not Gmail-based.
- The `gmail-heidi-poll` cron job (previously calling a function that never existed in this codebase) was investigated with Lovable and confirmed to be abandoned scaffolding from a May 2026 experiment — it only ever caught Heidi Health billing receipt emails, never real clinical transcripts, and the actual Heidi workflow in production use is a manual paste-in flow in `ConsultationFormDialog.tsx` that doesn't depend on it. The dead cron schedule has been removed (18 June 2026). The `heidi_imports`/`gmail_poll_state` tables (3 harmless archived rows) were kept rather than dropped, per a "don't delete data unless there's a reason to" preference.
- **8-year patient data retention policy** is now scheduled (monthly, 1st of the month 04:00 UK, 18 June 2026). On closer reading, the function also correctly handles minors (retained until their 25th/26th birthday per NHS guidance, not just the 8-year adult rule). Verified before enabling that zero patients in the current dataset meet either deletion threshold, so this carries no immediate effect. Matt's confirmation of the policy itself is being sought separately and can be adjusted later if needed.

## 5. Where things live

| What | Where |
|---|---|
| Source code | `github.com/ShawScope/ShawScope`, `main` branch |
| Database + backend | [Supabase Dashboard → egsapqxzgjxgyckjbshz](https://supabase.com/dashboard/project/egsapqxzgjxgyckjbshz) (London) |
| Database migrations (version controlled) | `supabase/migrations/` |
| Edge Function source | `supabase/functions/` |
| Frontend source | `src/` |
| E2E tests | `e2e/` |
| Backup snapshots | `system-backups` bucket in the Supabase dashboard (admin-only) |
| This documentation | `docs/` |

## 6. Operating the system day-to-day

- **Backups**: automatic, weekly (Sundays 03:00 UK time), data-only, kept for 6 weeks. See `docs/BACKUP_AND_ROLLBACK_PLAN.md` for full detail and disaster recovery steps.
- **Scheduled jobs** (`pg_cron`, visible in Supabase SQL editor via `SELECT * FROM cron.job;`):
  - `process-scheduled-comms` — every 5 min, sends queued booking emails/SMS
  - `scheduled-backup` — weekly, database backup
  - `monthly-blog-generation` — monthly, AI blog post generation
  - `cleanup-expired-patients` — monthly, 8-year (adult) / 25th-26th birthday (minor) patient data retention cleanup
- **Secrets/environment variables**: managed in Supabase Dashboard → Settings → Edge Functions → Secrets. Never committed to git.
- **Rollback**: see `docs/BACKUP_AND_ROLLBACK_PLAN.md` for four scenarios (full revert, single-table restore, lost files, full disaster recovery).

## 7. Security & compliance summary

Full detail in `docs/COMPLIANCE_REVIEW.md`. Headline points:

- UK data residency: satisfied (London region)
- Encryption at rest and in transit: satisfied (Supabase platform default)
- Consent management, clinical governance records, audit logging: all in place and pre-existing in the application design
- RLS and least-privilege: reviewed and corrected (see §3)
- Data retention: scheduled monthly, adults (8 years) and minors (25th/26th birthday) both handled correctly

## 8. Supporting documentation

- `docs/BACKUP_AND_ROLLBACK_PLAN.md` — backup locations, retention, disaster recovery procedures
- `docs/COMPLIANCE_REVIEW.md` — full security/compliance review with findings and fixes
- `docs/MIGRATION_SOURCE_NOTE.md` — explains a data provenance issue discovered mid-migration (the source database used was an intermediate copy, not the live project) and what it means going forward
- `e2e/README.md` — how to run and extend the E2E test suite
- Per-task EOD reports (in the project root) — detailed logs of work done on specific days/tasks

## 9. If something breaks

1. Check `docs/BACKUP_AND_ROLLBACK_PLAN.md` first — it has scenario-based recovery steps.
2. The original Lovable-hosted project is untouched and still running, as a last-resort fallback (see Migration Source Note for caveats about data created after the migration cutover).
3. All database changes made during this migration are captured as proper migration files in `supabase/migrations/` (dated 18 June 2026) — these are reproducible and auditable, not just applied ad hoc.
