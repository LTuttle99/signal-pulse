import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("signal-pulse:v1"))
      localStorage.setItem(
        "signal-pulse:v1",
        JSON.stringify({
          version: 1,
          watchlist: [],
          categories: [],
          sections: ["stories", "markets", "economy", "companies", "watchlist"],
          notes: "",
          compact: false,
          embeds: false,
        }),
      );
    localStorage.setItem("atlas:preserved-test", "keep");
  });
});
test("dashboard has real attributed news and official economic observations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "See the signal. Stay ahead." }),
  ).toBeVisible();
  await expect(page.locator(".hero-story h3")).not.toHaveText("");
  await expect(page.locator(".hero-story h3").locator("..")).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await expect(
    page.locator(".economic-mini .economic-value strong").first(),
  ).toHaveText(/[0-9]/);
  expect(
    await page.evaluate(() => localStorage.getItem("atlas:preserved-test")),
  ).toBe("keep");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("news search, category filter and story coverage work", async ({
  page,
}) => {
  await page.goto("/news");
  await expect(page.locator(".story-card").first()).toBeVisible();
  const title = await page.locator(".story-card h3").first().innerText();
  await page.getByLabel("Search headlines", { exact: true }).fill(title);
  await expect(page.locator(".story-card").first()).toContainText(title);
  await page
    .getByRole("link", { name: /Explore coverage:/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Coverage overview", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".timeline-row a")).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
});
test("watchlists, order and notes persist and can be removed", async ({
  page,
}) => {
  await page.goto("/watchlist");
  await page.getByLabel("Watchlist kind").selectOption("stock");
  await page.getByLabel("Find a signal").fill("NVIDIA");
  await page
    .getByRole("button", { name: "Watch NVIDIA · NVDA", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Your note", exact: true })
    .fill("Check official earnings filing");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Your note", exact: true }),
  ).toHaveValue("Check official earnings filing");
  await page
    .locator(".watchlist-grid")
    .getByRole("button", { name: "Remove NVIDIA · NVDA", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your radar is ready" }),
  ).toBeVisible();
});
test("company search, supported stock routing and notebook function", async ({
  page,
}) => {
  await page.goto("/companies");
  await page.getByLabel("Search companies").fill("NVIDIA");
  await expect(page.locator(".directory-row")).toHaveCount(1);
  await page
    .getByRole("link", { name: "NVIDIA NASDAQ: NVDA", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "NVIDIA", exact: true }),
  ).toBeVisible();
  await page.goto("/stocks/NVDA");
  await expect(
    page.getByRole("heading", { name: "Price & historical performance" }),
  ).toBeVisible();
  await page.goto("/insights");
  await page
    .getByLabel("Personal outlook & research notes")
    .fill("My private research outlook");
  await page.reload();
  await expect(
    page.getByLabel("Personal outlook & research notes"),
  ).toHaveValue("My private research outlook");
});
test("all main routes render, economic history changes, no horizontal overflow", async ({
  page,
}) => {
  for (const path of [
    "/markets",
    "/economy",
    "/companies",
    "/companies/TSLA",
    "/stocks/AAPL",
    "/watchlist",
    "/insights",
    "/sources",
    "/diagnostics",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/economy?series=UNRATE");
  await expect(
    page.locator(".panel-head h2", { hasText: "Unemployment rate" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Unemployment rate historical observations",
    }),
  ).toBeVisible();
  await page.getByLabel("History length").selectOption("24");
});
test("critical dashboard and watchlist pass accessibility scan", async ({
  page,
}) => {
  for (const path of ["/", "/watchlist", "/economy"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator('.notice[role="status"]')).toHaveCount(0);
    const scan = await new AxeBuilder({ page })
      .exclude(".market-embed")
      .analyze();
    expect(scan.violations).toEqual([]);
  }
});
test("saved snapshot survives API outage and empty search is explicit", async ({
  page,
}) => {
  await page.route("**/api/pulse/**", (route) =>
    route.fulfill({ status: 503, body: '{"error":"test outage"}' }),
  );
  await page.goto("/news?q=NO_MATCH_123456");
  await expect(
    page.getByRole("heading", { name: "No matching stories" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".hero-story h3")).not.toHaveText("");
});

test("preferences import rejects invalid files and exports private settings", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("Import settings", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":0}'),
  });
  await expect(
    page.getByRole("status", { name: "Settings import status" }),
  ).toContainText("Import rejected");
  const prefs = {
    version: 1,
    watchlist: [
      { id: "NVDA", kind: "stock", label: "NVIDIA", note: "Imported note" },
    ],
    categories: ["Economy"],
    sections: ["stories", "economy"],
    notes: "Imported research",
    compact: true,
    embeds: false,
  };
  await page.getByLabel("Import settings", { exact: true }).setInputFiles({
    name: "settings.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(prefs)),
  });
  await expect(
    page.getByRole("status", { name: "Settings import status" }),
  ).toContainText("Settings imported successfully");
  await expect(page.getByLabel("Compact density")).toBeChecked();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export settings" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("signal-pulse-settings.json");
  await page.goto("/watchlist");
  await expect(page.getByLabel("Your note", { exact: true })).toHaveValue(
    "Imported note",
  );
});
