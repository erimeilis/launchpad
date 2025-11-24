use cocoa::appkit::NSEvent;
use cocoa::base::nil;
use cocoa::foundation::NSPoint;
use std::panic;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Corner {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Disabled,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct HotCornerConfig {
    pub enabled: bool,
    pub corner: Corner,
    pub trigger_threshold: f64,
    pub debounce_ms: u64,
}

impl Default for HotCornerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            corner: Corner::Disabled,
            trigger_threshold: 10.0,
            debounce_ms: 300,
        }
    }
}

pub struct HotCornerMonitor {
    config: Arc<Mutex<HotCornerConfig>>,
    last_trigger: Arc<Mutex<Option<Instant>>>,
    callback: Arc<dyn Fn(Corner) + Send + Sync>,
    screen_bounds: Arc<Vec<ScreenBounds>>,
    started: Arc<AtomicBool>,
}

impl HotCornerMonitor {
    pub fn new<F>(config: HotCornerConfig, callback: F) -> Self
    where
        F: Fn(Corner) + Send + Sync + 'static,
    {
        // Get screen bounds once at initialization
        let bounds = get_screen_bounds();

        Self {
            config: Arc::new(Mutex::new(config)),
            last_trigger: Arc::new(Mutex::new(None)),
            callback: Arc::new(callback),
            screen_bounds: Arc::new(bounds),
            started: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn start(&self) {
        // Only start the listener once
        if self.started.swap(true, Ordering::SeqCst) {
            // Already started, just return
            return;
        }

        let config = Arc::clone(&self.config);
        let last_trigger = Arc::clone(&self.last_trigger);
        let callback = Arc::clone(&self.callback);
        let screens = Arc::clone(&self.screen_bounds);

        thread::spawn(move || {
            loop {
                // Sleep to avoid excessive CPU usage
                thread::sleep(Duration::from_millis(50)); // Check 20 times per second

                // Scope the config lock
                let (enabled, corner, threshold, debounce) = {
                    let cfg = config.lock().unwrap();
                    (cfg.enabled, cfg.corner, cfg.trigger_threshold, cfg.debounce_ms)
                };

                if !enabled || corner == Corner::Disabled {
                    continue;
                }

                // Get current mouse position using NSEvent
                let (x, y) = unsafe {
                    let location: NSPoint = NSEvent::mouseLocation(nil);
                    (location.x, location.y)
                };

                // Use cached screen bounds
                for screen in screens.iter() {
                    if let Some(detected_corner) = detect_corner(x, y, screen, threshold) {
                        // Check debouncing
                        let mut last = last_trigger.lock().unwrap();
                        let now = Instant::now();

                        let should_trigger = match *last {
                            None => true,
                            Some(last_time) => {
                                now.duration_since(last_time).as_millis() >= debounce as u128
                            }
                        };

                        if should_trigger && detected_corner == corner {
                            *last = Some(now);
                            drop(last); // Release lock before callback

                            // Catch any panics in the callback to prevent app crashes
                            let _result = panic::catch_unwind(panic::AssertUnwindSafe(|| {
                                callback(detected_corner);
                            }));

                            // Break from inner for loop and continue outer loop
                            break;
                        }
                    }
                }
            }
        });
    }

    pub fn set_enabled(&self, enabled: bool) {
        self.config.lock().unwrap().enabled = enabled;
    }

    pub fn update_config(&self, config: HotCornerConfig) {
        *self.config.lock().unwrap() = config;
    }
}

#[derive(Debug, Clone)]
struct ScreenBounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

fn detect_corner(
    mouse_x: f64,
    mouse_y: f64,
    screen: &ScreenBounds,
    threshold: f64,
) -> Option<Corner> {
    let relative_x = mouse_x - screen.x;
    let relative_y = mouse_y - screen.y;

    // NOTE: macOS coordinate system has y=0 at BOTTOM, y increases going UP
    // So "top" corners have large y values (near screen.height)
    // and "bottom" corners have small y values (near 0)

    // Top-left corner (small x, large y)
    if relative_x <= threshold && relative_y >= (screen.height - threshold) {
        return Some(Corner::TopLeft);
    }

    // Top-right corner (large x, large y)
    if relative_x >= (screen.width - threshold) && relative_y >= (screen.height - threshold) {
        return Some(Corner::TopRight);
    }

    // Bottom-left corner (small x, small y)
    if relative_x <= threshold && relative_y <= threshold {
        return Some(Corner::BottomLeft);
    }

    // Bottom-right corner (large x, small y)
    if relative_x >= (screen.width - threshold) && relative_y <= threshold {
        return Some(Corner::BottomRight);
    }

    None
}

// macOS-specific screen bounds detection
#[cfg(target_os = "macos")]
fn get_screen_bounds() -> Vec<ScreenBounds> {
    use cocoa::appkit::NSScreen;
    use cocoa::base::{id, nil};
    use cocoa::foundation::{NSArray, NSRect};

    unsafe {
        let screens: id = NSScreen::screens(nil);
        let count = NSArray::count(screens);

        (0..count)
            .map(|i| {
                let screen = NSArray::objectAtIndex(screens, i);
                let frame: NSRect = NSScreen::frame(screen);

                ScreenBounds {
                    x: frame.origin.x,
                    y: frame.origin.y,
                    width: frame.size.width,
                    height: frame.size.height,
                }
            })
            .collect()
    }
}

#[cfg(not(target_os = "macos"))]
fn get_screen_bounds() -> Vec<ScreenBounds> {
    // Fallback for non-macOS
    vec![ScreenBounds {
        x: 0.0,
        y: 0.0,
        width: 1920.0,
        height: 1080.0,
    }]
}
