/**
 * Console interceptor — patches window.console at startup.
 * All log/warn/error calls are forwarded to the original console AND
 * appended to `consoleLogs` signal so the Console panel tab can display them.
 */
import { signal } from "@preact/signals";

export type LogLevel = "log" | "warn" | "error" | "info";

export interface LogEntry {
	id: number;
	level: LogLevel;
	ts: string; // HH:MM:SS.mmm
	msg: string;
}

export const consoleLogs = signal<LogEntry[]>([]);

let _seq = 0;

function fmt(args: unknown[]): string {
	return args
		.map((a) =>
			typeof a === "object" ? JSON.stringify(a, null, 0) : String(a),
		)
		.join(" ");
}

function ts(): string {
	const d = new Date();
	const pad = (n: number, w = 2) => String(n).padStart(w, "0");
	return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function intercept(level: LogLevel, orig: (...a: unknown[]) => void) {
	return (...args: unknown[]) => {
		orig(...args);
		const entry: LogEntry = { id: _seq++, level, ts: ts(), msg: fmt(args) };
		// cap at 500 entries
		const prev = consoleLogs.value;
		consoleLogs.value =
			prev.length >= 500 ? [...prev.slice(-499), entry] : [...prev, entry];
	};
}

export function installConsoleInterceptor() {
	if (typeof window === "undefined") return;
	console.log = intercept("log", console.log.bind(console));
	console.info = intercept("info", console.info.bind(console));
	console.warn = intercept("warn", console.warn.bind(console));
	console.error = intercept("error", console.error.bind(console));
}
