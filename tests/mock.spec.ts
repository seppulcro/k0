/**
 * k0 mock mode smoke tests
 *
 * Runs against http://localhost:5173?mock — no Tauri runtime required.
 * Uses window.__k0mock simulator to drive key events and assert SVG state.
 *
 * Run:   pnpm test
 * Watch: pnpm test --ui
 */

import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://localhost:5173" });

test.beforeEach(async ({ page }) => {
	await page.goto("/?mock");
	// Wait for SVG to mount
	await page.waitForSelector(".keymap-svg-wrapper svg");
});

test("SVG keymap renders in mock mode", async ({ page }) => {
	const svg = page.locator(".keymap-svg-wrapper svg");
	await expect(svg).toBeVisible();
	await page.screenshot({ path: "tests/screenshots/01-initial.png" });
});

test("Settings panel opens and shows mock device", async ({ page }) => {
	await page.click(".settings-btn");
	await expect(page.locator(".panel-overlay.open")).toBeVisible();
	// "Mock Keyboard" → root name strips "Keyboard" suffix → renders as "Mock"
	await expect(page.locator(".device-group summary")).toBeVisible({ timeout: 3000 });
	await expect(page.locator(".device-group summary")).toContainText("Mock");
	await page.screenshot({ path: "tests/screenshots/02-settings.png" });
});

test("pressKey highlights a key in the SVG", async ({ page }) => {
	// Press 'a' via simulator
	await page.evaluate(() =>
		(window as unknown as { __k0mock: { pressKey: (k: string) => void } }).__k0mock.pressKey("a"),
	);

	// A key with keypos class should have key-pressed
	const pressed = page.locator("[class*='keypos-'].key-pressed");
	await expect(pressed).toHaveCount(1);
	await page.screenshot({ path: "tests/screenshots/03-key-pressed.png" });

	await page.evaluate(() =>
		(window as unknown as { __k0mock: { releaseKey: (k: string) => void } }).__k0mock.releaseKey("a"),
	);
	await expect(pressed).toHaveCount(0);
});

test("typeSequence animates multiple keys", async ({ page }) => {
	await page.evaluate(async () => {
		const m = (window as unknown as { __k0mock: { typeSequence: (keys: string[], ms: number) => Promise<void> } }).__k0mock;
		await m.typeSequence(["h", "e", "l", "l", "o"], 80);
	});
	await page.screenshot({ path: "tests/screenshots/04-sequence.png" });
});

test("layerTour cycles through layers", async ({ page }) => {
	await page.evaluate(async () => {
		const m = (window as unknown as { __k0mock: { layerTour: (ms: number) => Promise<void> } }).__k0mock;
		await m.layerTour(300);
	});
	await page.screenshot({ path: "tests/screenshots/05-layer-tour.png" });
});
