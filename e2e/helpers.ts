import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const MEMBER = "e2e/.auth/member.json";
export const PROVIDER = "e2e/.auth/provider.json";

export async function logInThroughTheForm(page: Page, email: string, password = "password123") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).last().click();
}

/** Fails with a readable list if axe finds any accessibility violation on the current page. */
export async function expectNoAxeViolations(page: Page, label: string) {
  // Pages fade in even with reduced motion (only movement is removed). Axe must not measure
  // colours halfway through, so wait until the page content is fully opaque.
  await page.waitForFunction(() =>
    [...document.querySelectorAll("main > div, main li")].every((el) => getComputedStyle(el).opacity === "1")
  );
  const { violations } = await new AxeBuilder({ page }).analyze();
  const summary = violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

/** Opens the day strip on a provider page until a day with at least `min` open times is found. */
export async function chooseDayWithSlots(page: Page, name: string, min = 2) {
  const days = page.locator(`input[name="${name}-day"]`);
  await days.first().waitFor(); // the picker only exists once the provider has loaded
  const count = await days.count();
  for (let i = 0; i < count; i += 1) {
    // A native click works even when the radio is visually hidden or scrolled out of its strip.
    await days.nth(i).evaluate((el) => (el as HTMLInputElement).click());
    await page.waitForTimeout(400);
    if ((await page.locator(`input[name="${name}-slot"]`).count()) >= min) return i;
  }
  throw new Error("No day with open times in the next two weeks. Is the seed data loaded?");
}

export const toastRegion = (page: Page) => page.getByRole("region", { name: "Notifications" });
