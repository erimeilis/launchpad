use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::OnceLock;
use tauri::{Emitter, Manager};
use walkdir::WalkDir;

mod hot_corners;
use hot_corners::{Corner, HotCornerConfig, HotCornerMonitor};

static HOT_CORNER_MONITOR: OnceLock<HotCornerMonitor> = OnceLock::new();

#[derive(Debug, Serialize, Deserialize, Clone)]
struct App {
    name: String,
    bundle_id: String,
    path: String,
    icon: Option<String>,          // Base64 encoded icon
    source_folder: Option<String>, // Track where the app came from
}

#[tauri::command]
fn get_installed_apps() -> Result<Vec<App>, String> {
    let mut apps = Vec::new();

    // Scan /Applications folder (including subdirectories)
    scan_applications_directory("/Applications", None, &mut apps, 2);

    // Scan /System/Applications folder
    scan_applications_directory("/System/Applications", Some("System"), &mut apps, 1);

    // Scan /System/Applications/Utilities folder
    scan_applications_directory(
        "/System/Applications/Utilities",
        Some("Utilities"),
        &mut apps,
        1,
    );

    // Scan /Applications/Utilities folder
    scan_applications_directory("/Applications/Utilities", Some("Utilities"), &mut apps, 1);

    // Scan user Applications folder
    if let Some(home_dir) = std::env::var_os("HOME") {
        let user_apps_path = std::path::PathBuf::from(home_dir).join("Applications");
        if user_apps_path.exists() {
            scan_applications_directory(user_apps_path.to_str().unwrap_or(""), None, &mut apps, 2);
        }
    }

    // Remove duplicates based on bundle_id
    apps.sort_by(|a, b| a.bundle_id.cmp(&b.bundle_id));
    apps.dedup_by(|a, b| a.bundle_id == b.bundle_id);

    // Sort alphabetically by name
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(apps)
}

fn scan_applications_directory(
    path: &str,
    source_folder: Option<&str>,
    apps: &mut Vec<App>,
    max_depth: usize,
) {
    for entry in WalkDir::new(path)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();
        if entry_path.extension().and_then(|s| s.to_str()) == Some("app") {
            if let Some(app) = parse_app_bundle(entry_path, source_folder) {
                apps.push(app);
            }
        }
    }
}

fn parse_app_bundle(app_path: &Path, source_folder: Option<&str>) -> Option<App> {
    let info_plist_path = app_path.join("Contents/Info.plist");

    if !info_plist_path.exists() {
        return None;
    }

    let plist_value = plist::Value::from_file(&info_plist_path).ok()?;
    let plist_dict = plist_value.as_dictionary()?;

    // Get app name
    let name = plist_dict
        .get("CFBundleDisplayName")
        .or_else(|| plist_dict.get("CFBundleName"))
        .and_then(|v| v.as_string())
        .map(|s| s.to_string())?;

    // Get bundle ID
    let bundle_id = plist_dict
        .get("CFBundleIdentifier")
        .and_then(|v| v.as_string())
        .map(|s| s.to_string())
        .unwrap_or_else(|| String::from("unknown"));

    // Get app icon
    let icon = extract_app_icon(app_path, plist_dict);

    Some(App {
        name,
        bundle_id,
        path: app_path.to_string_lossy().to_string(),
        icon,
        source_folder: source_folder.map(|s| s.to_string()),
    })
}

fn extract_app_icon(app_path: &Path, plist_dict: &plist::Dictionary) -> Option<String> {
    // Get icon file name from plist
    let icon_file = plist_dict
        .get("CFBundleIconFile")
        .and_then(|v| v.as_string())?;

    // Try different icon paths
    let resources_path = app_path.join("Contents/Resources");
    let mut icon_path = resources_path.join(icon_file);

    // Add .icns extension if not present
    if icon_path.extension().is_none() {
        icon_path.set_extension("icns");
    }

    if !icon_path.exists() {
        // Try without extension
        icon_path = resources_path.join(icon_file);
    }

    if !icon_path.exists() {
        return None;
    }

    // Read and encode icon as base64 PNG
    extract_icns_as_base64(&icon_path)
}

fn extract_icns_as_base64(icon_path: &Path) -> Option<String> {
    use std::env;
    use std::process::Command;

    // Use macOS sips utility to convert ICNS to PNG
    let temp_dir = env::temp_dir();
    let temp_png = temp_dir.join(format!("icon_{}.png", icon_path.file_stem()?.to_str()?));

    // Convert ICNS to PNG using sips (built-in macOS tool)
    let output = Command::new("sips")
        .arg("-s")
        .arg("format")
        .arg("png")
        .arg(icon_path)
        .arg("--out")
        .arg(&temp_png)
        .arg("--resampleWidth")
        .arg("128")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    // Read the converted PNG
    let png_data = fs::read(&temp_png).ok()?;

    // Clean up temp file
    let _ = fs::remove_file(&temp_png);

    // Encode as base64
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_data);

    Some(format!("data:image/png;base64,{}", encoded))
}

#[tauri::command]
fn launch_app(app_path: String) -> Result<(), String> {
    use std::process::Command;

    Command::new("open")
        .arg(&app_path)
        .spawn()
        .map_err(|e| format!("Failed to launch app: {}", e))?;

    Ok(())
}

#[tauri::command]
fn move_app_to_trash(app_path: String) -> Result<(), String> {
    trash::delete(&app_path).map_err(|e| format!("Failed to move app to trash: {}", e))
}

#[tauri::command]
fn reveal_in_finder(app_path: String) -> Result<(), String> {
    use std::process::Command;

    Command::new("open")
        .arg("-R")
        .arg(&app_path)
        .spawn()
        .map_err(|e| format!("Failed to reveal in Finder: {}", e))?;

    Ok(())
}

#[tauri::command]
fn enable_hot_corner(
    corner: String,
    threshold: f64,
    debounce_ms: u64,
) -> Result<(), String> {
    let corner_enum = match corner.as_str() {
        "top-left" => Corner::TopLeft,
        "top-right" => Corner::TopRight,
        "bottom-left" => Corner::BottomLeft,
        "bottom-right" => Corner::BottomRight,
        "disabled" => Corner::Disabled,
        _ => return Err("Invalid corner".to_string()),
    };

    let config = HotCornerConfig {
        enabled: corner_enum != Corner::Disabled,
        corner: corner_enum,
        trigger_threshold: threshold,
        debounce_ms,
    };

    if let Some(monitor) = HOT_CORNER_MONITOR.get() {
        monitor.update_config(config);
        // Start the listener thread if not already started
        // (idempotent - will only start once)
        monitor.start();
    }

    Ok(())
}

#[tauri::command]
fn disable_hot_corner() -> Result<(), String> {
    if let Some(monitor) = HOT_CORNER_MONITOR.get() {
        monitor.set_enabled(false);
    }
    Ok(())
}

#[tauri::command]
#[allow(unexpected_cfgs)] // Suppress warnings from objc crate macros (msg_send!, class!)
fn get_system_accent_color() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::NSColorSpace;
        use cocoa::base::id;
        use objc::{class, msg_send, sel, sel_impl};

        unsafe {
            let color: id = msg_send![class!(NSColor), controlAccentColor];
            let rgb_colorspace = NSColorSpace::genericRGBColorSpace(cocoa::base::nil);
            let rgb_color: id = msg_send![color, colorUsingColorSpace: rgb_colorspace];

            if rgb_color.is_null() {
                return Err("Failed to convert accent color to RGB".to_string());
            }

            let r: f64 = msg_send![rgb_color, redComponent];
            let g: f64 = msg_send![rgb_color, greenComponent];
            let b: f64 = msg_send![rgb_color, blueComponent];

            let hex = format!(
                "#{:02x}{:02x}{:02x}",
                (r * 255.0) as u8,
                (g * 255.0) as u8,
                (b * 255.0) as u8
            );

            Ok(hex)
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok("#007aff".to_string())
    }
}

#[tauri::command]
async fn position_on_cursor_monitor(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::LogicalPosition;

    // Get the main window
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    // Get cursor position
    let cursor_pos = window
        .cursor_position()
        .map_err(|e| format!("Failed to get cursor position: {}", e))?;

    // Find monitor containing cursor
    let monitor = window
        .monitor_from_point(cursor_pos.x, cursor_pos.y)
        .map_err(|e| format!("Failed to get monitor from point: {}", e))?
        .ok_or("No monitor found at cursor position")?;

    // Get monitor's work area (excludes menu bar and dock)
    let work_area = monitor.work_area();
    let monitor_x = work_area.position.x;
    let monitor_y = work_area.position.y;
    let monitor_width = work_area.size.width;
    let monitor_height = work_area.size.height;

    // Get window's outer size
    let window_size = window
        .outer_size()
        .map_err(|e| format!("Failed to get window size: {}", e))?;

    // Calculate centered position on the monitor
    let x = monitor_x + ((monitor_width - window_size.width) / 2) as i32;
    let y = monitor_y + ((monitor_height - window_size.height) / 2) as i32;

    // Position window
    window
        .set_position(LogicalPosition::new(x, y))
        .map_err(|e| format!("Failed to set window position: {}", e))?;

    // Show and focus the window
    window
        .show()
        .map_err(|e| format!("Failed to show window: {}", e))?;
    window
        .set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;

    Ok(())
}

#[tauri::command]
fn register_global_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

    // Unregister any existing shortcuts first
    let _ = app.global_shortcut().unregister_all();

    // Parse and register the new shortcut
    let shortcut_key: Shortcut = shortcut
        .parse()
        .map_err(|e| format!("Invalid shortcut format: {}", e))?;

    app.global_shortcut()
        .on_shortcut(shortcut_key, move |app, _shortcut, _event| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("global-shortcut-triggered", ());
            }
        })
        .map_err(|e| format!("Failed to register shortcut: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri_plugin_global_shortcut::Builder as ShortcutBuilder;

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(ShortcutBuilder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a second instance is launched, focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            launch_app,
            move_app_to_trash,
            reveal_in_finder,
            position_on_cursor_monitor,
            enable_hot_corner,
            disable_hot_corner,
            register_global_shortcut,
            get_system_accent_color
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

                // Use Active state to keep the glass effect even when window loses focus
                apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, Some(NSVisualEffectState::Active), None)
                    .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");
            }

            // Initialize hot corner monitor (but don't start listener yet)
            let app_handle = app.handle().clone();
            let monitor = HotCornerMonitor::new(
                HotCornerConfig::default(),
                move |corner| {
                    let _ = app_handle.emit("hot-corner-triggered", corner);
                },
            );
            // DON'T start the monitor here - it will be started when user enables it in settings
            let _ = HOT_CORNER_MONITOR.set(monitor);

            // Register default global shortcut (F4)
            // Frontend will override this with user's saved preference if different
            use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
            let default_shortcut: Shortcut = "F4".parse().unwrap();
            let _ = app
                .global_shortcut()
                .on_shortcut(default_shortcut, move |app_h, _shortcut, _event| {
                    if let Some(window) = app_h.get_webview_window("main") {
                        let _ = window.emit("global-shortcut-triggered", ());
                    }
                });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
