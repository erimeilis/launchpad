import { useState } from "react";
import type { Folder } from "../types";

/**
 * Hook that manages folder CRUD operations and persistence
 */
export function useFolderManagement() {
  const [folders, setFolders] = useState<Folder[]>(() => {
    const savedFolders = localStorage.getItem("launchpad-folders");
    if (savedFolders) {
      try {
        return JSON.parse(savedFolders);
      } catch (err) {
        console.error("Failed to load folders:", err);
        return [];
      }
    }
    return [];
  });
  const [openFolder, setOpenFolder] = useState<Folder | null>(null);

  /**
   * Save folders to localStorage and update state
   */
  function saveFolders(newFolders: Folder[]) {
    localStorage.setItem("launchpad-folders", JSON.stringify(newFolders));
    setFolders(newFolders);
  }

  /**
   * Create a new empty folder
   */
  function createFolder() {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: "New Folder",
      apps: [],
    };
    const newFolders = [...folders, newFolder];
    saveFolders(newFolders);
  }

  /**
   * Delete a folder and return its apps to the main grid
   */
  function deleteFolder(folderId: string) {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    // Remove folder from folders list
    const newFolders = folders.filter((f) => f.id !== folderId);
    saveFolders(newFolders);

    // Apps will be automatically added back to the grid by the parent component
    setOpenFolder(null);
  }

  /**
   * Update folder name
   */
  function updateFolderName(folderId: string, name: string) {
    const newFolders = folders.map((f) => (f.id === folderId ? { ...f, name } : f));
    saveFolders(newFolders);

    // Update open folder if it's the one being renamed
    if (openFolder && openFolder.id === folderId) {
      setOpenFolder({ ...openFolder, name });
    }
  }

  return {
    folders,
    openFolder,
    setFolders,
    setOpenFolder,
    saveFolders,
    createFolder,
    deleteFolder,
    updateFolderName,
  };
}
