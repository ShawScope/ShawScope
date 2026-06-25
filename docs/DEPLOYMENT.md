# Deployment Workflow

How the site gets from a code change to live on `shawscope.co.uk`.

## The short version

**Push to `main` on GitHub → it's live within about a minute.** No manual steps required for a normal deploy.

## What actually happens

1. You push a commit to `main` on `github.com/ShawScope/ShawScope`
2. GitHub Actions picks it up (`.github/workflows/deploy.yml`) and runs:
   - Checks out the code
   - Installs the Vercel CLI
   - Pulls production environment variables from Vercel
   - Builds the app (`vercel build --prod`)
   - Deploys the built output to Vercel production (`vercel deploy --prebuilt --prod`)
3. Vercel serves the new build immediately on `shawscope.co.uk` and `www.shawscope.co.uk`

This whole process takes roughly 30–60 seconds and requires no manual intervention.

## Where things are configured

| What | Where |
|---|---|
| The workflow itself | `.github/workflows/deploy.yml` |
| Vercel project | `shaw-scope/shawscope` (owned by Matt's Vercel team) |
| Deploy credentials | GitHub repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (Settings → Secrets and variables → Actions on the GitHub repo) |
| Frontend environment variables | Vercel dashboard → `shawscope` project → Settings → Environment Variables (Production) |
| Custom domain | Vercel dashboard → `shawscope` project → Settings → Domains |

## Frontend environment variables

These are set directly on Vercel (not in this repo's `.env`, which is only for local development):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_PROJECT_ID` | `egsapqxzgjxgyckjbshz` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the anon key for that project |
| `VITE_SUPABASE_URL` | `https://egsapqxzgjxgyckjbshz.supabase.co` |
| `VITE_APP_URL` | `https://shawscope.co.uk` |

**Important:** these must be stored as **non-sensitive** type on Vercel, not "Sensitive." Sensitive-type variables cannot be read back even during the official build process — this caused a real outage early on, where the deployed site silently built with empty values and couldn't connect to Supabase at all. They're safe as non-sensitive because they're public client-side values anyway (the anon key is designed to be exposed in the browser bundle; access control is via Row Level Security, not key secrecy).

## Checking a deploy worked

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://shawscope.co.uk
```

Should return `200`. To check it's actually talking to the right backend:

```bash
curl -sL https://shawscope.co.uk | grep -oE '/assets/index-[^"]+\.js'
# then fetch that JS file and grep for the supabase project URL
```

## Deploying manually (if GitHub Actions is unavailable)

```bash
npm install -g vercel
cd "ShawScope Website & Booking Page"
vercel login          # one-time, opens a browser
vercel link --project shawscope   # one-time, links this folder to the Vercel project
vercel deploy --prod
```

## Rolling back a bad deploy

Vercel keeps every previous deployment. To roll back instantly without touching code:

1. Go to the Vercel dashboard → `shawscope` project → **Deployments**
2. Find the last known-good deployment
3. Click the **⋯** menu → **Promote to Production**

This swaps production traffic back to that build immediately — no rebuild needed. Once you've identified what broke, fix it in a new commit and push as normal; the broken commit doesn't need to be reverted in git first if you'd rather fix forward.

## Common issues

- **Site loads but shows blank/broken**: usually means routing — every client-side route needs the SPA rewrite rule in `vercel.json` to fall back to `index.html`. If that file is ever removed, every page except the homepage will 404.
- **Site loads but can't connect to anything (booking fails, login fails)**: check the env vars on Vercel are set as **non-sensitive** (see above) and actually have values — `vercel env ls production` shows names but not values; use `vercel env pull` and check the local file it generates to confirm real values are present.
- **New code not appearing after push**: check the GitHub Actions run actually succeeded (Actions tab on GitHub) — if the build step failed, the old deployment stays live, which is usually fine (fails safe) but means the fix didn't actually go out.
- **Deploy fails with an authorization/scope error after a project transfer or team change**: the `VERCEL_TOKEN` GitHub secret is tied to the team it was created under — if the project ever moves to a different team (as it did once, from a contractor's personal account to Matt's own `shaw-scope` team), a new token must be generated under that team and the `VERCEL_TOKEN`/`VERCEL_ORG_ID` GitHub secrets updated to match. `VERCEL_PROJECT_ID` typically stays the same across a transfer.
