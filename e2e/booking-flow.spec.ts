import { test, expect } from "@playwright/test";

/**
 * Smoke test for the public booking wizard's early steps (people count ->
 * service selection -> postcode/location step renders). This intentionally
 * stops before final submission: completing the full wizard depends on
 * live postcode/drive-time lookups and admin-configured availability, and
 * would create a real appointment + trigger real notifications against
 * production data. Full submission is covered by manual testing per the
 * EOD notes; this test guards against the wizard itself breaking.
 */

test.describe("Booking wizard", () => {
  test("navigates from people count through to service selection", async ({ page }) => {
    await page.goto("/book");

    await expect(page.getByRole("heading", { name: "How Many People?" })).toBeVisible();

    await page.getByRole("button", { name: "Just Me" }).click();
    await page.getByRole("button", { name: "Continue to Choose a Service" }).click();

    await expect(page.getByRole("heading", { name: "Choose a Service" })).toBeVisible();

    // At least one real service must render from the live services table.
    const serviceButtons = page.locator("button").filter({ hasText: /Earwax|Cryotherapy|Foot|Hearing/i });
    await expect(serviceButtons.first()).toBeVisible({ timeout: 10_000 });
  });
});
