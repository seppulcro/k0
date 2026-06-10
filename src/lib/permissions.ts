import { signal } from "@preact/signals";
import { invoke } from "./tauri";

export type InputAccessStatus =
	| "granted"
	| "denied"
	| "unknown"
	| "unsupported";

export const inputAccess = signal<InputAccessStatus>("unsupported");

const POLL_INTERVAL_MS = 2000;
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function refresh() {
	try {
		inputAccess.value = await invoke<InputAccessStatus>("check_input_access");
	} catch {
		inputAccess.value = "unsupported";
	}
}

export function startInputAccessPolling() {
	if (pollTimer) return;
	void refresh();
	pollTimer = setInterval(refresh, POLL_INTERVAL_MS);
}

export function stopInputAccessPolling() {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
}

export async function requestInputAccess(): Promise<InputAccessStatus> {
	try {
		const next = await invoke<InputAccessStatus>("request_input_access_cmd");
		inputAccess.value = next;
		return next;
	} catch {
		return "unsupported";
	}
}

export async function openInputMonitoringSettings(): Promise<void> {
	try {
		await invoke("open_input_monitoring_settings");
	} catch (err) {
		console.error("open_input_monitoring_settings:", err);
	}
}
