import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { MEMBER, PROVIDER, expectNoAxeViolations, toastRegion, pick } from "./helpers";

/** The first Monday to Friday at least `from` days ahead, as YYYY-MM-DD in local time. */
function weekday(from: number) {
  for (let i = from; i < from + 14; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() >= 1 && d.getDay() <= 5) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }
  throw new Error("no weekday found");
}
const DATE = weekday(4);

test.describe.serial("a provider's time off", () => {
  let providerCtx: BrowserContext;
  let memberCtx: BrowserContext;
  let provider: Page;
  let member: Page;

  test.beforeAll(async ({ browser }) => {
    providerCtx = await browser.newContext({ storageState: PROVIDER });
    memberCtx = await browser.newContext({ storageState: MEMBER });
    provider = await providerCtx.newPage();
    member = await memberCtx.newPage();
  });
  test.afterAll(async () => {
    await providerCtx.close();
    await memberCtx.close();
  });

  const block = async (setup: () => Promise<void> = async () => {}) => {
    await provider.goto("/dashboard/serviceprovider/availability");
    await provider.getByRole("button", { name: "Block time off" }).click();
    await expect(provider.getByRole("dialog")).toBeVisible();
    await provider.getByLabel(/First day|^Day$/).fill(DATE);
    await setup();
  };
  const removeAll = async () => {
    await provider.goto("/dashboard/serviceprovider/availability");
    const buttons = provider.getByRole("button", { name: /^Remove time off/ });
    // Count only once the list has loaded, or an unloaded list looks empty.
    await buttons.first().or(provider.getByText("No time off planned")).first().waitFor();
    while ((await buttons.count()) > 0) {
      await buttons.first().click();
      await expect(toastRegion(provider)).toContainText("Time off removed");
      await provider.waitForTimeout(300);
    }
  };
  /** The member opens Maya's page on DATE and returns the labels of the times offered. */
  const timesOffered = async () => {
    await member.goto("/services");
    await member.locator("a", { hasText: "Maya Chen" }).click();
    await expect(member.getByRole("heading", { name: "Book a service" })).toBeVisible();
    // Wait for the times for exactly this date, then for the loading placeholders to go.
    const answer = member.waitForResponse((r) => r.url().includes("/bookings/slots") && r.url().includes(`date=${DATE}`));
    await member.locator('input[type="date"]').fill(DATE);
    await answer;
    await expect(member.getByRole("status", { name: "Checking availability" })).toHaveCount(0);
    return member.locator('input[name="book-slot"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  };

  test("blocking a whole day removes it from what members can book, and removing it brings it back", async () => {
    expect((await timesOffered()).length).toBeGreaterThan(3);

    await block(async () => {
      await provider.getByLabel("Note to yourself").fill("Family trip");
    });
    await provider.getByRole("button", { name: "Block this time" }).click();
    await expect(toastRegion(provider)).toContainText("Time off added");
    await expect(provider.getByText("all day")).toBeVisible();
    await expect(provider.getByText("Family trip")).toBeVisible();

    expect(await timesOffered()).toHaveLength(0);
    await expect(member.getByText("Nothing open on")).toBeVisible();

    await removeAll();
    expect((await timesOffered()).length).toBeGreaterThan(3);
  });

  test("blocking some hours removes only the overlapping times", async () => {
    await block(async () => {
      await pick(provider.getByRole("radio", { name: "Some hours" }));
      await provider.getByLabel("From").fill("10:00");
      await provider.getByLabel("Until").fill("11:00");
    });
    await provider.getByRole("button", { name: "Block this time" }).click();
    await expect(toastRegion(provider)).toContainText("Time off added");

    const offered = await timesOffered();
    expect(offered).toContain("9:00 AM to 10:00 AM");
    expect(offered).toContain("11:00 AM to 12:00 PM");
    expect(offered).not.toContain("10:00 AM to 11:00 AM");
    expect(offered).not.toContain("9:30 AM to 10:30 AM");
    await removeAll();
  });

  test("a bad range is explained, not silently accepted", async () => {
    await block(async () => {
      await pick(provider.getByRole("radio", { name: "Some hours" }));
      await provider.getByLabel("From").fill("11:00");
      await provider.getByLabel("Until").fill("10:00");
    });
    await provider.getByRole("button", { name: "Block this time" }).click();
    await expect(provider.getByRole("alert")).toContainText("end time must be after the start time");
  });

  test("the dialog has no accessibility violations", async () => {
    await block();
    await provider.waitForTimeout(400);
    await expectNoAxeViolations(provider, "the time off dialog");
  });

  test.describe.serial("when bookings are already in the time", () => {
    test("the member books a time that will be blocked", async () => {
      await member.goto("/services");
      await member.locator("a", { hasText: "Maya Chen" }).click();
      await expect(member.getByRole("heading", { name: "Book a service" })).toBeVisible();
      const answer = member.waitForResponse((r) => r.url().includes("/bookings/slots") && r.url().includes(`date=${DATE}`));
      await member.locator('input[type="date"]').fill(DATE);
      await answer;
      await member.locator('input[name="book-slot"]').first().waitFor();
      await member.locator('input[name="book-slot"]').first().evaluate((el) => (el as HTMLInputElement).click());
      await member.getByRole("button", { name: /^Confirm/ }).click();
      await expect(member.getByText("Booked", { exact: true })).toBeVisible();
    });

    test("the provider is asked what to do, and going back changes nothing", async () => {
      await block();
      await provider.getByRole("button", { name: "Block this time" }).click();
      await expect(provider.getByText(/already in that time/)).toBeVisible();
      await expect(provider.getByText(/Alex Morgan/)).toBeVisible();
      await provider.getByRole("button", { name: "Back" }).click();
      await provider.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(provider.getByRole("button", { name: /^Remove time off/ })).toHaveCount(0);
    });

    test("keeping the booking blocks the rest of the day but leaves it upcoming", async () => {
      await block();
      await provider.getByRole("button", { name: "Block this time" }).click();
      await provider.getByRole("button", { name: /^Keep it and block the rest/ }).click();
      await expect(toastRegion(provider)).toContainText("Time off added");

      await member.goto("/bookings");
      await expect(member.getByRole("listitem").filter({ hasText: "Emergency leak repair" }).getByText("Upcoming")).toBeVisible();
      await removeAll();
    });

    test("canceling the booking tells the member and counts against the provider's record", async () => {
      await block();
      await provider.getByRole("button", { name: "Block this time" }).click();
      await provider.getByRole("button", { name: /^Cancel it and tell the member/ }).click();
      await expect(toastRegion(provider)).toContainText("canceled and the members told");

      await member.goto("/notifications");
      await expect(member.getByText("Your booking was canceled").first()).toBeVisible();
      await member.goto("/bookings");
      await pick(member.getByRole("radio", { name: "Past" }));
      await expect(member.getByText("Canceled", { exact: true }).first()).toBeVisible();

      await provider.goto("/dashboard/serviceprovider");
      await expect(provider.getByText("Canceled by you")).toBeVisible();
      await removeAll();
    });
  });
});
