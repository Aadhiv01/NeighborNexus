import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

const CONCEPTS = [
  { label: "A · Editorial", heading: /Good help lives/, proof: "neighbours listed" },
  { label: "B · Live board", heading: /soonest opening is/, proof: "Maya Chen" },
  { label: "C · The street", heading: /Knock on a door/, proof: "Maya Chen" },
];

test.describe("landing lab", () => {
  test.use({ reducedMotion: "reduce" });

  for (const c of CONCEPTS) {
    test(`${c.label} shows real data, passes axe and fits a phone`, async ({ page }) => {
      await page.goto("/lab/landing");
      await page.getByRole("radio", { name: c.label }).check({ force: true });
      await expect(page.getByRole("heading", { level: 1 })).toContainText(c.heading);
      // Something that can only come from the seeded API is on the page.
      await expect(page.getByText(c.proof).first()).toBeVisible();
      if (c.label.startsWith("A")) await expect(page.getByLabel("4", { exact: true }).first()).toBeVisible();
      await expectNoAxeViolations(page, c.label);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      const o = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
      expect(o.s, `horizontal scroll on a phone for ${c.label}`).toBeLessThanOrEqual(o.c);
    });
  }

  test("the search hands over to discovery with the words typed", async ({ page }) => {
    await page.goto("/lab/landing");
    await page.getByLabel("What do you need done?").fill("drain");
    await page.getByRole("button", { name: "Find help" }).click();
    await expect(page).toHaveURL(/\/services\?q=drain/);
    await expect(page.getByLabel("What do you need done?")).toHaveValue("drain");
    await expect(page.locator("ul li h2")).toHaveCount(1); // only Maya has a drain service
  });

  test("a popular category chip opens discovery already filtered", async ({ page }) => {
    await page.goto("/lab/landing");
    await page.getByRole("link", { name: "Plumbing" }).first().click();
    await expect(page).toHaveURL(/category=Plumbing/);
    await expect(page.getByLabel("Category")).toHaveValue("Plumbing");
  });

  test("the street: choosing another house changes the details", async ({ page }) => {
    await page.goto("/lab/landing");
    await page.getByRole("radio", { name: "C · The street" }).check({ force: true });
    const houses = page.getByRole("group", { name: "Providers on the street" }).getByRole("button");
    await expect(houses).toHaveCount(4);
    await houses.nth(1).click();
    await expect(houses.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "View times" })).toBeVisible();
  });

  test("the charts are drawn from the real numbers in the database", async ({ page }) => {
    await page.goto("/lab/landing");
    await expect(page.getByText("Open times each day, across all providers").first()).toBeVisible();
    await expect(page.locator("figure ol li")).toHaveCount(7);
    // Maya is the only plumber: her two services are $120 and $180, so the average is $150.
    await expect(page.getByText("average $150")).toBeVisible();
    await expect(page.getByText("$120", { exact: true }).first()).toBeVisible();
  });

  test("the scroll-driven steps change their picture as you read", async ({ page }) => {
    await page.goto("/lab/landing");
    await page.getByRole("heading", { name: "Book, and change your mind" }).scrollIntoViewIfNeeded();
    await expect(page.getByText("Booked ✓").filter({ visible: true })).toBeVisible();
    await page.getByRole("heading", { name: "Find someone nearby" }).scrollIntoViewIfNeeded();
    await expect(page.getByText("leaking tap").filter({ visible: true })).toBeVisible();
  });

  test("the questions open and close", async ({ page }) => {
    await page.goto("/lab/landing");
    const q = page.getByText("Do I pay through the app?");
    await q.scrollIntoViewIfNeeded();
    await q.click();
    await expect(page.getByText("Not yet. Each service shows its price")).toBeVisible();
    await q.click();
    await expect(page.getByText("Not yet. Each service shows its price")).toBeHidden();
  });

  test("every concept is honest about being small and gives providers a path in the hero", async ({ page }) => {
    for (const c of CONCEPTS) {
      await page.goto("/lab/landing");
      await page.getByRole("radio", { name: c.label }).check({ force: true });
      await expect(page.getByText(/We are just getting started here, with 4 neighbours listed so far/)).toBeVisible();
      await page.getByRole("link", { name: "Set your weekly hours" }).first().click();
      await expect(page).toHaveURL(/\/signup$/);
    }
  });

  test("a category with one listing shows its price without an invented average", async ({ page }) => {
    await page.goto("/lab/landing");
    // Handyman has a single service at $70: show the price, not "average $70".
    await expect(page.getByText("average $70")).toHaveCount(0);
    await expect(page.getByText("$70", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Based on what 4 neighbours have listed so far/)).toBeVisible();
  });

  test("nothing on the page moves by itself", async ({ page }) => {
    await page.goto("/lab/landing");
    const moving = await page.evaluate(
      () => [...document.querySelectorAll("*")].filter((el) => {
        const n = getComputedStyle(el).animationName;
        return n !== "none" && !n.includes("nn-pulse");
      }).length
    );
    expect(moving).toBe(0);
  });

  test("the choice is remembered between visits", async ({ page }) => {
    await page.goto("/lab/landing");
    await page.getByRole("radio", { name: "B · Live board" }).check({ force: true });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/soonest opening is/);
  });
});
