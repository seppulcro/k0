export interface KeyPosition {
	pos: number;
	x: number;
	y: number;
}

export interface ParsedLayout {
	keys: KeyPosition[];
	viewBox: string;
}

export function parseLayout(svgText: string): ParsedLayout | null {
	if (typeof window === "undefined") return null;
	try {
		const container = document.createElement("div");
		container.innerHTML = svgText;
		const svgEl = container.querySelector("svg");
		if (!svgEl) return null;

		const firstLayer = [...svgEl.querySelectorAll("g")].find((g) =>
			/\blayer-\w/.test(g.getAttribute("class") ?? ""),
		);
		if (!firstLayer) return null;

		const layerGroups = svgEl.querySelectorAll("g[class*='layer-']");
		const layerHeight =
			layerGroups.length >= 2
				? getTranslateY(layerGroups[1]) - getTranslateY(layerGroups[0])
				: Number.parseFloat(svgEl.getAttribute("height") ?? "400");
		const svgWidth = Number.parseFloat(svgEl.getAttribute("width") ?? "732");

		const keys: KeyPosition[] = [];
		for (const g of firstLayer.querySelectorAll("g[class*='keypos-']")) {
			const posMatch = (g.getAttribute("class") ?? "").match(/keypos-(\d+)/);
			if (!posMatch) continue;
			const transform = g.getAttribute("transform") ?? "";
			const m = transform.match(/translate\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/);
			if (!m) continue;
			const layerOffset = getTranslateY(firstLayer.parentElement ?? firstLayer);
			keys.push({
				pos: Number.parseInt(posMatch[1], 10),
				x: Number.parseFloat(m[1]),
				y: Number.parseFloat(m[2]) - layerOffset,
			});
		}

		return {
			keys,
			viewBox: `0 0 ${svgWidth} ${layerHeight}`,
		};
	} catch (e) {
		console.error("parseLayout failed:", e);
		return null;
	}
}

function getTranslateY(el: Element): number {
	const m = (el.getAttribute("transform") ?? "").match(
		/translate\([^,]+,\s*([\d.-]+)\)/,
	);
	return m ? Number.parseFloat(m[1]) : 0;
}
