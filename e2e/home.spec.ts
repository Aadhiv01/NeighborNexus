import { expect, test } from "@playwright/test";
import { MEMBER, PROVIDER, expectNoAxeViolations } from "./helpers";

test.describe("the home page, signed out", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows the headline, real data and passes axe", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Good help lives");
    await expect(page.getByText("neighbours listed", { exact: true })).toBeVisible();
    await expect(page.getByLabel("4", { exact: true }).first()).toBeVisible();
    await expect(page).toHaveTitle(/NeighborNexus/);
    await expectNoAxeViolations(page, "home");
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const o = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(o.s).toBeLessThanOrEqual(o.c);
  });

  test("the search hands over to discovery with the words typed", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("What do you need done?").fill("drain");
    await page.getByRole("button", { name: "Find help" }).click();
    await expect(page).toHaveURL(/\/services\?q=drain/);
    await expect(page.getByLabel("What do you need done?")).toHaveValue("drain");
    await expect(page.locator("ul li h2")).toHaveCount(1);
  });

  test("a popular category opens discovery already filtered", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Plumbing" }).first().click();
    await expect(page).toHaveURL(/category=Plumbing/);
    await expect(page.getByRole("combobox", { name: "Category" })).toContainText("Plumbing");
  });

  test("the charts are drawn from the real numbers", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Open times each day, across all providers")).toBeVisible();
    await expect(page.locator("figure ol li")).toHaveCount(7);
    // Maya is the only plumber: her services are $120 and $180, so the average is $150.
    await expect(page.getByText("average $150")).toBeVisible();
    // A category with one listing shows its price without an invented average.
    await expect(page.getByText("average $70")).toHaveCount(0);
    await expect(page.getByText(/Based on what 4 neighbours have listed so far/)).toBeVisible();
  });

  test("is honest about being small and gives providers a path in the hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/We are just getting started here, with 4 neighbours listed so far/)).toBeVisible();
    await page.getByRole("link", { name: "Set your weekly hours" }).first().click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("the steps change their picture as you read, and the questions open and close", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("heading", { name: "Book, and change your mind" }).scrollIntoViewIfNeeded();
    await expect(page.getByText("Booked ✓").filter({ visible: true })).toBeVisible();

    const q = page.getByText("Do I pay through the app?");
    await q.scrollIntoViewIfNeeded();
    await q.click();
    await expect(page.getByText("Not yet. Each service shows its price")).toBeVisible();
    await q.click();
    await expect(page.getByText("Not yet. Each service shows its price")).toBeHidden();
  });

  test("nothing on the page moves by itself", async ({ page }) => {
    await page.goto("/");
    const moving = await page.evaluate(
      () => [...document.querySelectorAll("*")].filter((el) => {
        const n = getComputedStyle(el).animationName;
        return n !== "none" && !n.includes("nn-pulse");
      }).length
    );
    expect(moving).toBe(0);
  });

  test("the header controls share one height and the hero column one width", async ({ page }) => {
    await page.goto("/");
    const h = async (loc: ReturnType<typeof page.locator>) => Math.round((await loc.first().boundingBox())!.height);
    const header = page.locator("header");
    expect(await h(header.getByRole("link", { name: "NeighborNexus" }))).toBe(36);
    expect(await h(header.getByRole("link", { name: "Find help" }))).toBe(36);
    expect(await h(header.getByRole("link", { name: "Log in" }))).toBe(36);
    expect(await h(header.getByRole("link", { name: "Sign up" }))).toBe(36);
    // Category chips match the buttons: same height and the same corner radius.
    const chip = page.getByRole("link", { name: "Plumbing" }).first();
    const button = header.getByRole("link", { name: "Sign up" });
    expect(await h(chip)).toBe(36);
    const radius = (l: typeof chip) => l.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(await radius(chip)).toBe(await radius(button));

    // The paragraph, the search box and the small print end at the same edge.
    const right = async (loc: typeof chip) => Math.round((await loc.boundingBox())!.x + (await loc.boundingBox())!.width);
    const para = page.getByText("Plumbers, cleaners and fixers").first();
    const form = page.getByRole("search", { name: "Search providers" });
    const note = page.getByText(/We are just getting started here/);
    const edges = [await right(form)];
    for (const el of [para, note]) {
      const box = await el.evaluate((n) => { const r = (n as HTMLElement).parentElement!.getBoundingClientRect(); return r.right; });
      edges.push(Math.round(box));
    }
    expect(Math.max(...edges) - Math.min(...edges)).toBeLessThanOrEqual(1);
  });

  test("the logo goes home and the header offers sign in", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("link", { name: "NeighborNexus" }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
  });
});

test.describe("the home page, signed in", () => {
  test("a member opening / goes to their dashboard", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: MEMBER });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard\/member$/);
    await ctx.close();
  });

  test("a provider opening / goes to their dashboard", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: PROVIDER });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard\/serviceprovider$/);
    await ctx.close();
  });
});
