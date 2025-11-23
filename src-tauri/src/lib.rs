use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct App {
    name: String,
    bundle_id: String,
    path: String,
    icon: Option<String>, // Base64 encoded icon
    source_folder: Option<String>, // Track where the app came from
}

#[tauri::command]
fn get_installed_apps() -> Result<Vec<App>, String> {
    let mut apps = Vec::new();

    // Scan /Applications folder
    scan_applications_directory("/Applications", None, &mut apps);

    // Scan /System/Applications folder
    scan_applications_directory("/System/Applications", Some("System"), &mut apps);

    // Scan /Applications/Utilities folder
    scan_applications_directory("/Applications/Utilities", Some("Utilities"), &mut apps);

    // Scan user Applications folder
    if let Some(home_dir) = std::env::var_os("HOME") {
        let user_apps_path = std::path::PathBuf::from(home_dir).join("Applications");
        if user_apps_path.exists() {
            scan_applications_directory(user_apps_path.to_str().unwrap_or(""), None, &mut apps);
        }
    }

    // Remove duplicates based on bundle_id
    apps.sort_by(|a, b| a.bundle_id.cmp(&b.bundle_id));
    apps.dedup_by(|a, b| a.bundle_id == b.bundle_id);

    // Sort alphabetically by name
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(apps)
}

fn scan_applications_directory(path: &str, source_folder: Option<&str>, apps: &mut Vec<App>) {
    for entry in WalkDir::new(path)
        .max_depth(1)
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
    use std::process::Command;
    use std::env;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_installed_apps, launch_app])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

                apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                    .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
