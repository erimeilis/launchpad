import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DeleteConfirmationState } from "../types";

interface UseKeyboardNavigationProps {
  filteredItemsLength: number;
  appsPerPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  searchQuery: string;
  showGridSettings: boolean;
  setShowGridSettings: (show: boolean) => void;
  openFolder: unknown;
  setOpenFolder: (folder: null) => void;
  deleteConfirmation: DeleteConfirmationState | null;
  setDeleteConfirmation: (confirmation: null) => void;
}

/**
 * Hook that manages keyboard shortcuts and navigation
 * Handles Escape, Arrow keys, PageUp/PageDown, and mouse wheel
 */
export function useKeyboardNavigation({
  filteredItemsLength,
  appsPerPage,
  setCurrentPage,
  searchQuery,
  showGridSettings,
  setShowGridSettings,
  openFolder,
  setOpenFolder,
  deleteConfirmation,
  setDeleteConfirmation,
}: UseKeyboardNavigationProps) {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key
      if (e.key === "Escape") {
        // Close modals in priority order
        if (deleteConfirmation) {
          setDeleteConfirmation(null);
          return;
        }
        if (showGridSettings) {
          setShowGridSettings(false);
          return;
        }
        if (openFolder) {
          setOpenFolder(null);
          return;
        }

        // Minimize to dock
        getCurrentWindow()
          .minimize()
          .catch((err) => {
            console.error("Failed to minimize window:", err);
          });
        return;
      }

      // Don't navigate if typing in search
      if (document.activeElement?.tagName === "INPUT") {
        return;
      }

      const pages = Math.ceil(filteredItemsLength / appsPerPage);

      // Page navigation
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentPage((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setCurrentPage((prev) => Math.min(pages - 1, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    filteredItemsLength,
    appsPerPage,
    showGridSettings,
    openFolder,
    deleteConfirmation,
    setCurrentPage,
    setShowGridSettings,
    setOpenFolder,
    setDeleteConfirmation,
  ]);

  // Mouse wheel for page navigation
  useEffect(() => {
    let lastWheelTime = 0;
    const WHEEL_DEBOUNCE = 300;

    const handleWheel = (e: WheelEvent) => {
      if (searchQuery) return;
      if (showGridSettings || openFolder) return;

      const pages = Math.ceil(filteredItemsLength / appsPerPage);
      if (pages <= 1) return;

      const now = Date.now();
      if (now - lastWheelTime < WHEEL_DEBOUNCE) return;

      // Check if scrolling vertically
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        lastWheelTime = now;

        if (e.deltaY > 0) {
          // Scroll down = next page
          setCurrentPage((prev) => {
            const next = prev + 1;
            return next < pages ? next : prev;
          });
        } else {
          // Scroll up = previous page
          setCurrentPage((prev) => {
            const next = prev - 1;
            return next >= 0 ? next : prev;
          });
        }
      }
    };

    window.addEventListener("wheel", handleWheel);
    return () => window.removeEventListener("wheel", handleWheel);
  }, [filteredItemsLength, appsPerPage, searchQuery, showGridSettings, openFolder, setCurrentPage]);
}
