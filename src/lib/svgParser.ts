/**
 * Parses a keymap-drawer SVG into a single physical keyboard layout.
 *
 * Strategy:
 * - Extract per-layer, per-keypos label data from ALL layer groups
 * - Keep only the first (base) layer group as the live visual template
 * - Adjust the SVG viewBox to fit one layer
 * - Inject k0 CSS for key-pressed / key-layer-held states with CSS variable hooks
 *
 * Callers then imperatively update text content on layer switch and
 * toggle CSS classes on key press — no re-renders, no SVG redraws.
 */

export interface TextNode {
	content: string;
	/** Original class attribute — preserved so hold/layer-activator styling survives label swaps */
	className: string;
}

export interface KeyLabels {
	texts: TextNode[];
}

/** keypos index → labels */
export type LayerLabelMap = Map<number, KeyLabels>;

/** layer name → per-keypos labels */
export type AllLayerLabels = Map<string, LayerLabelMap>;

export interface ParsedSVG {
	/** Live SVGSVGElement from DOMParser — adopt into the document with document.adoptNode() */
	svgElement: SVGSVGElement;
	allLabels: AllLayerLabels;
	layerNames: string[];
	width: number;
	height: number;
}

const K0_CSS = `
/* k0: override SVG hardcoded fills with theme vars.
   Fallback values match the default Catppuccin Mocha theme. */
g[class*="keypos-"] rect.key {
  fill: var(--k0-key-fill, #45475a) !important;
  stroke: var(--k0-key-stroke, #585b70) !important;
}
g[class*="keypos-"] rect.side {
  fill: var(--k0-key-fill, #45475a) !important;
  filter: brightness(75%);
}
g[class*="keypos-"] text {
  fill: var(--k0-key-text, #cdd6f4) !important;
}

/* k0: transitions */
g[class*="keypos-"] rect.key,
g[class*="keypos-"] rect.side {
  transition:
    fill var(--k0-key-transition-duration, 60ms) var(--k0-key-transition-easing, ease-out),
    stroke var(--k0-key-transition-duration, 60ms) var(--k0-key-transition-easing, ease-out);
}
g[class*="keypos-"] text {
  transition: fill var(--k0-key-transition-duration, 60ms) var(--k0-key-transition-easing, ease-out);
}

/* k0: key pressed */
g.key-pressed rect.key {
  fill: var(--k0-key-pressed-fill, #cba6f7) !important;
  stroke: var(--k0-key-pressed-stroke, #d4b0f8) !important;
}
g.key-pressed rect.side {
  fill: var(--k0-key-pressed-fill, #cba6f7) !important;
  filter: brightness(75%) !important;
}
g.key-pressed text {
  fill: var(--k0-key-pressed-text, #1e1e2e) !important;
}

/* k0: layer activator held */
g.key-layer-held rect.key {
  fill: var(--k0-layer-held-fill, #89b4fa) !important;
  stroke: var(--k0-layer-held-stroke, #99c0fc) !important;
  transition-duration: var(--k0-layer-transition-duration, 40ms) !important;
}
g.key-layer-held rect.side {
  fill: var(--k0-layer-held-fill, #89b4fa) !important;
  filter: brightness(75%) !important;
  transition-duration: var(--k0-layer-transition-duration, 40ms) !important;
}
g.key-layer-held text {
  fill: var(--k0-layer-held-text, #1e1e2e) !important;
  transition-duration: var(--k0-layer-transition-duration, 40ms) !important;
}
`;

function getTranslateY(el: Element): number {
	const m = (el.getAttribute("transform") ?? "").match(
		/translate\([^,]+,\s*([\d.-]+)\)/,
	);
	return m ? Number.parseFloat(m[1]) : 0;
}

export function parseSVG(svgText: string): ParsedSVG | null {
	if (typeof window === "undefined") return null;
	try {
		// Use innerHTML on a detached div — avoids DOMParser MIME restrictions in Tauri WebView
		const container = document.createElement("div");
		container.innerHTML = svgText;
		const svgEl = container.querySelector("svg") as SVGSVGElement | null;
		if (!svgEl) return null;

		const layerGroups: Element[] = [];
		for (const g of svgEl.querySelectorAll("g")) {
			if (/\blayer-\w/.test(g.getAttribute("class") ?? "")) {
				layerGroups.push(g);
			}
		}
		if (layerGroups.length === 0) return null;

		const allLabels: AllLayerLabels = new Map();
		const layerNames: string[] = [];

		for (const layerGroup of layerGroups) {
			const layerName = (layerGroup.getAttribute("class") ?? "").match(
				/layer-(\S+)/,
			)?.[1];
			if (!layerName) continue;
			layerNames.push(layerName);
			const layerMap: LayerLabelMap = new Map();
			for (const keyGroup of layerGroup.querySelectorAll(
				"[class*='keypos-']",
			)) {
				const posMatch = (keyGroup.getAttribute("class") ?? "").match(
					/keypos-(\d+)/,
				);
				if (!posMatch) continue;
				const pos = Number.parseInt(posMatch[1], 10);
				const texts = [...keyGroup.querySelectorAll("text")].map((t) => ({
					content: t.textContent?.trim() ?? "",
					className: t.getAttribute("class") ?? "",
				}));
				layerMap.set(pos, { texts });
			}
			allLabels.set(layerName, layerMap);
		}

		const layerHeight =
			layerGroups.length >= 2
				? getTranslateY(layerGroups[1]) - getTranslateY(layerGroups[0])
				: Number.parseFloat(svgEl.getAttribute("height") ?? "400");
		const svgWidth = Number.parseFloat(svgEl.getAttribute("width") ?? "732");

		for (let i = 1; i < layerGroups.length; i++) layerGroups[i].remove();
		for (const t of layerGroups[0].querySelectorAll("text.label")) t.remove();

		svgEl.setAttribute("height", String(layerHeight));
		svgEl.setAttribute("viewBox", `0 0 ${svgWidth} ${layerHeight}`);
		svgEl.setAttribute("width", "100%");

		const styleEl = svgEl.querySelector("style");
		if (styleEl) {
			styleEl.textContent += K0_CSS;
		} else {
			const newStyle = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"style",
			);
			newStyle.textContent = K0_CSS;
			svgEl.prepend(newStyle);
		}

		return {
			svgElement: svgEl as unknown as SVGSVGElement,
			allLabels,
			layerNames,
			width: svgWidth,
			height: layerHeight,
		};
	} catch (e) {
		console.error("parseSVG failed:", e);
		return null;
	}
}

/**
 * Swap text labels inside keypos elements to reflect a new active layer.
 * Only touches textContent — preserves all class attributes and SVG structure.
 */
export function updateSVGLabels(
	svg: Element,
	targetLabels: LayerLabelMap,
	baseLabels: LayerLabelMap,
): void {
	// Update keys that exist in the target layer
	for (const [pos, label] of targetLabels) {
		const keyGroup = svg.querySelector(`.keypos-${pos}`);
		if (!keyGroup) continue;
		const textEls = keyGroup.querySelectorAll("text");
		textEls.forEach((el, i) => {
			const newContent = label.texts[i]?.content ?? "";
			if (el.textContent !== newContent) el.textContent = newContent;
		});
	}

	// Clear text for keys in base but absent in the target layer (transparent/empty)
	for (const [pos] of baseLabels) {
		if (targetLabels.has(pos)) continue;
		const keyGroup = svg.querySelector(`.keypos-${pos}`);
		if (!keyGroup) continue;
		for (const el of keyGroup.querySelectorAll("text")) {
			el.textContent = "";
		}
	}
}
