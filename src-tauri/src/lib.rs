use log::info;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, RwLock};
use tauri::{Emitter, Manager};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_positioner::{Position, WindowExt};

#[cfg(target_os = "macos")]
extern crate io_kit_sys;
#[cfg(target_os = "macos")]
extern "C" {
    fn IOHIDRequestAccess(access: u32) -> i32;
    fn AXIsProcessTrusted() -> bool;
}

fn request_input_access() {
    #[cfg(target_os = "macos")]
    unsafe {
        let _ = IOHIDRequestAccess(1);
        info!("Accessibility trusted: {}", AXIsProcessTrusted());
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
struct KeyEvent { pos: u16, pressed: bool }

#[derive(Clone, Serialize, Deserialize, Debug)]
struct LayerEvent { layer: String }

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DeviceInfo {
    pub path: String,
    pub name: String,
    pub uniq: String,
}

#[derive(Default)]
struct LayoutData {
    code_to_pos: HashMap<u16, u16>,
    pos_to_layer: HashMap<u16, String>,
    default_layer: String,
    tapping_term_ms: u64,
}

type SharedLayout = Arc<RwLock<LayoutData>>;
type ActiveDevices = Arc<Mutex<std::collections::HashSet<String>>>;

#[tauri::command]
fn list_devices() -> Vec<DeviceInfo> {
    #[cfg(target_os = "linux")]
    {
        use evdev::Device;
        let mut devices = Vec::new();
        if let Ok(entries) = std::fs::read_dir("/dev/input") {
            let mut paths: Vec<_> = entries
                .filter_map(|e| e.ok())
                .filter(|e| e.file_name().to_str().map(|n| n.starts_with("event")).unwrap_or(false))
                .collect();
            paths.sort_by_key(|e| e.file_name());
            for entry in paths {
                let path = entry.path();
                if let Ok(dev) = Device::open(&path) {
                    if dev.supported_keys().map(|k| k.iter().count() > 5).unwrap_or(false) {
                        devices.push(DeviceInfo {
                            path: path.to_string_lossy().to_string(),
                            name: dev.name().unwrap_or("Unknown").to_string(),
                            uniq: dev.unique_name().unwrap_or("").to_string(),
                        });
                    }
                }
            }
        }
        info!("Found {} keyboard devices", devices.len());
        devices
    }
    #[cfg(not(target_os = "linux"))]
    {
        info!("list_devices: evdev not available on this platform");
        vec![]
    }
}

#[tauri::command]
fn update_layout(
    shared: tauri::State<SharedLayout>,
    evdev_to_pos: HashMap<String, u16>,
    pos_to_layer: HashMap<String, String>,
    default_layer: String,
    tapping_term_ms: Option<u64>,
) {
    let mut data = shared.write().unwrap();
    data.code_to_pos = evdev_to_pos
        .into_iter()
        .filter_map(|(k, v)| k.parse::<u16>().ok().map(|code| (code, v)))
        .collect();
    data.pos_to_layer = pos_to_layer
        .into_iter()
        .filter_map(|(k, v)| k.parse::<u16>().ok().map(|pos| (pos, v)))
        .collect();
    data.default_layer = default_layer;
    data.tapping_term_ms = tapping_term_ms.unwrap_or(200);
    info!(
        "Layout updated: {} evdev codes mapped, {} layer activators, tapping_term={}ms",
        data.code_to_pos.len(), data.pos_to_layer.len(), data.tapping_term_ms
    );
}

#[tauri::command]
fn start_capture(
    paths: Vec<String>,
    shared: tauri::State<SharedLayout>,
    active: tauri::State<ActiveDevices>,
    app: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    #[cfg(target_os = "linux")]
    {
        use evdev::{Device, EventType, InputEvent};
        use std::os::unix::io::AsRawFd;

        let mut active_set = active.lock().unwrap();
        active_set.clear();
        let mut started = Vec::new();

        for path in paths {
            let mut device = match Device::open(&path) {
                Ok(d) => d,
                Err(e) => { log::warn!("Cannot open {}: {e}", path); continue; }
            };
            if let Err(e) = device.grab() {
                log::warn!("Cannot grab {}: {e} (may already be grabbed)", path);
            }
            active_set.insert(path.clone());
            started.push(path.clone());
            info!("Capturing from {}", path);

            let shared = Arc::clone(shared.inner());
            let active = Arc::clone(active.inner());
            let app = app.clone();

            std::thread::spawn(move || {
                info!("evdev listener started on {}", path);
                let mut hold_timers: HashMap<u16, std::time::Instant> = HashMap::new();
                let fd = device.as_raw_fd();

                loop {
                    if !active.lock().unwrap().contains(&path) {
                        info!("Stopping capture of {}", path);
                        break;
                    }

                    let mut pfd = libc::pollfd { fd, events: libc::POLLIN, revents: 0 };
                    let poll_ret = unsafe { libc::poll(&mut pfd as *mut _, 1, 50) };
                    if poll_ret < 0 {
                        log::error!("poll error on {}: {}", path, std::io::Error::last_os_error());
                        break;
                    }

                    {
                        let data = shared.read().unwrap();
                        let tapping_term = std::time::Duration::from_millis(data.tapping_term_ms);
                        for (&pos, &pressed_at) in &hold_timers {
                            if pressed_at.elapsed() >= tapping_term {
                                if let Some(layer) = data.pos_to_layer.get(&pos) {
                                    let _ = app.emit("layer-event", LayerEvent { layer: layer.clone() });
                                }
                            }
                        }
                    }
                    hold_timers.retain(|&pos, pressed_at| {
                        let data = shared.read().unwrap();
                        let tapping_term = std::time::Duration::from_millis(data.tapping_term_ms);
                        let fired = pressed_at.elapsed() >= tapping_term && data.pos_to_layer.contains_key(&pos);
                        !fired
                    });

                    if poll_ret == 0 || (pfd.revents & libc::POLLIN) == 0 {
                        continue;
                    }

                    let events: Vec<InputEvent> = match device.fetch_events() {
                        Ok(it) => it.collect(),
                        Err(e) => { log::error!("evdev read error on {}: {e}", path); break; }
                    };

                    for ev in events {
                        if ev.event_type() != EventType::KEY { continue; }
                        let code = ev.code();
                        let value = ev.value();
                        if value == 2 { continue; }
                        let pressed = value == 1;

                        let data = shared.read().unwrap();
                        if let Some(&pos) = data.code_to_pos.get(&code) {
                            let _ = app.emit("key-event", KeyEvent { pos, pressed });
                            if data.pos_to_layer.contains_key(&pos) {
                                if pressed {
                                    hold_timers.insert(pos, std::time::Instant::now());
                                } else {
                                    hold_timers.remove(&pos);
                                    let _ = app.emit("layer-event", LayerEvent { layer: data.default_layer.clone() });
                                }
                            }
                        }
                    }
                }
            });
        }
        Ok(started)
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (paths, shared, active, app);
        Ok(vec![])
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let layout: SharedLayout = Arc::new(RwLock::new(LayoutData::default()));
    let active: ActiveDevices = Arc::new(Mutex::new(std::collections::HashSet::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .manage(layout)
        .manage(active)
        .setup(|app: &mut tauri::App| {
            request_input_access();
            let window = app.get_webview_window("main").ok_or_else(|| "no window")?;
            let _ = window.move_window(Position::BottomRight);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_devices, update_layout, start_capture
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
