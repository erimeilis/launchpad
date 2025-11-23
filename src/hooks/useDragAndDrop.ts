import { useState, useEffect, useRef } from "react";
import type { LaunchpadItem, MousePosition, MouseDownItemState, Folder } from "../types";
import { isFolder } from "../types";

interface UseDragAndDropProps {
  items: LaunchpadItem[];
  setItems: (items: LaunchpadItem[]) => void;
  folders: Folder[];
  setFolders: (folders: Folder[]) => void;
  openFolder: Folder | null;
  setOpenFolder: (folder: Folder | null) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  appsPerPage: number;
  filteredItems: LaunchpadItem[];
  searchQuery: string;
  gridSettings: { rows: number; cols: number };
  saveItemOrder: (items: LaunchpadItem[]) => void;
  saveFolders: (folders: Folder[]) => void;
}

/**
 * Hook that manages all drag and drop functionality
 * Includes mouse-based dragging, preview positioning, page switching, and folder operations
 */
export function useDragAndDrop({
  items,
  setItems,
  folders,
  setFolders,
  openFolder,
  setOpenFolder,
  currentPage,
  setCurrentPage,
  appsPerPage,
  filteredItems,
  searchQuery,
  gridSettings,
  saveItemOrder,
  saveFolders,
}: UseDragAndDropProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<LaunchpadItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState<MousePosition | null>(null);
  const [mouseDownItem, setMouseDownItem] = useState<MouseDownItemState | null>(null);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [previewTargetIndex, setPreviewTargetIndex] = useState<number | null>(null);
  const pageSwitchTimerRef = useRef<number | null>(null);

  /**
   * Handle dropping an item onto another item or position
   */
  const handleDrop = (
    e: React.DragEvent | null,
    targetIndex: number,
    targetItem: LaunchpadItem
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (draggedIndex === null || draggedItem === null) {
      return;
    }
    if (searchQuery) {
      return;
    }

    const startIndex = currentPage * appsPerPage;
    const globalTargetIndex = startIndex + targetIndex;

    setDragOverIndex(null);

    // Same position, no change needed
    if (draggedIndex === globalTargetIndex) {
      setDraggedIndex(null);
      setDraggedItem(null);
      return;
    }

    const draggedIsApp = !isFolder(draggedItem);
    const targetIsApp = !isFolder(targetItem);

    // If dragging an app onto another app, create a folder
    if (draggedIsApp && targetIsApp) {
      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        name: "Folder",
        apps: [targetItem, draggedItem],
      };

      const newItems = [...items];
      // Remove in descending order to maintain indices
      const indicesToRemove = [draggedIndex, globalTargetIndex].sort((a, b) => b - a);
      indicesToRemove.forEach((idx) => newItems.splice(idx, 1));

      // Insert at the lower index position
      const insertPos = Math.min(draggedIndex, globalTargetIndex);
      newItems.splice(insertPos, 0, newFolder);

      setItems(newItems);
      saveFolders([...folders, newFolder]);
      saveItemOrder(newItems);
      setDraggedIndex(null);
      setDraggedItem(null);
      return;
    }

    // If dragging an app onto a folder, add to folder
    if (draggedIsApp && isFolder(targetItem)) {
      const folder = targetItem;
      const updatedFolder = {
        ...folder,
        apps: [...folder.apps, draggedItem],
      };

      const newFolders = folders.map((f) => (f.id === folder.id ? updatedFolder : f));
      const newItems = items.filter((_, i) => i !== draggedIndex);

      setItems(newItems);
      saveFolders(newFolders);
      saveItemOrder(newItems);
      setDraggedIndex(null);
      setDraggedItem(null);
      return;
    }

    // Regular reordering - move item from draggedIndex to globalTargetIndex
    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(globalTargetIndex, 0, removed);

    setItems(newItems);
    saveItemOrder(newItems);
    setDraggedIndex(null);
    setDraggedItem(null);
  };

  // Mouse-based drag system
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Always update mouse position for ghost element
      setMousePos({ x: e.clientX, y: e.clientY });

      if (mouseDownPos && mouseDownItem && !isDragging) {
        const dx = Math.abs(e.clientX - mouseDownPos.x);
        const dy = Math.abs(e.clientY - mouseDownPos.y);

        // Start dragging if moved more than 5 pixels
        if (dx > 5 || dy > 5) {
          setIsDragging(true);
          setDraggedIndex(mouseDownItem.index);
          setDraggedItem(mouseDownItem.item);
        }
      }

      // Update preview position while dragging
      if (isDragging && draggedIndex !== null && draggedIndex !== -1) {
        const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);

        // Edge detection for page switching (100px zones on left/right)
        const EDGE_ZONE = 100;
        const screenWidth = window.innerWidth;
        const pages = Math.ceil(filteredItems.length / appsPerPage);

        // Clear any existing timer
        if (pageSwitchTimerRef.current !== null) {
          clearTimeout(pageSwitchTimerRef.current);
          pageSwitchTimerRef.current = null;
        }

        // Check if near left edge and not on first page
        if (e.clientX < EDGE_ZONE && currentPage > 0) {
          pageSwitchTimerRef.current = window.setTimeout(() => {
            setCurrentPage(Math.max(0, currentPage - 1));
            pageSwitchTimerRef.current = null;
          }, 500);
        }
        // Check if near right edge and not on last page
        else if (e.clientX > screenWidth - EDGE_ZONE && currentPage < pages - 1) {
          pageSwitchTimerRef.current = window.setTimeout(() => {
            setCurrentPage(Math.min(pages - 1, currentPage + 1));
            pageSwitchTimerRef.current = null;
          }, 500);
        }

        // Check if hovering directly over an item (for folder creation/addition)
        const hoveringOverItem = elementsAtPoint.find(
          (el) => el.classList.contains("app-item") || el.classList.contains("folder-item")
        );

        // Only show reorder preview if NOT hovering over an item
        if (!hoveringOverItem) {
          const gridElement = elementsAtPoint.find((el) => el.classList.contains("apps-grid")) as
            | HTMLElement
            | undefined;

          if (gridElement) {
            const rect = gridElement.getBoundingClientRect();
            const gridX = e.clientX - rect.left;
            const gridY = e.clientY - rect.top;

            const cols = gridSettings.cols;

            // Get the actual first app-item to calculate real dimensions
            const firstItem = gridElement.querySelector(".app-item") as HTMLElement | null;
            let itemWidth = rect.width / cols;
            let itemHeight = itemWidth;

            if (firstItem) {
              const allItems = Array.from(
                gridElement.querySelectorAll(".app-item")
              ) as HTMLElement[];
              if (allItems.length > 1) {
                const secondItemRect = allItems[1].getBoundingClientRect();
                itemWidth = secondItemRect.left - firstItem.getBoundingClientRect().left;
              } else {
                itemWidth = firstItem.getBoundingClientRect().width + 24;
              }

              if (allItems.length > cols) {
                const secondRowItemRect = allItems[cols].getBoundingClientRect();
                itemHeight = secondRowItemRect.top - firstItem.getBoundingClientRect().top;
              } else {
                itemHeight = firstItem.getBoundingClientRect().height + 32;
              }
            }

            const col = Math.floor(gridX / itemWidth);
            const row = Math.floor(gridY / itemHeight);
            const targetIndex = row * cols + col;
            const currentStartIndex = currentPage * appsPerPage;
            const targetGlobalIndex = currentStartIndex + targetIndex;

            if (
              targetGlobalIndex >= 0 &&
              targetGlobalIndex < items.length &&
              targetGlobalIndex !== draggedIndex
            ) {
              setPreviewTargetIndex(targetGlobalIndex);
            } else {
              setPreviewTargetIndex(null);
            }
          } else {
            setPreviewTargetIndex(null);
          }
        } else {
          setPreviewTargetIndex(null);
        }
      } else {
        if (pageSwitchTimerRef.current !== null) {
          clearTimeout(pageSwitchTimerRef.current);
          pageSwitchTimerRef.current = null;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging && draggedItem) {
        const isDraggingFromFolder = draggedIndex === -1;
        const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);

        const appItemElement = elementsAtPoint.find(
          (el) => el.classList.contains("app-item") || el.classList.contains("folder-item")
        ) as HTMLElement | undefined;

        if (appItemElement) {
          const title = appItemElement.getAttribute("title");

          if (title) {
            const targetGlobalIndex = items.findIndex((item) => {
              const itemName = isFolder(item) ? item.name : item.name;
              return itemName === title;
            });

            if (
              targetGlobalIndex !== -1 &&
              targetGlobalIndex !== draggedIndex &&
              !isDraggingFromFolder
            ) {
              const targetItem = items[targetGlobalIndex];
              const currentStartIndex = currentPage * appsPerPage;
              const targetIndexInPage = targetGlobalIndex - currentStartIndex;

              handleDrop(null, targetIndexInPage, targetItem);
            }
          }
        } else {
          let targetGlobalIndex = previewTargetIndex;

          if (targetGlobalIndex === null) {
            const gridElement = elementsAtPoint.find((el) => el.classList.contains("apps-grid")) as
              | HTMLElement
              | undefined;

            if (gridElement) {
              const rect = gridElement.getBoundingClientRect();
              const gridX = e.clientX - rect.left;
              const gridY = e.clientY - rect.top;

              const cols = gridSettings.cols;
              const firstItem = gridElement.querySelector(".app-item") as HTMLElement | null;
              let itemWidth = rect.width / cols;
              let itemHeight = itemWidth;

              if (firstItem) {
                const allItems = Array.from(
                  gridElement.querySelectorAll(".app-item")
                ) as HTMLElement[];
                if (allItems.length > 1) {
                  const firstItemRect = allItems[0].getBoundingClientRect();
                  const secondItemRect = allItems[1].getBoundingClientRect();
                  itemWidth = secondItemRect.left - firstItemRect.left;
                } else {
                  itemWidth = firstItem.getBoundingClientRect().width + 24;
                }

                if (allItems.length > cols) {
                  const firstItemRect = allItems[0].getBoundingClientRect();
                  const secondRowItemRect = allItems[cols].getBoundingClientRect();
                  itemHeight = secondRowItemRect.top - firstItemRect.top;
                } else {
                  itemHeight = firstItem.getBoundingClientRect().height + 32;
                }
              }

              const col = Math.floor(gridX / itemWidth);
              const row = Math.floor(gridY / itemHeight);

              const targetIndex = row * cols + col;
              const currentStartIndex = currentPage * appsPerPage;
              targetGlobalIndex = currentStartIndex + targetIndex;
            }
          }

          if (
            targetGlobalIndex !== null &&
            targetGlobalIndex < items.length &&
            draggedIndex !== null &&
            targetGlobalIndex !== draggedIndex &&
            !isDraggingFromFolder
          ) {
            const newItems = [...items];
            const [removed] = newItems.splice(draggedIndex, 1);
            newItems.splice(targetGlobalIndex, 0, removed);

            setItems(newItems);
            saveItemOrder(newItems);
          }
        }

        // Handle dragging from folder to outside
        if (isDraggingFromFolder && !isFolder(draggedItem)) {
          const folderModal = elementsAtPoint.find((el) => el.classList.contains("folder-modal"));

          if (
            !folderModal ||
            !elementsAtPoint.find((el) => el.classList.contains("folder-content"))
          ) {
            if (openFolder) {
              const appToRemove = draggedItem;
              const updatedFolder = {
                ...openFolder,
                apps: openFolder.apps.filter((a) => a.bundle_id !== appToRemove.bundle_id),
              };

              const newFolders = folders.map((f) => (f.id === openFolder.id ? updatedFolder : f));
              setFolders(newFolders);
              saveFolders(newFolders);

              if (updatedFolder.apps.length === 0) {
                setOpenFolder(null);
              } else {
                setOpenFolder(updatedFolder);
              }
            }
          }
        }

        if (pageSwitchTimerRef.current !== null) {
          clearTimeout(pageSwitchTimerRef.current);
          pageSwitchTimerRef.current = null;
        }

        setTimeout(() => {
          setIsDragging(false);
          setDraggedIndex(null);
          setDraggedItem(null);
          setDragOverIndex(null);
          setPreviewTargetIndex(null);
        }, 100);
      }

      setMouseDownPos(null);
      setMouseDownItem(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    mouseDownPos,
    mouseDownItem,
    isDragging,
    draggedItem,
    draggedIndex,
    dragOverIndex,
    items,
    currentPage,
    appsPerPage,
    gridSettings,
    openFolder,
    folders,
    previewTargetIndex,
    filteredItems,
    searchQuery,
    setCurrentPage,
    setItems,
    setFolders,
    setOpenFolder,
    saveItemOrder,
    saveFolders,
  ]);

  return {
    draggedIndex,
    draggedItem,
    dragOverIndex,
    isDragging,
    mousePos,
    previewTargetIndex,
    setDraggedIndex,
    setDraggedItem,
    setDragOverIndex,
    setMouseDownPos,
    setMouseDownItem,
    handleDrop,
  };
}
