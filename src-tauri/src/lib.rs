use directories::ProjectDirs;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use tauri::{Emitter, Manager};
use walkdir::WalkDir;

mod hot_corners;
use hot_corners::{Corner, HotCornerConfig, HotCornerMonitor};

static HOT_CORNER_MONITOR: OnceLock<HotCornerMonitor> = OnceLock::new();

/// Get the icon cache directory, creating it if it doesn't exist
fn get_icon_cache_dir() -> Option<PathBuf> {
    let proj_dirs = ProjectDirs::from("com", "launchpad", "Launchpad")?;
    let cache_dir = proj_dirs.cache_dir().join("icons");
    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir).ok()?;
    }
    Some(cache_dir)
}

/// Generate a cache key for an app icon based on path and modification time
fn get_icon_cache_key(app_path: &Path) -> Option<String> {
    let metadata = fs::metadata(app_path).ok()?;
    let modified = metadata.modified().ok()?;
    let duration = modified
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();

    let mut hasher = Sha256::new();
    hasher.update(app_path.to_string_lossy().as_bytes());
    hasher.update(duration.to_string().as_bytes());
    let hash = hasher.finalize();
    Some(format!("{:x}", hash)[..16].to_string())
}

/// Try to load an icon from cache
fn load_cached_icon(cache_key: &str) -> Option<String> {
    let cache_dir = get_icon_cache_dir()?;
    let cache_path = cache_dir.join(format!("{}.png", cache_key));

    if cache_path.exists() {
        let png_data = fs::read(&cache_path).ok()?;
        let encoded =
            base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_data);
        return Some(format!("data:image/png;base64,{}", encoded));
    }
    None
}

/// Save an icon to cache (saves the raw PNG bytes)
fn save_icon_to_cache(cache_key: &str, png_data: &[u8]) -> Option<()> {
    let cache_dir = get_icon_cache_dir()?;
    let cache_path = cache_dir.join(format!("{}.png", cache_key));
    fs::write(cache_path, png_data).ok()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct App {
    name: String,
    bundle_id: String,
    path: String,
    icon: Option<String>,          // Base64 encoded icon
    source_folder: Option<String>, // Track where the app came from
    tags: Vec<String>,             // Auto-detected category tags
}

/// Event payload for icon updates
#[derive(Debug, Serialize, Clone)]
struct IconUpdate {
    bundle_id: String,
    icon: String,
}

/// Internal struct for app metadata without icon (used during fast loading)
#[derive(Debug, Clone)]
struct AppMetadata {
    name: String,
    bundle_id: String,
    path: String,
    actual_app_path: PathBuf, // Path to the actual app bundle (for icon extraction)
    source_folder: Option<String>,
    tags: Vec<String>,
}

/// Get installed apps WITHOUT icons - this is the fast path for immediate display
#[tauri::command]
fn get_installed_apps_fast() -> Result<Vec<App>, String> {
    let mut app_metadata = Vec::new();

    // Scan all application directories (fast - no icon extraction)
    scan_applications_directory_fast("/Applications", None, &mut app_metadata, 2);
    scan_applications_directory_fast("/System/Applications", Some("System"), &mut app_metadata, 1);
    scan_applications_directory_fast(
        "/System/Applications/Utilities",
        Some("Utilities"),
        &mut app_metadata,
        1,
    );
    scan_applications_directory_fast(
        "/Applications/Utilities",
        Some("Utilities"),
        &mut app_metadata,
        1,
    );

    // Scan user Applications folder
    if let Some(home_dir) = std::env::var_os("HOME") {
        let user_apps_path = PathBuf::from(home_dir).join("Applications");
        if user_apps_path.exists() {
            scan_applications_directory_fast(
                user_apps_path.to_str().unwrap_or(""),
                None,
                &mut app_metadata,
                2,
            );
        }
    }

    // Remove duplicates based on bundle_id
    app_metadata.sort_by(|a, b| a.bundle_id.cmp(&b.bundle_id));
    app_metadata.dedup_by(|a, b| a.bundle_id == b.bundle_id);

    // Sort alphabetically by name
    app_metadata.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Convert to App structs without icons
    let apps: Vec<App> = app_metadata
        .into_iter()
        .map(|m| App {
            name: m.name,
            bundle_id: m.bundle_id,
            path: m.path,
            icon: None,
            source_folder: m.source_folder,
            tags: m.tags,
        })
        .collect();

    Ok(apps)
}

/// Load app icons in parallel using rayon, emitting updates as they're ready
#[tauri::command]
async fn load_app_icons(app: tauri::AppHandle) -> Result<(), String> {
    let mut app_metadata = Vec::new();

    // Scan all application directories (fast - no icon extraction)
    scan_applications_directory_fast("/Applications", None, &mut app_metadata, 2);
    scan_applications_directory_fast("/System/Applications", Some("System"), &mut app_metadata, 1);
    scan_applications_directory_fast(
        "/System/Applications/Utilities",
        Some("Utilities"),
        &mut app_metadata,
        1,
    );
    scan_applications_directory_fast(
        "/Applications/Utilities",
        Some("Utilities"),
        &mut app_metadata,
        1,
    );

    // Scan user Applications folder
    if let Some(home_dir) = std::env::var_os("HOME") {
        let user_apps_path = PathBuf::from(home_dir).join("Applications");
        if user_apps_path.exists() {
            scan_applications_directory_fast(
                user_apps_path.to_str().unwrap_or(""),
                None,
                &mut app_metadata,
                2,
            );
        }
    }

    // Remove duplicates
    app_metadata.sort_by(|a, b| a.bundle_id.cmp(&b.bundle_id));
    app_metadata.dedup_by(|a, b| a.bundle_id == b.bundle_id);

    // Extract icons in parallel using rayon
    let icons: Vec<(String, Option<String>)> = app_metadata
        .par_iter()
        .map(|meta| {
            let icon = extract_app_icon_for_path(&meta.actual_app_path);
            (meta.bundle_id.clone(), icon)
        })
        .collect();

    // Emit icon updates in batches for efficiency
    let batch_size = 10;
    for chunk in icons.chunks(batch_size) {
        let updates: Vec<IconUpdate> = chunk
            .iter()
            .filter_map(|(bundle_id, icon)| {
                icon.as_ref().map(|i| IconUpdate {
                    bundle_id: bundle_id.clone(),
                    icon: i.clone(),
                })
            })
            .collect();

        if !updates.is_empty() {
            let _ = app.emit("icons-loaded", updates);
        }
    }

    // Emit completion event
    let _ = app.emit("icons-complete", ());

    Ok(())
}

/// Legacy command that loads everything at once (for backwards compatibility)
/// This now uses caching and is faster on subsequent runs
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
        let user_apps_path = PathBuf::from(home_dir).join("Applications");
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

/// Fast version that doesn't extract icons - for progressive loading
fn scan_applications_directory_fast(
    path: &str,
    source_folder: Option<&str>,
    apps: &mut Vec<AppMetadata>,
    max_depth: usize,
) {
    for entry in WalkDir::new(path)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();
        if entry_path.extension().and_then(|s| s.to_str()) == Some("app") {
            if let Some(app) = parse_app_bundle_fast(entry_path, source_folder) {
                apps.push(app);
            }
        }
    }
}

fn parse_app_bundle(app_path: &Path, source_folder: Option<&str>) -> Option<App> {
    // Try standard macOS Info.plist location first
    let mut info_plist_path = app_path.join("Contents/Info.plist");
    let mut actual_app_path = app_path.to_path_buf();

    // Check for wrapped iOS apps (Mac App Store ports)
    // These have structure: App.app/Wrapper/InnerApp.app/Info.plist (iOS style - no Contents folder)
    // or App.app/WrappedBundle -> Wrapper/InnerApp.app (symlink)
    if !info_plist_path.exists() {
        // Check for WrappedBundle symlink
        let wrapped_bundle_link = app_path.join("WrappedBundle");

        if wrapped_bundle_link.is_symlink() || wrapped_bundle_link.exists() {
            // Resolve the symlink and check for Info.plist
            if let Ok(resolved) = fs::read_link(&wrapped_bundle_link) {
                let inner_app = app_path.join(&resolved);

                // Try macOS style first (Contents/Info.plist)
                let inner_plist_macos = inner_app.join("Contents/Info.plist");
                // Then try iOS style (Info.plist at root)
                let inner_plist_ios = inner_app.join("Info.plist");

                if inner_plist_macos.exists() {
                    info_plist_path = inner_plist_macos;
                    actual_app_path = inner_app;
                } else if inner_plist_ios.exists() {
                    info_plist_path = inner_plist_ios;
                    actual_app_path = inner_app.clone();
                }
            }
        }

        // If still not found, scan Wrapper directory for .app bundles
        if !info_plist_path.exists() {
            let wrapper_dir = app_path.join("Wrapper");
            if wrapper_dir.is_dir() {
                if let Ok(entries) = fs::read_dir(&wrapper_dir) {
                    for entry in entries.flatten() {
                        let entry_path = entry.path();
                        if entry_path.extension().and_then(|s| s.to_str()) == Some("app") {
                            // Try macOS style first
                            let inner_plist_macos = entry_path.join("Contents/Info.plist");
                            // Then try iOS style
                            let inner_plist_ios = entry_path.join("Info.plist");

                            if inner_plist_macos.exists() {
                                info_plist_path = inner_plist_macos;
                                actual_app_path = entry_path;
                                break;
                            } else if inner_plist_ios.exists() {
                                info_plist_path = inner_plist_ios;
                                actual_app_path = entry_path;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

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

    // Filter out Launchpad itself
    if bundle_id == "red.launchpad" {
        return None;
    }

    // Get app icon (use actual_app_path for wrapped apps since icon is in inner bundle)
    let icon = extract_app_icon(&actual_app_path, plist_dict);

    // Detect tags from app category
    let tags = detect_app_tags(plist_dict, &bundle_id, &name);

    Some(App {
        name,
        bundle_id,
        path: app_path.to_string_lossy().to_string(), // Use outer app path for launching
        icon,
        source_folder: source_folder.map(|s| s.to_string()),
        tags,
    })
}

/// Fast version of parse_app_bundle that doesn't extract icons
fn parse_app_bundle_fast(app_path: &Path, source_folder: Option<&str>) -> Option<AppMetadata> {
    // Try standard macOS Info.plist location first
    let mut info_plist_path = app_path.join("Contents/Info.plist");
    let mut actual_app_path = app_path.to_path_buf();

    // Check for wrapped iOS apps
    if !info_plist_path.exists() {
        let wrapped_bundle_link = app_path.join("WrappedBundle");

        if wrapped_bundle_link.is_symlink() || wrapped_bundle_link.exists() {
            if let Ok(resolved) = fs::read_link(&wrapped_bundle_link) {
                let inner_app = app_path.join(&resolved);
                let inner_plist_macos = inner_app.join("Contents/Info.plist");
                let inner_plist_ios = inner_app.join("Info.plist");

                if inner_plist_macos.exists() {
                    info_plist_path = inner_plist_macos;
                    actual_app_path = inner_app;
                } else if inner_plist_ios.exists() {
                    info_plist_path = inner_plist_ios;
                    actual_app_path = inner_app;
                }
            }
        }

        // Scan Wrapper directory
        if !info_plist_path.exists() {
            let wrapper_dir = app_path.join("Wrapper");
            if wrapper_dir.is_dir() {
                if let Ok(entries) = fs::read_dir(&wrapper_dir) {
                    for entry in entries.flatten() {
                        let entry_path = entry.path();
                        if entry_path.extension().and_then(|s| s.to_str()) == Some("app") {
                            let inner_plist_macos = entry_path.join("Contents/Info.plist");
                            let inner_plist_ios = entry_path.join("Info.plist");

                            if inner_plist_macos.exists() {
                                info_plist_path = inner_plist_macos;
                                actual_app_path = entry_path;
                                break;
                            } else if inner_plist_ios.exists() {
                                info_plist_path = inner_plist_ios;
                                actual_app_path = entry_path;
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

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

    // Filter out Launchpad itself
    if bundle_id == "red.launchpad" {
        return None;
    }

    // Detect tags from app category
    let tags = detect_app_tags(plist_dict, &bundle_id, &name);

    Some(AppMetadata {
        name,
        bundle_id,
        path: app_path.to_string_lossy().to_string(),
        actual_app_path,
        source_folder: source_folder.map(|s| s.to_string()),
        tags,
    })
}

/// Extract icon for a given app path (used by parallel icon loading)
fn extract_app_icon_for_path(app_path: &Path) -> Option<String> {
    // Find and read Info.plist
    let info_plist_path = if app_path.join("Contents/Info.plist").exists() {
        app_path.join("Contents/Info.plist")
    } else if app_path.join("Info.plist").exists() {
        app_path.join("Info.plist")
    } else {
        return None;
    };

    let plist_value = plist::Value::from_file(&info_plist_path).ok()?;
    let plist_dict = plist_value.as_dictionary()?;

    extract_app_icon(app_path, plist_dict)
}

fn detect_app_tags(plist_dict: &plist::Dictionary, bundle_id: &str, name: &str) -> Vec<String> {
    let mut tags = Vec::new();

    // Priority 1: Bundle ID pattern matching (most specific - catches browsers, etc.)
    if let Some(tag) = detect_tag_from_bundle_id(bundle_id) {
        tags.push(tag.to_string());
        return tags;
    }

    // Priority 2: Well-known apps database (specific app names)
    if let Some(tag) = detect_tag_from_app_name(name, bundle_id) {
        tags.push(tag.to_string());
        // println!("✅ Tag detected via app_name: {} (bundle: {}) → {}", name, bundle_id, tag);
        return tags;
    }

    // Priority 3: LSApplicationCategoryType from macOS (fallback for general categorization)
    if let Some(category) = plist_dict
        .get("LSApplicationCategoryType")
        .and_then(|v| v.as_string())
    {
        if let Some(tag) = map_macos_category_to_tag(category) {
            tags.push(tag.to_string());
            return tags;
        }
    }

    // Debug: Log apps with no tags
    // if tags.is_empty() {
    //     println!("❌ NO TAG: {} | bundle_id: {}", name, bundle_id);
    // }

    tags // May be empty if no category detected
}

fn map_macos_category_to_tag(category: &str) -> Option<&'static str> {
    match category {
        // Dev Tools
        "public.app-category.developer-tools" => Some("dev-tools"),

        // Social
        "public.app-category.social-networking" => Some("social"),

        // Utilities
        "public.app-category.utilities" => Some("utilities"),

        // Entertainment (games, music, video)
        "public.app-category.entertainment" => Some("entertainment"),
        "public.app-category.games" => Some("entertainment"),
        "public.app-category.music" => Some("entertainment"),
        "public.app-category.video" => Some("entertainment"),

        // Creativity (graphics, design, photography)
        "public.app-category.graphics-design" => Some("creativity"),
        "public.app-category.photography" => Some("creativity"),

        // Planning (productivity, business, finance)
        "public.app-category.productivity" => Some("planning"),
        "public.app-category.business" => Some("planning"),
        "public.app-category.finance" => Some("planning"),

        // Office (education, reference)
        "public.app-category.education" => Some("office"),
        "public.app-category.reference" => Some("office"),

        _ => None,
    }
}

fn detect_tag_from_bundle_id(bundle_id: &str) -> Option<&'static str> {
    let bundle_lower = bundle_id.to_lowercase();

    // Exclude Chrome/Edge PWAs (Progressive Web Apps) - these are NOT browsers
    if bundle_lower.contains(".chrome.app.") || bundle_lower.contains(".edge.app.") {
        return None; // Let other detection methods handle PWAs
    }

    // Browsers - Use specific patterns to avoid false matches
    // Check for exact domain segments (e.g., "org.mozilla.firefox")
    if bundle_lower.contains(".safari") || bundle_lower.contains("safari.") {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains(".chrome") || bundle_lower.contains("chrome.") || bundle_lower == "com.google.chrome" {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains(".firefox") || bundle_lower.contains("mozilla.") {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains("torbrowser") || bundle_lower.contains("torproject") {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains(".brave") || bundle_lower.contains("brave.") {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains(".opera") || bundle_lower.contains("opera.") {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains(".vivaldi") {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains(".edge") || bundle_lower.contains("microsoftedge") {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains("dolphin.anty") || bundle_lower.contains("dolphinanty") {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains(".arc") || bundle_lower == "company.thebrowser.browser" {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }
    if bundle_lower.contains("waterfox") || bundle_lower.contains("palemoon")
        || bundle_lower.contains("floorp") || bundle_lower.contains("librewolf") {
        // println!("✅ Browser detected via bundle_id: {} → browsers", bundle_id);
        return Some("browsers");
    }

    // Office - productivity suites and document apps
    const OFFICE: &[&str] = &[
        "google.docs", "google.sheets", "google.slides", "google.gmail",
        "microsoft.word", "microsoft.excel", "microsoft.powerpoint", "microsoft.outlook",
        "libreoffice", "openoffice", "pages", "numbers", "keynote",
        "notion", "obsidian", "evernote", "onenote", "bear", "ulysses",
        "writer", "calc", "impress", "airtable", "coda"
    ];
    if OFFICE.iter().any(|&app| bundle_lower.contains(app)) {
        return Some("office");
    }

    // Utilities - system tools and utilities
    const UTILITIES: &[&str] = &[
        "colorsync", "colormeter", "rectangle", "magnet", "bettertouchtool",
        "alfred", "raycast", "spotlight", "cleanmymac", "appcleaner",
        "utm", "virtualbox", "parallels", "diskspeed", "diskutility",
        " 1password", "bitwarden", "lastpass", "keepass", "dashlane",
        "bartender", "hazel", "keyboard maestro", "textexpander", "paste",
        "dropzone", "popclip", "clipy", "maccy", "flux", "nightshift"
    ];
    if UTILITIES.iter().any(|&app| bundle_lower.contains(app)) {
        return Some("utilities");
    }

    // Social - communication and social media
    const SOCIAL: &[&str] = &[
        "slack", "discord", "telegram", "whatsapp", "messenger", "signal",
        "zoom", "teams", "skype", "facetime", "meet", "webex",
        "twitter", "tweetbot", "mastodon", "bluesky", "threads",
        "instagram", "facebook", "linkedin", "tiktok", "snapchat",
        "element", "matrix", "irc", "gitter", "rocketchat"
    ];
    if SOCIAL.iter().any(|&app| bundle_lower.contains(app)) {
        return Some("social");
    }

    // Dev Tools - programming and development
    const DEV_TOOLS: &[&str] = &[
        "xcode", "vscode", "code", "jetbrains", "intellij", "pycharm", "webstorm",
        "github", "terminal", "iterm", "warp", "alacritty", "kitty",
        "docker", "postman", "insomnia", "paw", "rapidapi",
        "vim", "neovim", "macvim", "emacs", "sublime", "atom",
        "sourcetree", "tower", "gitkraken", "fork", "gitup",
        "dash", "devdocs", "sequel", "tableplus", "postico", "dbeaver",
        "simulator", "charles", "proxyman", "wireshark"
    ];
    if DEV_TOOLS.iter().any(|&app| bundle_lower.contains(app)) {
        return Some("dev-tools");
    }

    // Creativity - design, photo, video editing
    const CREATIVITY: &[&str] = &[
        "photoshop", "illustrator", "indesign", "aftereffects", "premiere",
        "lightroom", "bridge", "xd", "dimension", "fresco", "adobe",
        "sketch", "figma", "affinity", "pixelmator", "acorn",
        "inkscape", "gimp", "krita", "blender", "cinema4d",
        "final cut", "davinci", "lumafusion", "compressor", "motion",
        "logic", "garageband", "ableton", "fl studio", "audacity",
        "procreate", "clip studio", "rebelle", "corel", "canva"
    ];
    if CREATIVITY.iter().any(|&app| bundle_lower.contains(app)) {
        return Some("creativity");
    }

    // Entertainment - media, games, streaming
    const ENTERTAINMENT: &[&str] = &[
        "spotify", "music", "itunes", "tidal", "deezer", "soundcloud",
        "vlc", "iina", "quicktime", "plex", "kodi", "infuse",
        "netflix", "youtube", "prime video", "disney", "hulu", "hbo",
        "steam", "epic", "gog", "origin", "uplay", "battlenet",
        "game", "minecraft", "league of legends", "fortnite", "valorant",
        "twitch", "obs", "streamlabs", "discord", "parsec"
    ];
    if ENTERTAINMENT.iter().any(|&app| bundle_lower.contains(app)) {
        return Some("entertainment");
    }

    // Planning - calendars, notes, task management
    const PLANNING: &[&str] = &[
        "calendar", "fantastical", "busycal", "cron", "morgen",
        "reminders", "todoist", "things", "omnifocus", "taskpaper",
        "notes", "agenda", "craft", "roam", "logseq",
        "trello", "asana", "monday", "clickup", "linear",
        "timery", "toggl", "rescuetime", "timeular", "clockify"
    ];
    if PLANNING.iter().any(|&app| bundle_lower.contains(app)) {
        return Some("planning");
    }

    None
}

fn detect_tag_from_app_name(name: &str, _bundle_id: &str) -> Option<&'static str> {
    let name_lower = name.to_lowercase();

    // Browsers
    const BROWSER_NAMES: &[&str] = &[
        "safari", "chrome", "firefox", "edge", "brave", "tor browser",
        "opera", "arc", "orion", "vivaldi"
    ];
    if BROWSER_NAMES.iter().any(|&n| name_lower.contains(n)) {
        return Some("browsers");
    }

    // Office apps
    const OFFICE_NAMES: &[&str] = &[
        "google docs", "google sheets", "google slides", "gmail", "google drive",
        "microsoft word", "microsoft excel", "microsoft powerpoint", "outlook",
        "pages", "numbers", "keynote", "libreoffice", "notion"
    ];
    if OFFICE_NAMES.iter().any(|&n| name_lower.contains(n)) {
        return Some("office");
    }

    // Utilities
    const UTILITY_NAMES: &[&str] = &[
        "utility", "activity monitor", "console", "disk utility", "finder",
        "system preferences", "system settings", "terminal", "calculator"
    ];
    if UTILITY_NAMES.iter().any(|&n| name_lower.contains(n)) {
        return Some("utilities");
    }

    // Social
    const SOCIAL_NAMES: &[&str] = &[
        "mail", "facetime", "messages", "slack", "discord", "zoom"
    ];
    if SOCIAL_NAMES.iter().any(|&n| name_lower.contains(n)) {
        return Some("social");
    }

    // Planning
    const PLANNING_NAMES: &[&str] = &[
        "calendar", "reminders", "notes", "todoist", "things"
    ];
    if PLANNING_NAMES.iter().any(|&n| name_lower.contains(n)) {
        return Some("planning");
    }

    // Creativity
    const CREATIVITY_NAMES: &[&str] = &[
        "photos", "photoshop", "illustrator", "sketch", "figma",
        "final cut", "logic pro"
    ];
    if CREATIVITY_NAMES.iter().any(|&n| name_lower.contains(n)) {
        return Some("creativity");
    }

    None
}

fn extract_app_icon(app_path: &Path, plist_dict: &plist::Dictionary) -> Option<String> {
    // Generate cache key for this app
    let cache_key = get_icon_cache_key(app_path);
    let cache_key_ref = cache_key.as_deref();

    // Check cache first - this is the fast path!
    if let Some(ref key) = cache_key {
        if let Some(cached) = load_cached_icon(key) {
            return Some(cached);
        }
    }

    // Try macOS style first: Contents/Resources/*.icns
    if let Some(icon_file) = plist_dict
        .get("CFBundleIconFile")
        .and_then(|v| v.as_string())
    {
        let resources_path = app_path.join("Contents/Resources");
        let mut icon_path = resources_path.join(icon_file);

        // Add .icns extension if not present
        if icon_path.extension().is_none() {
            icon_path.set_extension("icns");
        }

        if icon_path.exists() {
            return extract_icns_as_base64(&icon_path, cache_key_ref);
        }

        // Try without extension
        icon_path = resources_path.join(icon_file);
        if icon_path.exists() {
            return extract_icns_as_base64(&icon_path, cache_key_ref);
        }
    }

    // Try iOS style: PNG icons at app root
    // iOS apps use CFBundleIcons -> CFBundlePrimaryIcon -> CFBundleIconFiles
    if let Some(icons_dict) = plist_dict.get("CFBundleIcons").and_then(|v| v.as_dictionary()) {
        if let Some(primary_icon) =
            icons_dict
                .get("CFBundlePrimaryIcon")
                .and_then(|v| v.as_dictionary())
        {
            if let Some(icon_files) =
                primary_icon
                    .get("CFBundleIconFiles")
                    .and_then(|v| v.as_array())
            {
                // Get the icon base name (e.g., "AppIcon60x60")
                for icon_value in icon_files {
                    if let Some(icon_base) = icon_value.as_string() {
                        // Try common iOS icon patterns
                        let patterns = [
                            format!("{}@3x.png", icon_base),
                            format!("{}@2x.png", icon_base),
                            format!("{}.png", icon_base),
                        ];

                        for pattern in &patterns {
                            let icon_path = app_path.join(pattern);
                            if icon_path.exists() {
                                return extract_png_as_base64(&icon_path, cache_key_ref);
                            }
                        }
                    }
                }
            }

            // Also try CFBundleIconName if CFBundleIconFiles didn't work
            if let Some(icon_name) = primary_icon
                .get("CFBundleIconName")
                .and_then(|v| v.as_string())
            {
                // Search for any PNG starting with this name
                if let Ok(entries) = fs::read_dir(app_path) {
                    let mut best_icon: Option<PathBuf> = None;
                    let mut best_size = 0;

                    for entry in entries.flatten() {
                        let path = entry.path();
                        if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                            if filename.starts_with(icon_name) && filename.ends_with(".png") {
                                // Prefer @2x or @3x versions for better quality
                                let size = if filename.contains("@3x") {
                                    3
                                } else if filename.contains("@2x") {
                                    2
                                } else {
                                    1
                                };
                                if size > best_size {
                                    best_size = size;
                                    best_icon = Some(path);
                                }
                            }
                        }
                    }

                    if let Some(icon_path) = best_icon {
                        return extract_png_as_base64(&icon_path, cache_key_ref);
                    }
                }
            }
        }
    }

    None
}

fn extract_png_as_base64(png_path: &Path, cache_key: Option<&str>) -> Option<String> {
    let png_data = fs::read(png_path).ok()?;

    // Cache the PNG if we have a cache key
    if let Some(key) = cache_key {
        save_icon_to_cache(key, &png_data);
    }

    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png_data);
    Some(format!("data:image/png;base64,{}", encoded))
}

fn extract_icns_as_base64(icon_path: &Path, cache_key: Option<&str>) -> Option<String> {
    use std::env;
    use std::process::Command;

    // Use macOS sips utility to convert ICNS to PNG
    let temp_dir = env::temp_dir();
    // Use cache_key in temp filename to avoid conflicts in parallel execution
    let temp_name = cache_key.unwrap_or("icon");
    let temp_png = temp_dir.join(format!("launchpad_{}_{}.png", temp_name, std::process::id()));

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
        let _ = fs::remove_file(&temp_png);
        return None;
    }

    // Read the converted PNG
    let png_data = fs::read(&temp_png).ok()?;

    // Clean up temp file
    let _ = fs::remove_file(&temp_png);

    // Cache the converted PNG
    if let Some(key) = cache_key {
        save_icon_to_cache(key, &png_data);
    }

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
    use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem};

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
        .menu(|app| {
            // Create custom menu with About item that emits event
            let about_item = MenuItemBuilder::with_id("about", "About Launchpad")
                .build(app)?;
            let quit_item = PredefinedMenuItem::quit(app, Some("Quit Launchpad"))?;

            let app_submenu = tauri::menu::SubmenuBuilder::new(app, "Launchpad")
                .item(&about_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let menu = Menu::with_items(app, &[
                &app_submenu,
            ])?;

            Ok(menu)
        })
        .on_menu_event(|app, event| {
            if event.id() == "about" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("show-about-dialog", ());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            get_installed_apps_fast,
            load_app_icons,
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
