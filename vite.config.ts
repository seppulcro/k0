import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";
// https://vitejs.dev/config/

export default defineConfig(({ command, mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	//const env = loadEnv(mode, process.cwd(), version);
	return {
		plugins: [
			preact({
				prerender: {
					enabled: true,
					renderTarget: "#app",
					additionalPrerenderRoutes: ["/404"],
					previewMiddlewareEnabled: true,
					previewMiddlewareFallback: "/404",
				},
			}),
		],
		resolve: {
			alias: {
				"@assets": "/assets",
			},
		},
	};
});
