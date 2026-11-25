import { expect, test } from "@playwright/test";
import { MEMBER, MEMBER2, chooseDayWithSlots, toastRegion } from "./helpers";

test("two members at once: a time taken by one disappears from the other's screen, and a stale pick is refused politely", async ({ browser }) => {
  const alexCtx = await browser.newContext({ storageState: MEMBER });
  const samCtx = await browser.newContext({ storageState: MEMBER2 });
  const alex = await alexCtx.newPage();
  const sam = await samCtx.newPage();

  const open = async (page: typeof alex) => {
    await page.goto("/services");
    await page.locator("a", { hasText: "Maya Chen" }).click();
    await expect(page.getByRole("heading", { name: "Book a service" })).toBeVisible();
    await chooseDayWithSlots(page, "book", 3);
    await expect(page.getByText("Updating live")).toBeVisible();
  };
  await open(alex);
  await open(sam);
  // Sam must be looking at the same day, so use the day Alex ended up on.
  const alexDay = await alex.locator('input[name="book-day"]:checked').evaluate((el) => el.closest("label")!.textContent);
  const samDays = sam.locator('input[name="book-day"]');
  for (let i = 0; i < (await samDays.count()); i += 1) {
    await samDays.nth(i).evaluate((el) => (el as HTMLInputElement).click());
    if ((await sam.locator('input[name="book-day"]:checked').evaluate((el) => el.closest("label")!.textContent)) === alexDay) break;
  }

  const firstTime = alex.locator('input[name="book-slot"]').first();
  const label = await firstTime.getAttribute("aria-label");
  const sameTimeFor = (page: typeof alex) => page.locator(`input[name="book-slot"][aria-label="${label}"]`);

  // Alex picks the time, and keeps the page open without pressing Confirm yet.
  await sameTimeFor(alex).evaluate((el) => (el as HTMLInputElement).click());
  await expect(alex.getByRole("button", { name: /^Confirm/ })).toBeEnabled();

  // Sam picks the same time and books it first.
  await sameTimeFor(sam).evaluate((el) => (el as HTMLInputElement).click());
  await sam.getByRole("button", { name: /^Confirm/ }).click();
  await expect(sam.getByText("Booked", { exact: true })).toBeVisible();

  // Alex's screen updates by itself: the time vanishes, the choice is cleared, and a message explains.
  await expect(sameTimeFor(alex)).toHaveCount(0);
  await expect(alex.getByText("Someone just booked that time")).toBeVisible();
  await expect(alex.getByRole("button", { name: "Select a time" })).toBeDisabled();

  // Clean up so later tests start from the same data: Sam cancels.
  await sam.goto("/bookings");
  await sam.getByRole("button", { name: "Cancel", exact: true }).first().click();
  await sam.getByRole("button", { name: "Cancel booking" }).click();
  await expect(toastRegion(sam)).toContainText("Booking canceled");

  // ...and the time comes back on Alex's screen without a refresh.
  await expect(sameTimeFor(alex)).toHaveCount(1);

  await alexCtx.close();
  await samCtx.close();
});

test("if the page has not caught up yet, confirming a taken time is refused with a clear message", async ({ browser, request }) => {
  const ctx = await browser.newContext({ storageState: MEMBER });
  const page = await ctx.newPage();
  await page.goto("/services");
  await page.locator("a", { hasText: "Maya Chen" }).click();
  await chooseDayWithSlots(page, "book", 3);
  const first = page.locator('input[name="book-slot"]').first();
  const label = await first.getAttribute("aria-label");
  await first.evaluate((el) => (el as HTMLInputElement).click());

  // Block the page's own refreshes so it cannot hear about the change, then take the time behind its back.
  await page.route("**/api/bookings/slots*", (route) => route.abort());
  await page.route("**/api/bookings/stream*", (route) => route.abort());
  const sam = await (await fetch("http://localhost:4100/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "sam@example.com", password: "password123" }) })).json();
  const providers = await (await request.get("http://localhost:4100/api/serviceprovider")).json();
  const maya = providers.find((p: { name: string }) => p.name === "Maya Chen");
  const day = await page.locator('input[name="book-day"]:checked').evaluate((el) => el.closest("label")!.textContent);
  expect(day).toBeTruthy();
  const date = await page.evaluate(() => (document.querySelector('input[type="date"]') as HTMLInputElement).value);
  const [start] = (label ?? "").split(" to ");
  const hhmm = new Date(`2000-01-01 ${start}`).toTimeString().slice(0, 5);
  const taken = await request.post("http://localhost:4100/api/bookings", {
    headers: { Authorization: `Bearer ${sam.token}` },
    data: { serviceProviderId: maya._id, serviceId: maya.services[0]._id, date, startTime: hhmm, endTime: `${String(Number(hhmm.slice(0, 2)) + 1).padStart(2, "0")}${hhmm.slice(2)}` },
  });
  expect(taken.status()).toBe(201);

  await page.getByRole("button", { name: /^Confirm/ }).click();
  await expect(page.getByText("Someone just booked that time")).toBeVisible();
  await expect(page.getByText("Booked", { exact: true })).toHaveCount(0);

  await request.delete(`http://localhost:4100/api/bookings/${(await taken.json())._id}`, { headers: { Authorization: `Bearer ${sam.token}` } });
  await ctx.close();
});
