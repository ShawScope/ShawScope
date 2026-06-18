# End-to-end tests

Real browser tests using Playwright, run against the live Supabase backend
(not mocked). These guard the most critical user-facing flows: public
booking page navigation, admin login, and MFA.

## Running

```bash
npm run test:e2e
```

This starts a dev server on a dedicated port (5183, separate from the
default 3000 in case something else is already running there) and runs
all specs headless.

## Admin login credentials

The "logs in with password + SMS code" test needs real admin credentials
to run. Set them as environment variables (never commit them):

```bash
E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:e2e
```

Without these set, that one test skips automatically rather than failing.
The "rejects invalid credentials" test and all other specs don't need
credentials and always run.

See `.env.example` in this folder for the full list of variables.

## Why the booking flow test stops early

`booking-flow.spec.ts` only exercises the first two steps of the booking
wizard (people count -> service selection). Completing the full wizard
depends on live postcode/drive-time lookups and admin-configured
availability, and would create a real appointment in the production
database and trigger real notifications. That's tested manually instead
-- see the Task EOD notes. This test exists to catch the wizard itself
breaking (e.g. a service not rendering, navigation failing).

## Why the admin login test can complete a real login automatically

`send-otp` returns a `dev_code` in its response whenever SMS delivery
fails (used so non-UK test numbers can still log in during development).
The test admin account has a non-UK phone number, so this fires reliably,
letting the test read the code from the network response and complete a
real login without needing access to an actual phone.
