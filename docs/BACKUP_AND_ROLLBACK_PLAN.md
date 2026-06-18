# ShawScope — Database & Storage Backup and Rollback Plan

This document describes where backups are stored and how to roll back if something goes wrong. It does not contain any actual data — the backups themselves live in client-owned infrastructure (see below), never in this repository or on any contractor's personal machine.

---

## Where backups are stored

All backups are stored inside the client's own Supabase project (London, `egsapqxzgjxgyckjbshz`), in a private storage bucket called **`system-backups`**.

- This bucket is **not public** — it can only be accessed by an authenticated admin user or the service role key (enforced by RLS policy `backups_admin_only`).
- To view backups: log in to the [Supabase Dashboard](https://supabase.com/dashboard/project/egsapqxzgjxgyckjbshz/storage/buckets/system-backups) → Storage → `system-backups`.

### Current contents

```
system-backups/
└── 2026-06-18/
    ├── pre-migration-ireland/        ← snapshot of the OLD Lovable-managed project, taken just before migration
    │   ├── schema_dump.sql
    │   ├── data_dump.sql
    │   └── storage_manifest.json
    ├── current-london-state/          ← snapshot of the NEW client-owned project, taken right after migration was confirmed working
    │   ├── schema_dump.sql
    │   └── data_dump.sql
    └── storage-files/                 ← the actual file content (images, consent PDFs, audio, etc.) for all 86 files
        ├── accounts-receipts/...
        ├── blog-images/...
        ├── email-assets/...
        ├── governance/...
        └── shawscope/...
```

**Total: 91 files, ~93MB.** The SQL dumps only capture database *records* (e.g. which files exist and their paths) — they do not contain file bytes. `storage-files/` is the actual binary content (patient images, consent PDFs, audio recordings, etc.) and is the larger and more important part of this backup.

### Secondary safety net

The original Lovable-managed Supabase project (Ireland region, `mihnpfjsdudhldvyisdu`) has **not been deleted or altered** — it is still running with its original data intact. This is itself a live rollback target, independent of the SQL dump files above.

---

## Rollback procedures

### Scenario A — Critical issue with the new (London) system; need to revert to the old (Ireland) system immediately

1. Update `.env` and `supabase/config.toml` back to the Ireland project values (`mihnpfjsdudhldvyisdu`, with its matching anon key).
2. Redeploy the frontend.
3. Because the Ireland project was never deleted, this revert is effectively instant.
4. **Caveat:** anything created in London after the migration cutover (new bookings, new patients, etc.) will not exist in Ireland. This is a last-resort option for a critical failure, not a routine rollback.

### Scenario B — A specific table's data in London is corrupted or accidentally deleted

1. Download the relevant `data_dump.sql` from `system-backups/<date>/current-london-state/` (or a more recent backup if one has been taken since).
2. Extract the `INSERT` statements for just the affected table.
3. Restore those rows via `supabase db query --linked --file <extracted-rows>.sql`.
4. Avoid restoring the entire database from an old dump — that would overwrite legitimate newer data in unaffected tables.

### Scenario C — Storage files (patient images, consent PDFs, etc.) are lost or deleted

1. The actual file content for all 86 files is stored in `system-backups/2026-06-18/storage-files/`, organised by bucket and path — these are full copies, not just a list.
2. Missing files can be restored by downloading the relevant file from `storage-files/` and re-uploading it to the matching bucket/path via the Supabase Dashboard or CLI.
3. Anything created in London after the migration is not covered by this snapshot — see "Ongoing backup schedule" below for why regular re-backups matter.

### Scenario D — Full disaster recovery (the London project itself is lost or unusable)

1. Create a new Supabase project in a UK region (to remain compliant).
2. Apply the latest `schema_dump.sql` from `system-backups`.
3. Apply the latest `data_dump.sql` from `system-backups`.
4. Re-apply the `is_admin()` function and all RLS policies (documented in the Task 2 EOD).
5. Re-deploy all 64 Edge Functions from the GitHub repository (`github.com/ShawScope/ShawScope`).
6. Re-add all secrets (`THESMSWORKS_JWT`, `RESEND_API_KEY`, etc.).
7. Update `.env` / `config.toml` to point at the new project and redeploy the frontend.

This is the same process already used once for the original migration — it is proven and tested, not theoretical.

---

## Ongoing backup schedule

The Supabase organisation is on the **Free plan**, which does not include Supabase's built-in automated daily backups or point-in-time recovery (that's a Pro-tier feature, $25/month). In place of that, an automated backup has been built directly into the project:

- **Edge Function:** `scheduled-backup` — dynamically discovers every table in the public schema (via `get_public_tables()`) and exports all rows as JSON
- **Schedule:** every Sunday at 03:00 UK time, via `pg_cron` job `scheduled-backup`
- **Storage:** uploaded to `system-backups/automated/<date>/full_backup.json`
- **Retention:** automatically deletes automated backups older than 6 weeks, so storage doesn't grow unbounded

This runs independently of any manual action — no one needs to remember to take a backup. The original `2026-06-18/` snapshot (taken at migration cutover) is kept permanently as the "post-migration" baseline and is not subject to the 6-week rotation.

**Note:** this is a data-only backup (JSON export of all rows), not a full `pg_dump`. For schema changes, take a manual `supabase db dump --linked` schema backup before applying the change — the automated job does not capture schema/DDL changes.

If Matt upgrades to Supabase Pro in future, built-in daily backups + PITR would be a stronger guarantee and this custom job could be retired or kept as a secondary safety net.

This can be automated with a scheduled Edge Function + cron job if useful going forward.

---

## Verification

The migration from Ireland to London was verified row-for-row at cutover — every one of the 95 tables matched exactly between source and destination (e.g. 387 patients, 721 marketing campaigns, 2,249 activity log entries, 86 storage files — zero data loss).
