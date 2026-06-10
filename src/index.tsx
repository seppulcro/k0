import { signal } from "@preact/signals";
import { createContext } from "preact";
import { hydrate, LocationProvider, Route, Router } from "preact-iso";

import { Footer } from "./components/Footer.js";
import { Header } from "./components/Header.jsx";
import { installConsoleInterceptor } from "./lib/consoleCapture";
import { NotFound } from "./pages/_404.jsx";
import { Home } from "./pages/Home/index.jsx";
import "./style.css";

installConsoleInterceptor();

const defaultState = { compact: signal(true) };
export const GlobalContext = createContext(defaultState);

export function App() {
	return (
		<GlobalContext.Provider value={defaultState}>
			<LocationProvider>
				<Header />
				<main>
					<Router>
						<Route path="/" component={Home} />
						<Route default component={NotFound} />
					</Router>
				</main>
				<Footer />
			</LocationProvider>
		</GlobalContext.Provider>
	);
}

const appEl = document.getElementById("app");
if (appEl) hydrate(<App />, appEl);
