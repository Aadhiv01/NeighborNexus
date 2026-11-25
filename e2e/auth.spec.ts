import { expect, test } from "@playwright/test";
import { MEMBER, logInThroughTheForm, toastRegion } from "./helpers";

test.describe("signed out", () => {
  test("a wrong password shows the server's message", async ({ page }) => {
    await logInThroughTheForm(page, "alex@example.com", "not-the-password");
    await expect(page.getByRole("alert")).toContainText("Incorrect password");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("private pages send visitors to log in", async ({ page }) => {
    await page.goto("/dashboard/member");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("log in shows progress, confirms, then opens the dashboard with a transition", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __vt: number }).__vt = 0;
      const start = document.startViewTransition?.bind(document);
      if (start) {
        document.startViewTransition = (cb?: ViewTransitionUpdateCallback) => {
          (window as unknown as { __vt: number }).__vt += 1;
          return start(cb);
        };
      }
    });
    await logInThroughTheForm(page, "alex@example.com");

    // Progress first, then the confirmation, while still on the login page...
    await expect(page.getByRole("button", { name: "Signing in…" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Signed in" })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    // ...then the page changes, with a toast.
    await expect(page).toHaveURL(/\/dashboard\/member$/);
    await expect(toastRegion(page)).toContainText("Welcome back, Alex");
    expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBeGreaterThanOrEqual(1);
  });

  test("the dashboard opens already filled in, with no loading placeholders", async ({ page }) => {
    await logInThroughTheForm(page, "alex@example.com");
    await expect(page).toHaveURL(/\/dashboard\/member$/);
    // Checked straight away: the data was fetched during the "Signed in" beat.
    const placeholders = await page.evaluate(
      () => [...document.querySelectorAll("*")].filter((el) => getComputedStyle(el).animationName.includes("nn-shimmer")).length
    );
    expect(placeholders).toBe(0);
    await expect(page.getByRole("heading", { name: "Neighbours to try" })).toBeVisible({ timeout: 500 });
    await expect(page.locator("ul li h2").first()).toBeVisible({ timeout: 500 });
  });

  test("a wrong password is reported straight away, not after the minimum progress time", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("alex@example.com");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    const started = Date.now();
    await page.getByRole("button", { name: "Log in", exact: true }).last().click();
    await expect(page.getByRole("alert")).toContainText("Incorrect password");
    expect(Date.now() - started).toBeLessThan(850);
  });

  test("sign up creates an account and signs it in", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("First name").fill("Tess");
    await page.getByLabel("Last name").fill("Tester");
    await page.getByLabel("Email address").fill(`tess.${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("button", { name: "Account created" })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/member$/);
    await expect(toastRegion(page)).toContainText("Welcome to NeighborNexus, Tess");
  });

  test("a password mismatch is flagged and blocks the form", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password124");
    await expect(page.getByRole("alert")).toContainText("Passwords do not match");
    await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
  });

  test("the role boxes have breathing room above the name row", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel("First name")).toBeVisible();
    const gap = await page.evaluate(() => {
      const roles = [...document.querySelectorAll("fieldset")].find(
        (f) => f.querySelector(":scope > legend")?.textContent?.includes("I am joining as")
      )!;
      const first = document.querySelector('input[autocomplete="given-name"]')!.closest("div")!;
      return first.getBoundingClientRect().top - roles.getBoundingClientRect().bottom;
    });
    expect(gap).toBeGreaterThanOrEqual(16);
  });
});

test.describe("signed in as a member", () => {
  test.use({ storageState: MEMBER });

  test("opening /login or /signup goes to the dashboard instead", async ({ page }) => {
    for (const path of ["/login", "/signup"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard\/member$/);
    }
  });

  test("a provider page sends a member back to their own dashboard", async ({ page }) => {
    await page.goto("/dashboard/serviceprovider");
    await expect(page).toHaveURL(/\/dashboard\/member$/);
  });

  test("the footer shows member links", async ({ page }) => {
    await page.goto("/dashboard/member");
    await expect(page.locator("footer nav")).toContainText("My bookings");
    await expect(page.locator("footer nav")).not.toContainText("Offer your services");
  });

  test("log out shows progress, then returns to the login page with a toast", async ({ page }) => {
    await page.goto("/dashboard/member");
    await page.getByRole("button", { name: "Log out" }).first().click();
    await expect(page.getByRole("button", { name: "Logging out…" })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(toastRegion(page)).toContainText("logged out");
    await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
  });
});
