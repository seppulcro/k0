export interface Theme {
	label: string;
	vars: Record<string, string>;
}

export const TRANSITIONS: Record<
	string,
	{ label: string; duration: string; easing: string; layerDuration: string }
> = {
	snappy: {
		label: "Snappy",
		duration: "60ms",
		easing: "ease-out",
		layerDuration: "40ms",
	},
	smooth: {
		label: "Smooth",
		duration: "120ms",
		easing: "ease-in-out",
		layerDuration: "80ms",
	},
	bouncy: {
		label: "Bouncy",
		duration: "200ms",
		easing: "cubic-bezier(.34,1.56,.64,1)",
		layerDuration: "120ms",
	},
	instant: {
		label: "Instant",
		duration: "0ms",
		easing: "linear",
		layerDuration: "0ms",
	},
};

export const THEMES: Record<string, Theme> = {
	"catppuccin-mocha": {
		label: "Catppuccin Mocha",
		vars: {
			"--k0-bg": "#1e1e2e",
			"--k0-surface": "#313244",
			"--k0-text": "#cdd6f4",
			"--k0-subtext": "#a6adc8",
			"--k0-key-fill": "#45475a",
			"--k0-key-stroke": "#585b70",
			"--k0-key-text": "#cdd6f4",
			"--k0-key-pressed-fill": "#cba6f7",
			"--k0-key-pressed-stroke": "#d4b0f8",
			"--k0-key-pressed-text": "#1e1e2e",
			"--k0-layer-held-fill": "#89b4fa",
			"--k0-layer-held-stroke": "#99c0fc",
			"--k0-layer-held-text": "#1e1e2e",
		},
	},
	"catppuccin-macchiato": {
		label: "Catppuccin Macchiato",
		vars: {
			"--k0-bg": "#24273a",
			"--k0-surface": "#363a4f",
			"--k0-text": "#cad3f5",
			"--k0-subtext": "#a5adcb",
			"--k0-key-fill": "#494d64",
			"--k0-key-stroke": "#5b6078",
			"--k0-key-text": "#cad3f5",
			"--k0-key-pressed-fill": "#c6a0f6",
			"--k0-key-pressed-stroke": "#d0aff7",
			"--k0-key-pressed-text": "#24273a",
			"--k0-layer-held-fill": "#8aadf4",
			"--k0-layer-held-stroke": "#9ab8f5",
			"--k0-layer-held-text": "#24273a",
		},
	},
	"catppuccin-frappe": {
		label: "Catppuccin Frappé",
		vars: {
			"--k0-bg": "#303446",
			"--k0-surface": "#414559",
			"--k0-text": "#c6d0f5",
			"--k0-subtext": "#a5adce",
			"--k0-key-fill": "#51576d",
			"--k0-key-stroke": "#626880",
			"--k0-key-text": "#c6d0f5",
			"--k0-key-pressed-fill": "#ca9ee6",
			"--k0-key-pressed-stroke": "#d4abe8",
			"--k0-key-pressed-text": "#303446",
			"--k0-layer-held-fill": "#8caaee",
			"--k0-layer-held-stroke": "#9cb6f0",
			"--k0-layer-held-text": "#303446",
		},
	},
	"catppuccin-latte": {
		label: "Catppuccin Latte",
		vars: {
			"--k0-bg": "#eff1f5",
			"--k0-surface": "#ccd0da",
			"--k0-text": "#4c4f69",
			"--k0-subtext": "#6c6f85",
			"--k0-key-fill": "#dce0e8",
			"--k0-key-stroke": "#bcc0cc",
			"--k0-key-text": "#4c4f69",
			"--k0-key-pressed-fill": "#8839ef",
			"--k0-key-pressed-stroke": "#9046f5",
			"--k0-key-pressed-text": "#eff1f5",
			"--k0-layer-held-fill": "#1e66f5",
			"--k0-layer-held-stroke": "#2870f6",
			"--k0-layer-held-text": "#eff1f5",
		},
	},
	"tokyo-night": {
		label: "Tokyo Night",
		vars: {
			"--k0-bg": "#1a1b26",
			"--k0-surface": "#24283b",
			"--k0-text": "#c0caf5",
			"--k0-subtext": "#9aa5ce",
			"--k0-key-fill": "#292e42",
			"--k0-key-stroke": "#3b4261",
			"--k0-key-text": "#c0caf5",
			"--k0-key-pressed-fill": "#bb9af7",
			"--k0-key-pressed-stroke": "#c5a9f8",
			"--k0-key-pressed-text": "#1a1b26",
			"--k0-layer-held-fill": "#7aa2f7",
			"--k0-layer-held-stroke": "#89aef8",
			"--k0-layer-held-text": "#1a1b26",
		},
	},
	dracula: {
		label: "Dracula",
		vars: {
			"--k0-bg": "#282a36",
			"--k0-surface": "#383a59",
			"--k0-text": "#f8f8f2",
			"--k0-subtext": "#6272a4",
			"--k0-key-fill": "#44475a",
			"--k0-key-stroke": "#6272a4",
			"--k0-key-text": "#f8f8f2",
			"--k0-key-pressed-fill": "#bd93f9",
			"--k0-key-pressed-stroke": "#c9a8fa",
			"--k0-key-pressed-text": "#282a36",
			"--k0-layer-held-fill": "#8be9fd",
			"--k0-layer-held-stroke": "#9cebfd",
			"--k0-layer-held-text": "#282a36",
		},
	},
	nord: {
		label: "Nord",
		vars: {
			"--k0-bg": "#2e3440",
			"--k0-surface": "#3b4252",
			"--k0-text": "#eceff4",
			"--k0-subtext": "#d8dee9",
			"--k0-key-fill": "#434c5e",
			"--k0-key-stroke": "#4c566a",
			"--k0-key-text": "#eceff4",
			"--k0-key-pressed-fill": "#b48ead",
			"--k0-key-pressed-stroke": "#bea0b9",
			"--k0-key-pressed-text": "#2e3440",
			"--k0-layer-held-fill": "#88c0d0",
			"--k0-layer-held-stroke": "#97c8d5",
			"--k0-layer-held-text": "#2e3440",
		},
	},
	gruvbox: {
		label: "Gruvbox",
		vars: {
			"--k0-bg": "#282828",
			"--k0-surface": "#3c3836",
			"--k0-text": "#ebdbb2",
			"--k0-subtext": "#a89984",
			"--k0-key-fill": "#504945",
			"--k0-key-stroke": "#665c54",
			"--k0-key-text": "#ebdbb2",
			"--k0-key-pressed-fill": "#d3869b",
			"--k0-key-pressed-stroke": "#d98fa5",
			"--k0-key-pressed-text": "#282828",
			"--k0-layer-held-fill": "#83a598",
			"--k0-layer-held-stroke": "#90afa9",
			"--k0-layer-held-text": "#282828",
		},
	},
};

export function applyTheme(themeId: string, transitionId = "snappy") {
	const theme = THEMES[themeId] ?? THEMES["catppuccin-mocha"];
	const transition = TRANSITIONS[transitionId] ?? TRANSITIONS.snappy;
	const root = document.documentElement;

	for (const [key, val] of Object.entries(theme.vars)) {
		root.style.setProperty(key, val);
	}
	// Bridge k0 vars → matcha vars so matcha-styled elements pick up the theme
	root.style.setProperty("--bg-default", theme.vars["--k0-bg"]);
	root.style.setProperty("--default", theme.vars["--k0-text"]);
	root.style.setProperty("--muted", theme.vars["--k0-subtext"]);
	root.style.setProperty("--bg-subtle", theme.vars["--k0-surface"]);
	root.style.setProperty("--bd-muted", theme.vars["--k0-key-stroke"]);
	root.style.setProperty("--accent", theme.vars["--k0-key-pressed-fill"]);
	root.style.setProperty("--k0-key-transition-duration", transition.duration);
	root.style.setProperty("--k0-key-transition-easing", transition.easing);
	root.style.setProperty(
		"--k0-layer-transition-duration",
		transition.layerDuration,
	);

	localStorage.setItem("k0-theme", themeId);
	localStorage.setItem("k0-transition", transitionId);
}

export function loadSavedTheme() {
	const themeId =
		(typeof localStorage !== "undefined"
			? localStorage.getItem("k0-theme")
			: null) ?? "catppuccin-mocha";
	const transitionId =
		(typeof localStorage !== "undefined"
			? localStorage.getItem("k0-transition")
			: null) ?? "snappy";
	applyTheme(themeId, transitionId);
	return { themeId, transitionId };
}
