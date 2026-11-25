import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { MEMBER, PROVIDER, chooseDayWithSlots, toastRegion } from "./helpers";

/** Reads the "N unread." line on the Updates page. */
async function unreadCount(page: Page) {
  await page.goto("/notifications");
  const line = await page.getByText(/\d+ unread\.|all caught up/).first().innerText();
  return Number(line.match(/\d+/)?.[0] ?? 0);
}

test.describe.serial("a booking from start to finish, with both people kept informed", () => {
  let memberCtx: BrowserContext;
  let providerCtx: BrowserContext;
  let member: Page;
  let provider: Page;
  let providerUnreadBefore = 0;

  test.beforeAll(async ({ browser }) => {
    memberCtx = await browser.newContext({ storageState: MEMBER });
    providerCtx = await browser.newContext({ storageState: PROVIDER });
    member = await memberCtx.newPage();
    provider = await providerCtx.newPage();
    providerUnreadBefore = await unreadCount(provider);
  });
  test.afterAll(async () => {
    await memberCtx.close();
    await providerCtx.close();
  });

  test("a member books an open time", async () => {
    await member.goto("/services");
    await member.locator("a", { hasText: "Maya Chen" }).click();
    await expect(member.getByRole("heading", { name: "Book a service" })).toBeVisible();
    await chooseDayWithSlots(member, "book", 3);
    await member.locator('input[name="book-slot"]').first().check({ force: true });
    await member.getByRole("button", { name: /^Confirm/ }).click();
    await expect(member.getByText("Booked", { exact: true })).toBeVisible();
  });

  test("the member moves it to another time", async () => {
    await member.goto("/bookings");
    const row = member.getByRole("listitem").filter({ hasText: "Emergency leak repair" }).first();
    await row.getByRole("button", { name: /Reschedule/ }).click();
    await expect(member.getByRole("dialog")).toBeVisible();

    // Nothing to confirm until a different time is chosen.
    await expect(member.getByRole("button", { name: "Choose a new time" })).toBeDisabled();
    await member.locator('input[name="move-slot"]').nth(1).check({ force: true });
    await expect(member.getByText("Moving to:")).toBeVisible();
    await member.getByRole("button", { name: /^Move to/ }).click();

    await expect(toastRegion(member)).toContainText("Booking moved");
    await expect(member.getByText(/^Moved from/)).toBeVisible();
  });

  test("the provider is told about the booking and the move", async () => {
    expect(await unreadCount(provider)).toBeGreaterThanOrEqual(providerUnreadBefore + 2);
    await expect(provider.getByText("New booking").first()).toBeVisible();
    await expect(provider.getByText("Booking rescheduled").first()).toBeVisible();
    await expect(provider.getByRole("link", { name: /Updates/ })).toContainText("unread");
  });

  test("opening an update marks it read and shows the booking flagged as moved", async () => {
    const before = await unreadCount(provider);
    await provider.getByRole("button", { name: /Booking rescheduled/ }).first().click();
    await expect(provider).toHaveURL(/serviceprovider\/bookings$/);
    await expect(provider.getByText("Rescheduled", { exact: true }).first()).toBeVisible();
    expect(await unreadCount(provider)).toBe(before - 1);
  });

  test("the provider completes the job and the member is told", async () => {
    await provider.goto("/dashboard/serviceprovider/bookings");
    await provider.getByRole("button", { name: /Complete booking for/ }).first().click();
    await expect(toastRegion(provider)).toContainText("Booking updated");

    await member.goto("/notifications");
    await expect(member.getByText("Job marked complete").first()).toBeVisible();
    await member.getByRole("button", { name: "Mark all as read" }).click();
    await expect(member.getByText("You’re all caught up.")).toBeVisible();
  });

  test("a member can cancel through a confirmation, and the provider is told", async () => {
    await member.goto("/services");
    await member.locator("a", { hasText: "Maya Chen" }).click();
    await chooseDayWithSlots(member, "book", 2);
    await member.locator('input[name="book-slot"]').first().check({ force: true });
    await member.getByRole("button", { name: /^Confirm/ }).click();
    await expect(member.getByText("Booked", { exact: true })).toBeVisible();

    await member.goto("/bookings");
    await member.getByRole("button", { name: "Cancel", exact: true }).first().click();
    await expect(member.getByRole("alertdialog")).toBeVisible();
    await member.getByRole("button", { name: "Cancel booking" }).click();
    await expect(toastRegion(member)).toContainText("Booking canceled");

    await provider.goto("/notifications");
    await expect(provider.getByText("Booking canceled").first()).toBeVisible();
  });
});
