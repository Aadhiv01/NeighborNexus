import { expect, test } from "@playwright/test";
import { chooseOption, expectNoAxeViolations, pick } from "./helpers";

test.describe("discovery", () => {
  test("every card says when that provider is next free", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByText(/Next free:/).first()).toBeVisible();
    expect(await page.getByText(/Next free:/).count()).toBe(4);
  });

  test("filters narrow the list and Clear brings it back", async ({ page }) => {
    await page.goto("/services");
    await expect(page.locator("ul li h2")).toHaveCount(4);
    await chooseOption(page, "Category", "Plumbing");
    await expect(page.locator("ul li h2")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("ul li h2")).toHaveCount(4);
  });

  test("sorting offers soonest, price and rating", async ({ page }) => {
    await page.goto("/services");
    await chooseOption(page, "Sort by", "Lowest price");
    await expect(page.locator("ul li h2").first()).toHaveText("Tom Alvarez"); // cheapest from $70
  });
});

test.describe("dropdowns", () => {
  test("are themed, not the browser's plain list", async ({ page }) => {
    await page.goto("/services");
    await expect(page.locator("select")).toHaveCount(0);
    const trigger = page.getByRole("combobox", { name: "Sort by" });
    // Same height as the search fields and large buttons, and the same soft corners.
    const box = await trigger.boundingBox();
    expect(Math.round(box!.height)).toBe(48);
    await trigger.click();
    await expect(page.getByRole("option", { name: "Soonest available" })).toBeVisible();
    await expectNoAxeViolations(page, "an open dropdown", { popupOpen: true });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("option", { name: "Soonest available" })).toHaveCount(0);
  });

  test("work with the keyboard alone", async ({ page }) => {
    await page.goto("/services");
    const trigger = page.getByRole("combobox", { name: "Sort by" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(trigger).toContainText("Lowest price");
    await expect(page.locator("ul li h2").first()).toHaveText("Tom Alvarez");
  });

  test("show which option is chosen", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("combobox", { name: "Category" }).click();
    await expect(page.getByRole("option", { name: "All categories" })).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("near me and the map", () => {
  test.use({ geolocation: { latitude: 43.6532, longitude: -79.3832 }, permissions: ["geolocation"] });

  test("near me sorts by distance and a radius drops far providers", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByRole("button", { name: /Near you/ })).toBeVisible();
    await expect(page.getByText(/(km|m) away/)).toHaveCount(4);
    expect(await page.locator("ul li h2").allInnerTexts()).toEqual(["Maya Chen", "Tom Alvarez", "Daniel Okafor", "Priya Raman"]);

    await chooseOption(page, "Within", "10 km");
    await expect(page.locator("ul li h2")).toHaveCount(2);
  });

  test("the map has a keyboard-reachable pin per located provider", async ({ page }) => {
    await page.goto("/services");
    await pick(page.getByRole("radio", { name: "Map" }));
    const pins = page.locator('button[aria-label*=", from $"]');
    await expect(pins).toHaveCount(4);

    // Mouse
    await pins.nth(1).click();
    await expect(page.getByText("View times →")).toBeVisible();
    // Keyboard
    await pins.nth(2).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("View times →")).toBeVisible();
  });
});

test.describe("denied location", () => {
  test.use({ permissions: [] });

  test("explains what to do instead of failing silently", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByRole("alert")).toContainText(/couldn’t get your location|can’t share a location/);
  });
});
