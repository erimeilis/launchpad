import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { App, Folder, LaunchpadItem } from "../types";
import { isFolder } from "../types";

/** Icon update payload from backend */
interface IconUpdate {
  bundle_id: string;
  icon: string;
}

/**
 * Hook that manages app loading, launching, and item ordering
 * Uses progressive loading for fast startup
 */
export function useAppManagement() {
  const [apps, setApps] = useState<App[]>([]);
  const [items, setItems] = useState<LaunchpadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [iconsLoading, setIconsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to apps for icon updates without causing re-renders
  const appsRef = useRef<App[]>([]);

  /**
   * Load installed applications using progressive loading
   * 1. First, get apps quickly without icons
   * 2. Then, load icons in parallel via events
   */
  async function loadApps() {
    try {
      setLoading(true);
      setIconsLoading(true);

      // Phase 1: Get apps quickly without icons
      const installedApps = await invoke<App[]>("get_installed_apps_fast");
      appsRef.current = installedApps;
      setApps(installedApps);
      setLoading(false); // Apps are ready to display!
      setError(null);

      // Phase 2: Start loading icons in background
      invoke("load_app_icons").catch((err) => {
        console.error("Failed to load app icons:", err);
      });
    } catch (err) {
      console.error("Failed to load apps:", err);
      setError("Failed to load applications");
      setLoading(false);
      setIconsLoading(false);
    }
  }

  /**
   * Handle icon updates from backend
   */
  const handleIconUpdates = useCallback((updates: IconUpdate[]) => {
    // Create a map for fast lookup
    const iconMap = new Map(updates.map((u) => [u.bundle_id, u.icon]));

    // Update apps with new icons
    setApps((prevApps) => {
      const newApps = prevApps.map((app) => {
        const newIcon = iconMap.get(app.bundle_id);
        if (newIcon) {
          return { ...app, icon: newIcon };
        }
        return app;
      });
      appsRef.current = newApps;
      return newApps;
    });
  }, []);

  // Set up event listeners for progressive icon loading
  useEffect(() => {
    let unlistenIcons: UnlistenFn | null = null;
    let unlistenComplete: UnlistenFn | null = null;

    async function setupListeners() {
      // Listen for batched icon updates
      unlistenIcons = await listen<IconUpdate[]>("icons-loaded", (event) => {
        handleIconUpdates(event.payload);
      });

      // Listen for completion
      unlistenComplete = await listen("icons-complete", () => {
        setIconsLoading(false);
      });
    }

    setupListeners();

    return () => {
      if (unlistenIcons) unlistenIcons();
      if (unlistenComplete) unlistenComplete();
    };
  }, [handleIconUpdates]);

  /**
   * Launch an application and minimize the window
   */
  async function launchApp(appPath: string) {
    try {
      await invoke("launch_app", { appPath });
      // Minimize to dock after launching
      await getCurrentWindow().minimize();
    } catch (err) {
      console.error("Failed to launch app:", err);
    }
  }

  /**
   * Save item order to localStorage
   */
  function saveItemOrder(newItems: LaunchpadItem[]) {
    const orderMap: Record<string, number> = {};
    newItems.forEach((item, index) => {
      const id = isFolder(item) ? item.id : item.bundle_id;
      orderMap[id] = index;
    });
    localStorage.setItem("launchpad-item-order", JSON.stringify(orderMap));
  }

  /**
   * Merge apps and folders into a unified items array
   * This function syncs folder apps with fresh app data to ensure tags are up-to-date
   */
  function mergeAppsAndFolders(apps: App[], folders: Folder[]): LaunchpadItem[] {
    if (apps.length === 0) return [];

    // Create a map of bundle_id to fresh app data for quick lookup
    const appMap = new Map(apps.map((app) => [app.bundle_id, app]));

    // Update folders with fresh app data (to sync tags and other properties)
    const updatedFolders = folders.map((folder) => ({
      ...folder,
      apps: folder.apps
        .map((folderApp) => {
          // Use fresh app data if available, otherwise keep existing
          const freshApp = appMap.get(folderApp.bundle_id);
          return freshApp || folderApp;
        })
        .filter((app) => appMap.has(app.bundle_id)), // Remove apps that no longer exist
    }));

    const folderAppIds = new Set(updatedFolders.flatMap((f) => f.apps.map((a) => a.bundle_id)));
    const standaloneApps = apps.filter((app) => !folderAppIds.has(app.bundle_id));
    const newItems: LaunchpadItem[] = [...standaloneApps, ...updatedFolders];

    // Load custom item order from localStorage
    const savedOrder = localStorage.getItem("launchpad-item-order");
    if (savedOrder) {
      try {
        const orderMap = JSON.parse(savedOrder) as Record<string, number>;
        newItems.sort((a, b) => {
          const idA = isFolder(a) ? a.id : a.bundle_id;
          const idB = isFolder(b) ? b.id : b.bundle_id;
          const posA = orderMap[idA] ?? 9999;
          const posB = orderMap[idB] ?? 9999;
          return posA - posB;
        });
      } catch (err) {
        console.error("Failed to load item order:", err);
      }
    }

    return newItems;
  }

  /**
   * Auto-create system folders on initial load
   */
  function createSystemFolders(apps: App[], folders: Folder[]): Folder[] {
    const systemApps = apps.filter((app) => app.source_folder === "System");
    const utilityApps = apps.filter((app) => app.source_folder === "Utilities");

    const updatedFolders = [...folders];

    // Create System folder if we have system apps and folder doesn't exist
    if (systemApps.length > 0 && !folders.find((f) => f.id === "folder-system")) {
      updatedFolders.push({
        id: "folder-system",
        name: "System",
        apps: systemApps,
      });
    }

    // Create Utilities folder if we have utility apps and folder doesn't exist
    if (utilityApps.length > 0 && !folders.find((f) => f.id === "folder-utilities")) {
      updatedFolders.push({
        id: "folder-utilities",
        name: "Utilities",
        apps: utilityApps,
      });
    }

    return updatedFolders;
  }

  // Load apps and show window on mount
  useEffect(() => {
    loadApps();

    // Show window after React is ready (prevents white flash)
    getCurrentWindow()
      .show()
      .catch((err) => {
        console.error("Failed to show window:", err);
      });
  }, []);

  return {
    apps,
    items,
    loading,
    iconsLoading,
    error,
    setApps,
    setItems,
    loadApps,
    launchApp,
    saveItemOrder,
    mergeAppsAndFolders,
    createSystemFolders,
  };
}
