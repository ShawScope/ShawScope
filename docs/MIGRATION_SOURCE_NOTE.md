# Migration Source — Important Note

## What actually happened

During the database migration, it was discovered that the data migrated to the new London Supabase project (`egsapqxzgjxgyckjbshz`) was sourced from an **intermediate copy project** (`mihnpfjsdudhldvyisdu`), not directly from the actual live Lovable-hosted production database (`huiboexlxhafzywbdmpq`, the project `shawscope.lovable.app` is wired to).

This was only discovered after the main migration was already complete and verified against the intermediate copy.

## The known gap

As of **18 June 2026**, the live project (`huiboexlxhafzywbdmpq`) has the following real customer records that exist there but **do not exist** in the migrated London database:

| Table | Missing rows | Most recent activity |
|---|---|---|
| `appointments` | 11 new | 2026-06-18 01:01 UTC |
| `patients` | 6 new | 2026-06-18 01:01 UTC |
| `consent_form_responses` | 8 new | 2026-06-18 09:20 UTC |

These are real bookings/patients/consent submissions made on the live site between **15–18 June 2026**.

## Decision

**This gap has been knowingly accepted and will not be backfilled.** This was a deliberate decision, not an oversight — confirmed 18 June 2026.

## Why this is acceptable right now

**The new self-hosted system is not live yet.** All real production traffic is still routed to the Lovable-hosted site (`shawscope.lovable.app` / `huiboexlxhafzywbdmpq`) — the London project is a pre-launch build, not yet serving real customers. This is expected and by design; the gap above is not an ongoing production incident.

## What must happen at actual go-live (cutover)

This 3-day gap was accepted as a one-time exception during build-out — it must **not** be repeated at the real cutover. When the site is ready to actually go live (DNS/production traffic switching to the new system):

1. Take a **final, complete export** from `huiboexlxhafzywbdmpq` covering everything up to the cutover moment
2. Migrate that final export into London using the same verified process used for the original migration (chunked data push, verified row-by-row)
3. Only switch DNS/production traffic over **after** that final sync is confirmed complete

Until that point, the live Lovable site remains the authoritative source of truth, and continuing to use it for real bookings is correct and expected.
