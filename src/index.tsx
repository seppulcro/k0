import {
	LocationProvider,
	Router,
	Route,
	hydrate,
	prerender as ssr,
} from "preact-iso";

import { Header } from "./components/Header.jsx";
import { Home } from "./pages/Home/index.jsx";
import { NotFound } from "./pages/_404.jsx";
import "./style.css";
import { useContext, useEffect, useState } from "preact/hooks";
import { Footer } from "./components/Footer.js";
import { createContext } from "preact";
import { signal } from "@preact/signals";

const defaultState = {
	compact: signal(true),
};
export const GlobalContext = createContext(defaultState);

export function App() {
	useEffect(() => {
		globalThis.feather.replace();
	});
	const globalContext = useContext(GlobalContext);
	return (
		<GlobalContext.Provider value={defaultState}>
			<LocationProvider>
				<Header />
				<main>
					<Router>
						<Route path="/" component={Home} />
						<Route default component={NotFound} />
					</Router>
					<span
						className="cogwheel"
						onPointerUp={() => {
							console.log(GlobalContext);
							globalContext.compact.value = !globalContext.compact.value;
						}}
					>
						<i data-feather="maximize-2" />
					</span>
				</main>
				<Footer />
			</LocationProvider>
		</GlobalContext.Provider>
	);
}

if (typeof window !== "undefined") {
	hydrate(<App />, document.getElementById("app"));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
