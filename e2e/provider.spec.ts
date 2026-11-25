import { expect, test } from "@playwright/test";
import { PROVIDER, toastRegion } from "./helpers";

test.use({
  storageState: PROVIDER,
  geolocation: { latitude: 43.653226, longitude: -79.383184 },
  permissions: ["geolocation"],
});

test.describe.serial("provider tools", () => {
  test("add a service, then delete it behind a confirmation", async ({ page }) => {
    await page.goto("/dashboard/serviceprovider/services");
    await page.getByRole("button", { name: "Add a service" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Name").fill("Burst pipe repair");
    await page.getByLabel("Category").fill("Plumbing");
    await page.getByLabel("Price ($)").fill("180");
    await page.getByRole("button", { name: "Add service" }).click();
    await expect(page.getByRole("heading", { name: "Burst pipe repair" })).toBeVisible();

    await page.getByRole("button", { name: "Delete Burst pipe repair" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Delete service" }).click();
    await expect(toastRegion(page)).toContainText("Service deleted");
    await expect(page.getByRole("heading", { name: "Burst pipe repair" })).toHaveCount(0);
  });

  test("a service form rejects a missing name instead of saving it", async ({ page }) => {
    await page.goto("/dashboard/serviceprovider/services");
    await page.getByRole("button", { name: "Add a service" }).click();
    await page.getByLabel("Name").fill("   ");
    await page.getByRole("button", { name: "Add service" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("set weekday hours with the preset and save them", async ({ page }) => {
    await page.goto("/dashboard/serviceprovider/availability");
    await page.getByRole("button", { name: "Set weekdays 9 to 5" }).click();
    await expect(page.getByText("unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Save availability" }).click();
    await expect(toastRegion(page)).toContainText("Availability saved");

    await page.reload();
    await expect(page.getByLabel("Monday window 1 start")).toHaveValue("09:00");
    await expect(page.getByLabel("Friday window 1 end")).toHaveValue("17:00");
  });

  test("overlapping hours are refused with a clear message", async ({ page }) => {
    await page.goto("/dashboard/serviceprovider/availability");
    await page.getByRole("button", { name: "Add hours on Monday" }).click();
    await page.getByLabel("Monday window 2 start").fill("10:00");
    await page.getByLabel("Monday window 2 end").fill("11:00");
    await page.getByRole("button", { name: "Save availability" }).click();
    await expect(page.getByRole("alert")).toContainText("overlaps");
  });

  test("edit the profile", async ({ page }) => {
    await page.goto("/dashboard/serviceprovider/profile");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Phone").fill("555-0100");
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(toastRegion(page)).toContainText("Profile saved");
    await expect(page.getByText("555-0100")).toBeVisible();
  });

  test("save and remove the map location, rounded to about 1 km", async ({ page, request }) => {
    await page.goto("/dashboard/serviceprovider/profile");
    await page.getByRole("button", { name: /Use my current location|Update from my location/ }).click();
    await expect(toastRegion(page)).toContainText("Map location saved");

    // The server rounds it: the exact input was 43.653226, -79.383184.
    const mine = await (await request.get("http://localhost:4100/api/serviceprovider")).json();
    const maya = mine.find((p: { name: string }) => p.name === "Maya Chen");
    expect(maya.geo.coordinates).toEqual([-79.38, 43.65]);

    await page.getByRole("button", { name: "Remove" }).click();
    await expect(toastRegion(page)).toContainText("Map location removed");
  });

  test("a provider sees no booking button on another provider's page, and an edit prompt on their own", async ({ page }) => {
    await page.goto("/services");
    await page.locator("a", { hasText: "Daniel Okafor" }).click();
    await expect(page.getByText("Providers can’t book other providers")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Confirm|Sign in to book/ })).toHaveCount(0);

    await page.goto("/services");
    await page.locator("a", { hasText: "Maya Chen" }).click();
    await expect(page.getByText("This is how members see you.")).toBeVisible();
  });

  test("the footer shows provider links and the dashboard shows the right tools", async ({ page }) => {
    await page.goto("/dashboard/serviceprovider");
    await expect(page.locator("footer nav")).toContainText("Availability");
    await expect(page.getByRole("heading", { name: /Welcome back, Maya/ })).toBeVisible();
  });
});
