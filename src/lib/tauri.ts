/**
 * Tauri API shim — transparently switches between real Tauri and mock mode.
 *
 * Import from here instead of @tauri-apps/api directly:
 *   import { invoke, listen } from "../../lib/tauri"
 *
 * Mock mode activates when the URL contains `?mock`.
 */

import * as tauriCore from "@tauri-apps/api/core";
import * as tauriEvent from "@tauri-apps/api/event";
import {
	LogicalSize,
	getCurrentWindow as tauriGetCurrentWindow,
} from "@tauri-apps/api/window";
import * as mock from "./mock";

const isMock =
	typeof window !== "undefined" &&
	new URLSearchParams(window.location.search).has("mock");

type InvokeFn = <T>(cmd: string, args?: unknown) => Promise<T>;
type ListenFn = <T>(
	event: string,
	handler: (e: { payload: T }) => void,
) => Promise<() => void>;

export const invoke: InvokeFn = isMock
	? (mock.invoke as InvokeFn)
	: (tauriCore.invoke as InvokeFn);

export const listen: ListenFn = isMock
	? (mock.listen as ListenFn)
	: (tauriEvent.listen as ListenFn);

const mockWindow = {
	setSize: async (_size: unknown) => {},
};

export function getCurrentWindow() {
	return isMock ? mockWindow : tauriGetCurrentWindow();
}

export { LogicalSize };
