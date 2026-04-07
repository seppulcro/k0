/**
 * Record a demo webm of k0 mock mode.
 * Output: assets/preview.webm
 *
 * Run: pnpm tsx scripts/record-demo.ts
 */

import { chromium } from "playwright";
import { copyFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:5173/?mock";
const OUT = "assets/preview.webm";
const TMP = "tmp-video";

async function delay(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

(async () => {
	mkdirSync(TMP, { recursive: true });

	const browser = await chromium.launch({ headless: true });
	const ctx = await browser.newContext({
		viewport: { width: 2560, height: 1440 },
		recordVideo: { dir: TMP, size: { width: 2560, height: 1440 } },
	});

	const page = await ctx.newPage();
	await page.goto(BASE);
	await page.waitForSelector(".keymap-svg-wrapper svg", { timeout: 10000 });
	await delay(600);

	// --- Act 1: type on the base layer ---
	await page.evaluate(async () => {
		const { typeSequence } = (window as any).__k0mock;
		await typeSequence(["a","s","d","f","g","h","j","k","l"], 100);
	});
	await delay(200);
	await page.evaluate(async () => {
		const { typeSequence } = (window as any).__k0mock;
		await typeSequence(["q","w","e","r","t","y","u","i","o","p"], 85);
	});
	await delay(300);

	// --- Act 2: open settings → Theme tab, cycle themes ---
	await page.click(".settings-btn");
	await page.waitForSelector(".panel-overlay.open");
	await page.locator(".panel-tabbar li", { hasText: "Theme" }).click();
	await delay(300);

	const themes = ["catppuccin-macchiato","tokyo-night","dracula","nord","gruvbox","catppuccin-latte","catppuccin-mocha"];
	for (const id of themes) {
		await page.locator(`.theme-swatch[data-id="${id}"]`).click().catch(async () => {
			// fallback: click by nth position via evaluate
			await page.evaluate((themeId) => {
				const el = document.querySelector(`.theme-swatch[data-id="${themeId}"]`) as HTMLElement | null;
				el?.click();
			}, id);
		});
		await delay(350);
		// type a few keys while theme is active
		await page.evaluate(async () => {
			const { typeSequence } = (window as any).__k0mock;
			await typeSequence(["a","s","d"], 80);
		});
		await delay(150);
	}

	// --- Act 3: Transition tab — demo each animation ---
	await page.locator(".panel-tabbar li", { hasText: "Theme" }).click();
	await delay(200);

	const transitions = ["smooth","bouncy","instant","snappy"];
	for (const id of transitions) {
		await page.locator(`.transition-btn[data-id="${id}"]`).click();
		await delay(200);
		await page.evaluate(async () => {
			const { typeSequence } = (window as any).__k0mock;
			await typeSequence(["f","j","f","j"], 90);
		});
		await delay(200);
	}

	// --- Act 4: layer tour with current theme ---
	await page.evaluate(async () => {
		const { layerTour } = (window as any).__k0mock;
		await layerTour(450);
	});
	await delay(200);

	// --- Act 5: close settings, clean finish ---
	await page.click(".settings-btn");
	await delay(600);

	await ctx.close();
	await browser.close();

	const files = readdirSync(TMP).filter((f) => f.endsWith(".webm"));
	if (!files.length) { console.error("No webm recorded"); process.exit(1); }
	copyFileSync(join(TMP, files[0]), OUT);
	console.log(`✓ Demo recorded → ${OUT}`);
})();
