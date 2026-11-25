import { expect, test } from "@playwright/test";

test.describe("discovery", () => {
  test("every card says when that provider is next free", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByText(/Next free:/).first()).toBeVisible();
    expect(await page.getByText(/Next free:/).count()).toBe(4);
  });

  test("filters narrow the list and Clear brings it back", async ({ page }) => {
    await page.goto("/services");
    await expect(page.locator("ul li h2")).toHaveCount(4);
    await page.getByLabel("Category").selectOption("Plumbing");
    await expect(page.locator("ul li h2")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("ul li h2")).toHaveCount(4);
  });

  test("sorting offers soonest, price and rating", async ({ page }) => {
    await page.goto("/services");
    await page.getByLabel("Sort by").selectOption("price");
    await expect(page.locator("ul li h2").first()).toHaveText("Tom Alvarez"); // cheapest from $70
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

    await page.getByLabel("Within").selectOption("10");
    await expect(page.locator("ul li h2")).toHaveCount(2);
  });

  test("the map has a keyboard-reachable pin per located provider", async ({ page }) => {
    await page.goto("/services");
    await page.getByRole("radio", { name: "Map" }).check({ force: true });
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
