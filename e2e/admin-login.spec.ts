import { test, expect } from "@playwright/test";

/**
 * Full real end-to-end test of the admin login flow, run against the
 * actual Supabase backend (not mocked). Uses a test admin account with a
 * non-UK phone number, which reliably fails SMS delivery and causes
 * send-otp to return a `dev_code` in its response instead -- this lets
 * the test complete a real login without needing to read an actual SMS.
 *
 * Requires these env vars (see e2e/.env.example) -- no credentials are
 * hardcoded here on purpose:
 *   E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.describe("Admin login", () => {
  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-a-real-admin@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });

  test("logs in with password + SMS code and reaches the admin dashboard", async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run this test");

    // Capture the dev_code from the send-otp response so we can complete
    // the SMS step without needing a real phone.
    let devCode: string | null = null;
    page.on("response", async (response) => {
      if (response.url().includes("/functions/v1/send-otp")) {
        try {
          const body = await response.json();
          if (body?.dev_code) devCode = body.dev_code;
        } catch {
          // ignore non-JSON responses
        }
      }
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL as string);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD as string);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    // Should land on either the TOTP step or the SMS step depending on
    // whether this account has an authenticator enrolled. The test
    // account does not, so it should always be the SMS step. There are
    // two matches for "Code sent to" -- a toast and the card subtitle --
    // so target the heading specifically to disambiguate.
    await expect(page.getByRole("heading", { name: "Verify Your Identity" })).toBeVisible({ timeout: 15_000 });

    await expect.poll(() => devCode, {
      message: "waiting for send-otp to return a dev_code",
      timeout: 15_000,
    }).not.toBeNull();

    // The input-otp library renders a single real input (identifiable by
    // autocomplete="one-time-code") behind the visible digit slots, which
    // visually overlap it -- fill it directly rather than clicking through
    // the overlapping slot divs.
    // Filling all 6 digits triggers onComplete, which auto-submits --
    // no need to click Verify separately (and doing so risks clicking a
    // button that's already mid-navigation from the auto-submit).
    await page.locator('input[autocomplete="one-time-code"]').fill(devCode as string);

    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  });
});
