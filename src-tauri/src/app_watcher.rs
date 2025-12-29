use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebouncedEventKind, Debouncer, DebounceEventResult};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

/// Watches application directories for changes and triggers a callback
/// when apps are added, removed, or modified.
pub struct AppWatcher {
    debouncer: Option<Debouncer<notify::RecommendedWatcher>>,
    running: Arc<AtomicBool>,
}

impl AppWatcher {
    /// Create a new AppWatcher that will call the callback when apps change.
    /// The callback is debounced - it will only fire after 1.5 seconds of no changes.
    pub fn new<F>(callback: F) -> Self
    where
        F: Fn() + Send + Sync + 'static,
    {
        let running = Arc::new(AtomicBool::new(false));
        let running_clone = running.clone();
        let callback = Arc::new(callback);

        // Create debouncer with 1.5 second delay
        let debouncer_result = new_debouncer(
            Duration::from_millis(1500),
            move |result: DebounceEventResult| {
                if !running_clone.load(Ordering::SeqCst) {
                    return;
                }

                match result {
                    Ok(events) => {
                        // Check if any events are related to .app bundles
                        let has_app_changes = events.iter().any(|event| {
                            // Check if the path or any parent is a .app bundle
                            let path_str = event.path.to_string_lossy();
                            path_str.contains(".app")
                                && matches!(event.kind, DebouncedEventKind::Any | DebouncedEventKind::AnyContinuous)
                        });

                        if has_app_changes {
                            callback();
                        }
                    }
                    Err(error) => {
                        eprintln!("[AppWatcher] Error: {:?}", error);
                    }
                }
            },
        );

        match debouncer_result {
            Ok(debouncer) => Self {
                debouncer: Some(debouncer),
                running,
            },
            Err(e) => {
                eprintln!("[AppWatcher] Failed to create debouncer: {:?}", e);
                Self {
                    debouncer: None,
                    running,
                }
            }
        }
    }

    /// Start watching application directories
    pub fn start(&mut self) {
        let Some(ref mut debouncer) = self.debouncer else {
            eprintln!("[AppWatcher] No debouncer available");
            return;
        };

        self.running.store(true, Ordering::SeqCst);

        // Directories to watch
        let watch_paths = Self::get_watch_paths();

        for path in watch_paths {
            if path.exists() {
                match debouncer.watcher().watch(&path, RecursiveMode::Recursive) {
                    Ok(_) => {
                        println!("[AppWatcher] Watching: {}", path.display());
                    }
                    Err(e) => {
                        eprintln!("[AppWatcher] Failed to watch {}: {:?}", path.display(), e);
                    }
                }
            }
        }
    }

    /// Get the list of directories to watch for app changes
    fn get_watch_paths() -> Vec<PathBuf> {
        let mut paths = vec![
            PathBuf::from("/Applications"),
            PathBuf::from("/System/Applications"),
            PathBuf::from("/System/Applications/Utilities"),
            PathBuf::from("/Applications/Utilities"),
        ];

        // Add user Applications folder
        if let Some(home_dir) = std::env::var_os("HOME") {
            let user_apps = PathBuf::from(home_dir).join("Applications");
            paths.push(user_apps);
        }

        paths
    }

    /// Stop watching
    pub fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
    }
}

impl Drop for AppWatcher {
    fn drop(&mut self) {
        self.stop();
    }
}
