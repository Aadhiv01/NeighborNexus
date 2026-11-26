import { expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const MEMBER = "e2e/.auth/member.json";
export const MEMBER2 = "e2e/.auth/member2.json";
export const PROVIDER = "e2e/.auth/provider.json";

export async function logInThroughTheForm(page: Page, email: string, password = "password123") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).last().click();
}

/** Fails with a readable list if axe finds any accessibility violation on the current page. */
export async function expectNoAxeViolations(page: Page, label: string, options: { popupOpen?: boolean } = {}) {
  // Axe's findings come from JavaScript and are the same in every browser, so the scans run in
  // Chromium only. Known issue: in Firefox, axe's button-name rule crashes the renderer when a
  // dropdown list is open (the dropdown itself works there, and the other tests prove it).
  if (page.context().browser()?.browserType().name() !== "chromium") return;
  // Pages fade in even with reduced motion (only movement is removed). Axe must not measure
  // colours halfway through, so wait until the page content is fully opaque.
  await page.waitForFunction(() =>
    [...document.querySelectorAll("main > div, main li")].every((el) => getComputedStyle(el).opacity === "1")
  );
  // An open dropdown list is attached to the end of the page, outside any landmark. Axe's "region"
  // rule is a best-practice hint, not a failure of the list, and moving the list into <main>
  // breaks it. Every other rule still applies.
  const builder = new AxeBuilder({ page });
  if (options.popupOpen) builder.disableRules(["region"]);
  const { violations } = await builder.analyze();
  const summary = violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

/** Opens the day strip on a provider page until a day with at least `min` open times is found. */
export async function chooseDayWithSlots(page: Page, name: string, min = 2, fromDay = 0) {
  const days = page.locator(`input[name="${name}-day"]`);
  await days.first().waitFor(); // the picker only exists once the provider has loaded
  const count = await days.count();
  for (let i = fromDay; i < count; i += 1) {
    // A native click works even when the radio is visually hidden or scrolled out of its strip.
    await days.nth(i).evaluate((el) => (el as HTMLInputElement).click());
    await page.waitForTimeout(400);
    if ((await page.locator(`input[name="${name}-slot"]`).count()) >= min) return i;
  }
  throw new Error("No day with open times in the next two weeks. Is the seed data loaded?");
}

/** Opens the themed dropdown with this label and picks an option, the way a person would. */
export async function chooseOption(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

export const toastRegion = (page: Page) => page.getByRole("region", { name: "Notifications" });

/**
 * Selects a visually hidden radio the way the page's own label click would. Playwright's own
 * check({ force: true }) cannot toggle these in Firefox, so a native click on the input is used.
 */
export const pick = (radio: Locator) => radio.evaluate((el) => (el as HTMLInputElement).click());
