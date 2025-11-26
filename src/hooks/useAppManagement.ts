import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { App, Folder, LaunchpadItem } from "../types";
import { isFolder } from "../types";

/**
 * Hook that manages app loading, launching, and item ordering
 */
export function useAppManagement() {
  const [apps, setApps] = useState<App[]>([]);
  const [items, setItems] = useState<LaunchpadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load installed applications from the system
   */
  async function loadApps() {
    try {
      setLoading(true);
      const installedApps = await invoke<App[]>("get_installed_apps");
      setApps(installedApps);
      setError(null);
    } catch (err) {
      console.error("Failed to load apps:", err);
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }

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
