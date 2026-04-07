/**
 * Theme loader — applies all CSS custom properties from theme.json to :root.
 *
 * Every visual knob the user wants to tweak is a CSS var. The SVG's injected
 * k0 CSS references these vars, so changing theme.json is all that's needed
 * to restyle pressed keys, layer-activator colors, and transitions.
 *
 * theme.json shape:
 * {
 *   "cssVars": {
 *     "--k0-key-pressed-fill": "#7c3aed",
 *     "--k0-key-transition-duration": "80ms",
 *     ...
 *   }
 * }
 */

export interface ThemeJSON {
	cssVars: Record<string, string>;
}

export function applyTheme(theme: ThemeJSON): void {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	for (const [key, value] of Object.entries(theme.cssVars)) {
		root.style.setProperty(key, value);
	}
}
