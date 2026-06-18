import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("homepage loads with key content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ShawScope/i);
  });

  test("booking page is reachable from the homepage", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /book/i }).first().click();
    await expect(page).toHaveURL(/\/book/);
  });

  test("login page renders the admin sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
  });
});
