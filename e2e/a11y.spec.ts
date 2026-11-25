import { expect, test } from "@playwright/test";
import { MEMBER, PROVIDER, expectNoAxeViolations } from "./helpers";

// Motion is off so axe never measures colour mid fade-in.
test.use({ reducedMotion: "reduce" });

test.describe("accessibility: signed out", () => {
  for (const path of ["/", "/services", "/login", "/signup", "/lab"]) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expectNoAxeViolations(page, path);
    });
  }

  test("a provider page has no axe violations", async ({ page }) => {
    await page.goto("/services");
    await page.locator('a[href^="/services/"]').first().click();
    await expect(page.getByRole("heading", { name: "Book a service" })).toBeVisible();
    await expectNoAxeViolations(page, "provider page");
  });
});

test.describe("accessibility: member", () => {
  test.use({ storageState: MEMBER });
  for (const path of ["/dashboard/member", "/bookings", "/notifications"]) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expectNoAxeViolations(page, path);
    });
  }
});

test.describe("accessibility: provider", () => {
  test.use({ storageState: PROVIDER });
  for (const path of [
    "/dashboard/serviceprovider",
    "/dashboard/serviceprovider/bookings",
    "/dashboard/serviceprovider/services",
    "/dashboard/serviceprovider/availability",
    "/dashboard/serviceprovider/profile",
  ]) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expectNoAxeViolations(page, path);
    });
  }
});
