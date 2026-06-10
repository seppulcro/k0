use log::{info, warn};
use rdev::{Event, EventType, Key};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

use crate::{KeyEvent, LayerEvent, SharedLayout};

pub const MACOS_GLOBAL_PATH: &str = "macos-global";

fn rdev_to_evdev(key: Key) -> Option<u16> {
    Some(match key {
        Key::KeyA => 30, Key::KeyB => 48, Key::KeyC => 46, Key::KeyD => 32,
        Key::KeyE => 18, Key::KeyF => 33, Key::KeyG => 34, Key::KeyH => 35,
        Key::KeyI => 23, Key::KeyJ => 36, Key::KeyK => 37, Key::KeyL => 38,
        Key::KeyM => 50, Key::KeyN => 49, Key::KeyO => 24, Key::KeyP => 25,
        Key::KeyQ => 16, Key::KeyR => 19, Key::KeyS => 31, Key::KeyT => 20,
        Key::KeyU => 22, Key::KeyV => 47, Key::KeyW => 17, Key::KeyX => 45,
        Key::KeyY => 21, Key::KeyZ => 44,
        Key::Num1 => 2, Key::Num2 => 3, Key::Num3 => 4, Key::Num4 => 5,
        Key::Num5 => 6, Key::Num6 => 7, Key::Num7 => 8, Key::Num8 => 9,
        Key::Num9 => 10, Key::Num0 => 11,
        Key::Return => 28,
        Key::Escape => 1,
        Key::Backspace => 14,
        Key::Tab => 15,
        Key::Space => 57,
        Key::Minus => 12,
        Key::Equal => 13,
        Key::LeftBracket => 26,
        Key::RightBracket => 27,
        Key::BackSlash => 43,
        Key::SemiColon => 39,
        Key::Quote => 40,
        Key::BackQuote => 41,
        Key::Comma => 51,
        Key::Dot => 52,
        Key::Slash => 53,
        Key::F1 => 59, Key::F2 => 60, Key::F3 => 61, Key::F4 => 62,
        Key::F5 => 63, Key::F6 => 64, Key::F7 => 65, Key::F8 => 66,
        Key::F9 => 67, Key::F10 => 68, Key::F11 => 87, Key::F12 => 88,
        Key::Insert => 110,
        Key::Home => 102,
        Key::PageUp => 104,
        Key::Delete => 111,
        Key::End => 107,
        Key::PageDown => 109,
        Key::RightArrow => 106,
        Key::LeftArrow => 105,
        Key::DownArrow => 108,
        Key::UpArrow => 103,
        Key::ControlLeft => 29,
        Key::ControlRight => 97,
        Key::ShiftLeft => 42,
        Key::ShiftRight => 54,
        Key::Alt => 56,
        Key::AltGr => 100,
        Key::MetaLeft => 125,
        Key::MetaRight => 126,
        Key::CapsLock => 58,
        _ => return None,
    })
}

type HoldTimers = Arc<Mutex<HashMap<u16, std::time::Instant>>>;

static STARTED: AtomicBool = AtomicBool::new(false);

pub fn start_capture(app: AppHandle, shared: SharedLayout) -> bool {
    if STARTED.swap(true, Ordering::SeqCst) {
        info!("macOS capture already running");
        return false;
    }

    let timers: HoldTimers = Arc::new(Mutex::new(HashMap::new()));

    {
        let app = app.clone();
        let shared = Arc::clone(&shared);
        let timers = Arc::clone(&timers);
        std::thread::spawn(move || loop {
            std::thread::sleep(std::time::Duration::from_millis(20));
            let data = shared.read().unwrap();
            let tap_term = std::time::Duration::from_millis(data.tapping_term_ms.max(50));
            let mut t = timers.lock().unwrap();
            t.retain(|&pos, pressed_at| {
                if pressed_at.elapsed() >= tap_term {
                    if let Some(layer) = data.pos_to_layer.get(&pos) {
                        let _ = app.emit("layer-event", LayerEvent { layer: layer.clone() });
                    }
                    false
                } else {
                    true
                }
            });
        });
    }

    std::thread::spawn(move || {
        info!("rdev listener starting on macOS");
        let callback = move |event: Event| {
            let (key, pressed) = match event.event_type {
                EventType::KeyPress(k) => (k, true),
                EventType::KeyRelease(k) => (k, false),
                _ => return,
            };
            let Some(code) = rdev_to_evdev(key) else { return };

            let data = shared.read().unwrap();
            let Some(&pos) = data.code_to_pos.get(&code) else { return };

            let _ = app.emit("key-event", KeyEvent { pos, pressed });

            if data.pos_to_layer.contains_key(&pos) {
                let mut t = timers.lock().unwrap();
                if pressed {
                    t.insert(pos, std::time::Instant::now());
                } else {
                    t.remove(&pos);
                    let _ = app.emit(
                        "layer-event",
                        LayerEvent { layer: data.default_layer.clone() },
                    );
                }
            }
        };

        if let Err(err) = rdev::listen(callback) {
            warn!("rdev::listen exited with error: {:?}", err);
            STARTED.store(false, Ordering::SeqCst);
        }
    });

    true
}
