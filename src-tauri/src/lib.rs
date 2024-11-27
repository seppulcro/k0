use log::{error, info};
use rdev::{listen, Event, EventType};
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_positioner::{Position, WindowExt};
extern crate io_kit_sys;

extern "C" {
    fn IOHIDRequestAccess(access: u32) -> i32;
    fn AXIsProcessTrusted() -> bool;

}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/**
 * rdev needs macos permission (Privacy & Security -> Input Monitoring)
 */
fn request_input_access() {
    unsafe {
        let result = IOHIDRequestAccess(1);
        if result != 0 {
            println!("Failed to request input access, error code: {:?}", result);
            let is_trusted = { AXIsProcessTrusted() };
            println!("Accessibility trusted: {}", is_trusted);
        } else {
            println!("Successfully requested input access");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .setup(|app: &mut tauri::App| {
            // Spawn the blocking task here using spawn_blocking
            tokio::task::block_in_place(|| {
                request_input_access();
                if let Err(error) = listen(callback) {
                    println!("Error in rdev::listen: {:?}", error);
                }
            });

            let window = app
                .get_webview_window("main")
                .ok_or_else(|| "Failed to get webview")?;

            #[cfg(debug_assertions)] // Only include this code on debug builds
            {
                window.open_devtools();
            }
            let _ = window.move_window(Position::BottomRight);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn callback(event: Event) {
    if let Err(err) = std::panic::catch_unwind(|| match event.event_type {
        EventType::KeyPress(key) => {
            info!("Key Pressed: {:?}", key);
        }
        _ => (),
    }) {
        error!("Error occurred while processing event: {:?}", err);
    }
}
