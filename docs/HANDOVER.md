# ShawScope — Project Handover

**Last updated:** 25 June 2026
**Purpose:** A single, plain-English entry point to understand what this system is, what's been done, what's still outstanding, and where to find more detail.

---

## 1. What this is

ShawScope is a UK domiciliary (home-visiting) audiology and cryotherapy healthcare service. The application is a booking + clinical management system covering:

- **Public site**: service information, multi-step online booking wizard, consent form completion, appointment cancellation/rescheduling
- **Admin portal**: appointment management, patient records, clinical audit trail, marketing campaigns, governance/compliance tracking (incidents, safeguarding, risk assessments, GDPR breach log, etc.), staff scheduling tools (lone worker check-ins, mileage tracking)

It was originally built and hosted on **Lovable** (an AI app-building platform that wraps Supabase). This engagement migrated it to **client-owned infrastructure** so it no longer depends on Lovable. **The migration is complete and live in production** as of 24 June 2026.

## 2. Architecture at a glance

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────────────┐
│   GitHub repo     │  push   │  GitHub Actions   │ deploy  │       Vercel              │
│ ShawScope/        │────────►│  workflow          │────────►│  (frontend hosting)       │
│ ShawScope          │        │  (.github/         │         │  shawscope.co.uk          │
│                    │        │   workflows/)       │         │  + SSL (auto-issued)      │
└──────────────────┘         └──────────────────┘         └────────────┬─────────────┘
                                                                          │ HTTP
                                                                          ▼
                                                            ┌──────────────────────────┐
                                                            │   Supabase (London, UK)   │
                                                            │   - Postgres database     │
                                                            │   - Auth (email+password   │
                                                            │     + SMS/TOTP 2FA)        │
                                                            │   - Storage (files)        │
                                                            │   - 65 Edge Functions      │
                                                            │     (Deno/TypeScript)      │
                                                            │   - pg_cron scheduled jobs │
                                                            └──────────────────────────┘
```

- **Frontend**: React + TypeScript + Vite + Tailwind + Radix UI, hosted on **Vercel**. Talks to Supabase directly using the public anon key (safe to expose — access is controlled by Row Level Security, not key secrecy).
- **Backend**: Supabase project `egsapqxzgjxgyckjbshz`, region `eu-west-2` (London) — satisfies the UK data residency requirement.
- **Business logic**: 65 Edge Functions (Deno/TypeScript) handle bookings, notifications (email via Resend, SMS via TheSMSWorks), admin authentication, calendar sync, marketing campaigns, etc.
- **Source control**: `github.com/ShawScope/ShawScope`, `main` branch.
- **Deployment**: every push to `main` automatically builds and deploys to production via GitHub Actions (see `docs/DEPLOYMENT.md` for the full walkthrough).
- **Live domain**: `https://shawscope.co.uk` (and `www.shawscope.co.uk`), DNS managed in Squarespace, SSL auto-issued and auto-renewed by Vercel.

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
| End-to-end tests | ✅ Done — booking workflow, login/MFA, patient records, file upload, user role separation, and production validation all verified against the live system |
| **Production deployment** | ✅ **Done** — live on Vercel with custom domain, SSL, and CI/CD via GitHub Actions |
| **Domain cutover** | ✅ **Done** — `shawscope.co.uk` DNS repointed from Lovable to Vercel on 24 June 2026, confirmed propagated with valid SSL |
| **Final data sync** | ✅ Done — all real bookings/patients/consent forms created on the live Lovable site between the original migration (17 June) and cutover (24 June) were merged in, verified against Lovable's own row counts |
| Handover documentation | ✅ This document, plus the supporting docs in §8 |

## 4. What's still outstanding

1. **Supabase plan.** The org is on the **Free plan**. The original plan called for Pro. Free plan has no built-in automated backups (worked around with a custom weekly backup job — see §6) and has lower compute/bandwidth limits. Decide whether to upgrade.
2. **The other 3 domains.** Matt confirmed he has four domains registered; only `shawscope.co.uk` is in use. Still waiting on his reply about what (if anything) to do with the other three (e.g. redirect to the primary domain, or unrelated/leave alone).
3. **E2E coverage, while now covering all major flows, doesn't cover every admin dashboard sub-feature** (e.g. marketing campaigns, governance registers beyond the ones manually tested). Acceptable for now; extend over time as needed.

Resolved since the previous version of this document:
- `GOOGLE_SERVICE_ACCOUNT_JSON` and `GA4_PROPERTY_ID` are set. Google OAuth client ID/secret intentionally skipped — Matt uses SMS-based admin login, not Gmail-based.
- The `gmail-heidi-poll` cron job (calling a function that never existed in this codebase) was investigated with Lovable and confirmed to be abandoned scaffolding from a May 2026 experiment. Removed. The real Heidi workflow in production use is a manual paste-in flow in `ConsultationFormDialog.tsx`, unaffected.
- **8-year patient data retention policy** is scheduled (monthly). Also correctly handles minors (retained until 25th/26th birthday per NHS guidance). Verified zero patients currently meet either threshold, so enabling it had no immediate effect.
- **Production deployment and domain cutover** — both complete, see §3.
- **Final data sync from the live site** — complete, see §3. All test data created during this engagement's own testing was identified and removed afterward (8 test appointments/patients across various test emails, cross-checked against the live system's own backup to confirm none of the 14 patients existing only in our database were contractor test data beyond one obvious "Test Patient" record).
- **Vercel hosting ownership** — the project was initially deployed under the contractor's personal Vercel account during build-out. It has since been fully transferred to Matt's own Vercel team (`shaw-scope`), and the GitHub Actions deployment credentials were updated and verified working under the new ownership. Matt now genuinely owns the hosting infrastructure, not just the domain pointing to it.
- **SMS reliability** — the system depended on a single static TheSMSWorks JWT, which went stale roughly 9 days after issue despite its embedded expiry claim suggesting much longer validity. Rebuilt to auto-generate fresh tokens from the API Key + Secret on every request (with automatic retry on a 401), so this category of failure shouldn't recur. Verified with real SMS sends to a UK number.

## 5. Where things live

| What | Where |
|---|---|
| Source code | `github.com/ShawScope/ShawScope`, `main` branch |
| Live site | `https://shawscope.co.uk` |
| Vercel project | `shaw-scope/shawscope` (Vercel dashboard, owned by Matt) |
| Database + backend | [Supabase Dashboard → egsapqxzgjxgyckjbshz](https://supabase.com/dashboard/project/egsapqxzgjxgyckjbshz) (London) |
| Database migrations (version controlled) | `supabase/migrations/` |
| Edge Function source | `supabase/functions/` |
| Frontend source | `src/` |
| E2E tests | `e2e/` |
| Deployment workflow | `.github/workflows/deploy.yml` |
| Backup snapshots | `system-backups` bucket in the Supabase dashboard (admin-only) |
| This documentation | `docs/` |
| Domain DNS | Squarespace (the domain registrar/DNS provider Matt uses) |

## 6. Operating the system day-to-day

- **Deployments**: automatic — every push to `main` on GitHub builds and deploys to production via GitHub Actions. See `docs/DEPLOYMENT.md` for the full workflow, manual deploy steps, and how to roll back a bad deploy.
- **Backups**: automatic, weekly (Sundays 03:00 UK time), data-only, kept for 6 weeks. See `docs/BACKUP_AND_ROLLBACK_PLAN.md` for full detail and disaster recovery steps.
- **Scheduled jobs** (`pg_cron`, visible in Supabase SQL editor via `SELECT * FROM cron.job;`):
  - `process-scheduled-comms` — every 5 min, sends queued booking emails/SMS
  - `scheduled-backup` — weekly, database backup
  - `monthly-blog-generation` — monthly, AI blog post generation
  - `cleanup-expired-patients` — monthly, 8-year (adult) / 25th-26th birthday (minor) patient data retention cleanup
- **Secrets/environment variables**: backend secrets managed in Supabase Dashboard → Settings → Edge Functions → Secrets; frontend env vars managed in the Vercel dashboard → Project Settings → Environment Variables. Never committed to git.
- **Rollback**: see `docs/BACKUP_AND_ROLLBACK_PLAN.md` for database/storage recovery scenarios, and `docs/DEPLOYMENT.md` for rolling back a bad frontend deploy.

## 7. Security & compliance summary

Full detail in `docs/COMPLIANCE_REVIEW.md`. Headline points:

- UK data residency: satisfied (London region)
- Encryption at rest and in transit: satisfied (Supabase platform default)
- Consent management, clinical governance records, audit logging: all in place and pre-existing in the application design
- RLS and least-privilege: reviewed and corrected (see §3)
- Data retention: scheduled monthly, adults (8 years) and minors (25th/26th birthday) both handled correctly

## 8. Supporting documentation

- `docs/DEPLOYMENT.md` — how the CI/CD pipeline works, how to deploy manually, how to roll back
- `docs/BACKUP_AND_ROLLBACK_PLAN.md` — backup locations, retention, disaster recovery procedures
- `docs/COMPLIANCE_REVIEW.md` — full security/compliance review with findings and fixes
- `docs/MIGRATION_SOURCE_NOTE.md` — explains a data provenance issue discovered mid-migration (the source database used was an intermediate copy, not the live project) and what it means going forward
- `e2e/README.md` — how to run and extend the E2E test suite
- Per-task EOD reports (in the project root) — detailed logs of work done on specific days/tasks

## 9. If something breaks

1. Check `docs/BACKUP_AND_ROLLBACK_PLAN.md` first — it has scenario-based recovery steps for data issues.
2. Check `docs/DEPLOYMENT.md` for frontend/deployment issues — how to roll back to a previous working deploy.
3. **The original Lovable-hosted project (`huiboexlxhafzywbdmpq`) has not been deleted** and could technically still be reverted to via DNS in an emergency — but it has not received any updates since the cutover on 24 June 2026, so reverting to it now would lose anything created on the new system since then. This is a last-resort option only, not a routine rollback.
4. All database changes made during this migration are captured as proper migration files in `supabase/migrations/` — these are reproducible and auditable, not just applied ad hoc.
