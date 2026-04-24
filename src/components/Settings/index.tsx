import { useComputed, useSignalEffect } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { consoleLogs } from "../../lib/consoleCapture";
import {
	exportCurrentAsZip,
	importError,
	isCustomSvg,
	isCustomYaml,
	loadSvg,
	loadYaml,
	loadZip,
	resetToDefaults,
	svgFileName,
	yamlFileName,
} from "../../lib/keymapStore";
import { invoke } from "../../lib/tauri";
import { THEMES, TRANSITIONS, applyTheme } from "../../lib/themes";
import "./style.css";

interface DeviceInfo {
	path: string;
	name: string;
	uniq: string;
}

interface Props {
	open: boolean;
	onClose: () => void;
	onDevicesSelect: (paths: string[]) => void;
	activeDevices: string[];
	tappingTermMs: number;
	onTappingTermChange: (ms: number) => void;
}

const TABS = ["Devices", "Theme", "Input", "Import/Export", "Console"] as const;
type Tab = (typeof TABS)[number];

export function Settings({
	open,
	onClose,
	onDevicesSelect,
	activeDevices,
	tappingTermMs,
	onTappingTermChange,
}: Props) {
	const [tab, setTab] = useState<Tab>("Devices");
	const [devices, setDevices] = useState<DeviceInfo[]>([]);
	const [theme, setTheme] = useState(
		() => localStorage.getItem("k0-theme") ?? "catppuccin-mocha",
	);
	const [transition, setTransition] = useState(
		() => localStorage.getItem("k0-transition") ?? "snappy",
	);
	const consoleEndRef = useRef<HTMLDivElement>(null);
	const logs = useComputed(() => consoleLogs.value);

	// Fetch devices when panel opens
	useEffect(() => {
		if (!open) return;
		invoke<DeviceInfo[]>("list_devices")
			.then(setDevices)
			.catch((e) => console.error("list_devices:", e));
	}, [open]);

	// Auto-scroll console on new log entries (signal-reactive)
	useSignalEffect(() => {
		void consoleLogs.value; // subscribe to signal
		if (tab === "Console") {
			consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	});

	function handleTheme(id: string) {
		setTheme(id);
		applyTheme(id, transition);
	}
	function handleTransition(id: string) {
		setTransition(id);
		applyTheme(theme, id);
	}
	function toggleDevice(path: string) {
		const next = activeDevices.includes(path)
			? activeDevices.filter((p) => p !== path)
			: [...activeDevices, path];
		onDevicesSelect(next);
	}

	const groups = new Map<string, DeviceInfo[]>();
	for (const d of devices) {
		const key = d.uniq || d.name || d.path;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)?.push(d);
	}

	return (
		<div class={`panel-overlay ${open ? "open" : ""}`}>
			<div class="panel-tabbar">
				<menu>
					{TABS.map((t) => (
						<li key={t} class={tab === t ? "selected" : ""}>
							<button type="button" onClick={() => setTab(t)}>
								{t}
								{t === "Console" && logs.value.length > 0 && (
									<sup>{Math.min(logs.value.length, 99)}</sup>
								)}
							</button>
						</li>
					))}
				</menu>
				<button
					type="button"
					class="panel-close"
					onClick={onClose}
					aria-label="Close panel"
				>
					✕
				</button>
			</div>

			<div class="panel-body">
				{tab === "Devices" && (
					<div class="panel-section">
						<p class="muted">
							Select which /dev/input/event* nodes to capture. Interfaces
							sharing a unique ID are grouped.
						</p>
						<div class="device-list">
							{devices.length === 0 ? (
								<p class="muted">No keyboard devices found</p>
							) : (
								[...groups.entries()].map(([key, group]) => {
									const allPaths = group.map((d) => d.path);
									const checked = allPaths.filter((p) =>
										activeDevices.includes(p),
									).length;
									const allChecked = checked === allPaths.length;
									const someChecked = checked > 0 && !allChecked;
									const rootName =
										group[0].name.replace(
											/\s+(Mouse|System Control|Consumer Control|Keyboard)$/i,
											"",
										) || key;

									function toggleGroup(e: Event) {
										e.preventDefault();
										const others = activeDevices.filter(
											(p) => !allPaths.includes(p),
										);
										onDevicesSelect(
											allChecked ? others : [...others, ...allPaths],
										);
									}

									return (
										<details
											key={key}
											class={`device-group ${allChecked ? "active" : someChecked ? "partial" : ""}`}
										>
											<summary>
												<input
													type="checkbox"
													checked={allChecked}
													onChange={toggleGroup}
													onClick={(e) => e.stopPropagation()}
												/>
												{rootName}
												<span class="device-root-count">
													{checked}/{allPaths.length}
												</span>
											</summary>
											<div class="device-children">
												{group.map((d) => {
													const isChecked = activeDevices.includes(d.path);
													const suffix =
														d.name.match(
															/(Mouse|System Control|Consumer Control|Keyboard)$/i,
														)?.[1] ?? d.path.replace(/.*\//, "");
													return (
														<label
															key={d.path}
															class={isChecked ? "active" : ""}
														>
															<input
																type="checkbox"
																checked={isChecked}
																onChange={() => toggleDevice(d.path)}
															/>
															<span>
																<span class="device-suffix">{suffix}</span>
																<code class="device-path">{d.path}</code>
															</span>
														</label>
													);
												})}
											</div>
										</details>
									);
								})
							)}
						</div>
					</div>
				)}

				{tab === "Theme" && (
					<div class="panel-section panel-section--row">
						<div class="panel-col">
							<span class="panel-col-label">Theme</span>
							<div class="theme-grid">
								{Object.entries(THEMES).map(([id, t]) => (
									<button
										type="button"
										key={id}
										data-id={id}
										class={`theme-swatch ${theme === id ? "active" : ""}`}
										style={{
											background: t.vars["--k0-bg"],
											color: t.vars["--k0-text"],
											borderColor:
												theme === id
													? t.vars["--k0-key-pressed-fill"]
													: t.vars["--k0-key-stroke"],
										}}
										onClick={() => handleTheme(id)}
									>
										<span
											class="theme-dot"
											style={{ background: t.vars["--k0-key-pressed-fill"] }}
										/>
										{t.label}
									</button>
								))}
							</div>
						</div>
						<div class="panel-divider" />
						<div class="panel-col">
							<span class="panel-col-label">Transition</span>
							<div class="transition-grid">
								{Object.entries(TRANSITIONS).map(([id, t]) => (
									<button
										type="button"
										key={id}
										data-id={id}
										class={`transition-btn ${transition === id ? "active" : ""}`}
										onClick={() => handleTransition(id)}
									>
										{t.label}
										<span class="transition-speed">{t.duration}</span>
									</button>
								))}
							</div>
						</div>
					</div>
				)}

				{tab === "Input" && (
					<div class="panel-section">
						<fieldset class="input-row">
							<legend>Hold–tap threshold</legend>
							<p class="muted">
								ms before held key activates a layer — QMK / ZMK / VIAL default:
								200 ms
							</p>
							<div class="tapping-control">
								<input
									type="range"
									min="100"
									max="500"
									step="10"
									value={tappingTermMs}
									onInput={(e) =>
										onTappingTermChange(
											Number((e.target as HTMLInputElement).value),
										)
									}
									class="tapping-slider"
								/>
								<input
									type="number"
									min="100"
									max="500"
									step="10"
									value={tappingTermMs}
									onInput={(e) => {
										const v = Number((e.target as HTMLInputElement).value);
										if (v >= 100 && v <= 500) onTappingTermChange(v);
									}}
									class="tapping-number"
								/>
								<span class="tapping-unit">ms</span>
							</div>
						</fieldset>
					</div>
				)}

				{tab === "Import/Export" && <ImportExportPanel />}

				{tab === "Console" && (
					<div class="console-pane">
						<div class="console-toolbar">
							<small class="muted">{logs.value.length} entries</small>
							<button
								type="button"
								class="console-clear"
								onClick={() => {
									consoleLogs.value = [];
								}}
							>
								Clear
							</button>
						</div>
						<div class="console-log-list">
							{logs.value.map((entry) => (
								<div
									key={entry.id}
									class={`console-entry console-entry--${entry.level}`}
								>
									<span class="console-ts">{entry.ts}</span>
									<span class={`console-level console-level--${entry.level}`}>
										{entry.level.toUpperCase()}
									</span>
									<span class="console-msg">{entry.msg}</span>
								</div>
							))}
							<div ref={consoleEndRef} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Import / Export sub-panel
// ---------------------------------------------------------------------------

function processFiles(files: File[]) {
	const yamlFiles = files.filter((f) => /\.(yaml|yml)$/i.test(f.name));
	const svgFiles = files.filter((f) => /\.svg$/i.test(f.name));
	const zipFiles = files.filter((f) => /\.zip$/i.test(f.name));

	if (zipFiles.length > 0 && (yamlFiles.length > 0 || svgFiles.length > 0)) {
		importError.value = "Drop either a ZIP or individual files, not both.";
		return;
	}

	if (zipFiles.length > 1) {
		importError.value = "Drop only one ZIP file.";
		return;
	}

	if (yamlFiles.length > 1 || svgFiles.length > 1) {
		importError.value = "Drop at most one YAML and one SVG file.";
		return;
	}

	if (zipFiles.length === 1) {
		zipFiles[0].arrayBuffer().then((buf) => {
			try {
				loadZip(buf, zipFiles[0].name);
			} catch (e) {
				importError.value = String(e instanceof Error ? e.message : e);
			}
		});
		return;
	}

	if (yamlFiles.length === 0 && svgFiles.length === 0) {
		importError.value =
			"No supported files found. Drop .yaml, .svg, or .zip files.";
		return;
	}

	const promises: Promise<void>[] = [];

	if (yamlFiles.length === 1) {
		promises.push(
			yamlFiles[0].text().then((text) => {
				loadYaml(text, yamlFiles[0].name);
			}),
		);
	}
	if (svgFiles.length === 1) {
		promises.push(
			svgFiles[0].text().then((text) => {
				loadSvg(text, svgFiles[0].name);
			}),
		);
	}

	Promise.all(promises).catch((e) => {
		importError.value = String(e instanceof Error ? e.message : e);
	});
}

function ImportExportPanel() {
	const [dragging, setDragging] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		setDragging(false);
		importError.value = "";
		const files = [...(e.dataTransfer?.files ?? [])];
		if (files.length > 0) processFiles(files);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		setDragging(true);
	}

	function handleFileInput(e: Event) {
		importError.value = "";
		const input = e.target as HTMLInputElement;
		const files = [...(input.files ?? [])];
		if (files.length > 0) processFiles(files);
		input.value = "";
	}

	function handleExport() {
		const { blob, fileName } = exportCurrentAsZip();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileName;
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleReset() {
		resetToDefaults();
	}

	return (
		<div class="panel-section panel-section--row">
			<div class="panel-col">
				<span class="panel-col-label">Import</span>
				<div
					class={`drop-zone ${dragging ? "drop-zone--active" : ""}`}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={() => setDragging(false)}
					onClick={() => fileRef.current?.click()}
					onKeyDown={(e) => {
						if (e.key === "Enter") fileRef.current?.click();
					}}
					role="button"
					tabIndex={0}
				>
					<span class="drop-zone-icon">📂</span>
					<span class="drop-zone-text">
						Drop <code>.yaml</code> <code>.svg</code> or <code>.zip</code>
					</span>
					<span class="drop-zone-hint">or click to browse</span>
					<input
						ref={fileRef}
						type="file"
						accept=".yaml,.yml,.svg,.zip"
						multiple
						onChange={handleFileInput}
						class="drop-zone-input"
					/>
				</div>
				{importError.value && <p class="import-error">{importError.value}</p>}
				<div class="import-status">
					<div class="import-file">
						<span
							class={`import-badge ${isCustomYaml.value ? "import-badge--custom" : ""}`}
						>
							YAML
						</span>
						<span class="import-file-name">{yamlFileName.value}</span>
					</div>
					<div class="import-file">
						<span
							class={`import-badge ${isCustomSvg.value ? "import-badge--custom" : ""}`}
						>
							SVG
						</span>
						<span class="import-file-name">{svgFileName.value}</span>
					</div>
				</div>
			</div>
			<div class="panel-divider" />
			<div class="panel-col">
				<span class="panel-col-label">Export</span>
				<div class="export-actions">
					<button type="button" class="export-btn" onClick={handleExport}>
						⬇ Download .zip
					</button>
					<p class="muted export-hint">
						Exports current YAML + SVG as a single archive.
					</p>
				</div>
				<span class="panel-col-label" style={{ marginTop: "12px" }}>
					Reset
				</span>
				<div class="export-actions">
					<button
						type="button"
						class="export-btn export-btn--danger"
						onClick={handleReset}
						disabled={!isCustomYaml.value && !isCustomSvg.value}
					>
						↺ Reset to bundled defaults
					</button>
				</div>
			</div>
		</div>
	);
}
