import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
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
  isFiltering: boolean; // True when tag filter or search is active
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
  isFiltering,
  gridSettings,
  saveItemOrder,
  saveFolders,
}: UseDragAndDropProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<LaunchpadItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [iconHoverIndex, setIconHoverIndex] = useState<number | null>(null); // For folder join - only when over icon
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState<MousePosition | null>(null);
  const [mouseDownItem, setMouseDownItem] = useState<MouseDownItemState | null>(null);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [previewTargetIndex, setPreviewTargetIndex] = useState<number | null>(null);
  const pageSwitchTimerRef = useRef<number | null>(null);

  // Refs to hold current values for event handlers (avoids stale closures)
  const isDraggingRef = useRef(isDragging);
  const draggedItemRef = useRef(draggedItem);
  const draggedIndexRef = useRef(draggedIndex);
  const mouseDownPosRef = useRef(mouseDownPos);
  const mouseDownItemRef = useRef(mouseDownItem);
  const previewTargetIndexRef = useRef(previewTargetIndex);
  const itemsRef = useRef(items);
  const foldersRef = useRef(folders);
  const openFolderRef = useRef(openFolder);
  const currentPageRef = useRef(currentPage);
  const isFilteringRef = useRef(isFiltering);

  // Ref for handleDrop function (defined later)
  const handleDropRef = useRef<((e: React.DragEvent | null, targetIndex: number, targetItem: LaunchpadItem) => void) | null>(null);

  // Keep refs in sync with props (these change externally)
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { foldersRef.current = folders; }, [folders]);
  useEffect(() => { openFolderRef.current = openFolder; }, [openFolder]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { isFilteringRef.current = isFiltering; }, [isFiltering]);

  // Wrapper setters that update refs SYNCHRONOUSLY (avoids race conditions)
  const setIsDraggingWithRef = (value: boolean) => {
    isDraggingRef.current = value;
    setIsDragging(value);
  };
  const setDraggedItemWithRef = (value: LaunchpadItem | null) => {
    draggedItemRef.current = value;
    setDraggedItem(value);
  };
  const setDraggedIndexWithRef = (value: number | null) => {
    draggedIndexRef.current = value;
    setDraggedIndex(value);
  };
  const setMouseDownPosWithRef = (value: MousePosition | null) => {
    mouseDownPosRef.current = value;
    setMouseDownPos(value);
  };
  const setMouseDownItemWithRef = (value: MouseDownItemState | null) => {
    mouseDownItemRef.current = value;
    setMouseDownItem(value);
  };
  const setPreviewTargetIndexWithRef = (value: number | null) => {
    previewTargetIndexRef.current = value;
    setPreviewTargetIndex(value);
  };

  /**
   * Handle dropping an item onto another item or position
   */
  const handleDrop = (
    e: React.DragEvent | null,
    _targetIndex: number,
    targetItem: LaunchpadItem
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (draggedIndex === null || draggedItem === null) {
      return;
    }
    // Disable drag-drop when filtering (search or tag)
    if (isFiltering) {
      return;
    }

    // Find the actual indices in the items array using item identifiers
    const actualDraggedIndex = items.findIndex((item) => {
      const itemId = isFolder(item) ? item.id : item.bundle_id;
      const draggedId = isFolder(draggedItem) ? draggedItem.id : draggedItem.bundle_id;
      return itemId === draggedId;
    });

    const actualTargetIndex = items.findIndex((item) => {
      const itemId = isFolder(item) ? item.id : item.bundle_id;
      const targetId = isFolder(targetItem) ? targetItem.id : targetItem.bundle_id;
      return itemId === targetId;
    });

    // Safety check
    if (actualDraggedIndex === -1 || actualTargetIndex === -1) {
      setIsDragging(false);
      setDraggedIndex(null);
      setDraggedItem(null);
      setDragOverIndex(null);
      setPreviewTargetIndex(null);
      return;
    }

    // Same position, no change needed
    if (actualDraggedIndex === actualTargetIndex) {
      setIsDragging(false);
      setDraggedIndex(null);
      setDraggedItem(null);
      setDragOverIndex(null);
      setPreviewTargetIndex(null);
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
      const indicesToRemove = [actualDraggedIndex, actualTargetIndex].sort((a, b) => b - a);
      indicesToRemove.forEach((idx) => newItems.splice(idx, 1));

      // Insert at the lower index position
      const insertPos = Math.min(actualDraggedIndex, actualTargetIndex);
      newItems.splice(insertPos, 0, newFolder);

      // Calculate the page where the folder will appear
      const folderPage = Math.floor(insertPos / appsPerPage);

      console.log('Folder creation:', {
        actualDraggedIndex,
        actualTargetIndex,
        insertPos,
        appsPerPage,
        folderPage,
        currentPage,
        totalItems: newItems.length
      });

      // Update items first, then navigate after a brief delay to ensure React has updated
      setItems(newItems);
      saveFolders([...folders, newFolder]);
      saveItemOrder(newItems);

      // Navigate to the folder's page after state updates
      if (folderPage !== currentPage) {
        setTimeout(() => {
          console.log('Navigating to page:', folderPage);
          setCurrentPage(folderPage);
        }, 50);
      }
      setIsDragging(false);
      setDraggedIndex(null);
      setDraggedItem(null);
      setDragOverIndex(null);
      setPreviewTargetIndex(null);
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
      const newItems = items.filter((_, i) => i !== actualDraggedIndex);

      setItems(newItems);
      saveFolders(newFolders);
      saveItemOrder(newItems);
      setIsDragging(false);
      setDraggedIndex(null);
      setDraggedItem(null);
      setDragOverIndex(null);
      setPreviewTargetIndex(null);
      return;
    }

    // Regular reordering - move item from actualDraggedIndex to actualTargetIndex
    const newItems = [...items];
    const [removed] = newItems.splice(actualDraggedIndex, 1);
    newItems.splice(actualTargetIndex, 0, removed);

    setItems(newItems);
    saveItemOrder(newItems);
    setIsDragging(false);
    setDraggedIndex(null);
    setDraggedItem(null);
    setDragOverIndex(null);
    setPreviewTargetIndex(null);
  };

  // Keep handleDrop ref in sync
  handleDropRef.current = handleDrop;

  // Mouse-based drag system - uses refs to avoid stale closures
  // This effect only runs ONCE on mount
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Always update mouse position for ghost element
      setMousePos({ x: e.clientX, y: e.clientY });

      const mdPos = mouseDownPosRef.current;
      const mdItem = mouseDownItemRef.current;
      const dragging = isDraggingRef.current;
      const dragIdx = draggedIndexRef.current;

      if (mdPos && mdItem && !dragging && !isFilteringRef.current) {
        const dx = Math.abs(e.clientX - mdPos.x);
        const dy = Math.abs(e.clientY - mdPos.y);

        // Start dragging if moved more than 5 pixels
        if (dx > 5 || dy > 5) {
          // Use flushSync to force immediate render so ghost appears before mouseup can fire
          flushSync(() => {
            setIsDraggingWithRef(true);
            setDraggedIndexWithRef(mdItem.index);
            setDraggedItemWithRef(mdItem.item);
          });
        }
      }

      // Update preview position while dragging
      if (dragging && dragIdx !== null && dragIdx !== -1) {
        const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
        const curPage = currentPageRef.current;
        const curItems = itemsRef.current;

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
        if (e.clientX < EDGE_ZONE && curPage > 0) {
          pageSwitchTimerRef.current = window.setTimeout(() => {
            setCurrentPage(Math.max(0, currentPageRef.current - 1));
            pageSwitchTimerRef.current = null;
          }, 500);
        }
        // Check if near right edge and not on last page
        else if (e.clientX > screenWidth - EDGE_ZONE && curPage < pages - 1) {
          pageSwitchTimerRef.current = window.setTimeout(() => {
            setCurrentPage(Math.min(pages - 1, currentPageRef.current + 1));
            pageSwitchTimerRef.current = null;
          }, 500);
        }

        // Check if hovering directly over an icon (for folder creation/addition)
        const hoveringOverIcon = elementsAtPoint.find(
          (el) => el.classList.contains("icon-container")
        );

        // Check if hovering over an item container (for any hover detection)
        const hoveringOverItem = elementsAtPoint.find(
          (el) => el.classList.contains("app-item") || el.classList.contains("folder-item")
        );

        // Set folder join target only when hovering directly over an icon
        if (hoveringOverIcon && hoveringOverItem) {
          const title = hoveringOverItem.getAttribute("title");
          if (title) {
            const targetIndex = curItems.findIndex((item) => {
              const itemName = isFolder(item) ? item.name : item.name;
              return itemName === title;
            });
            if (targetIndex !== -1 && targetIndex !== dragIdx) {
              setIconHoverIndex(targetIndex);
            } else {
              setIconHoverIndex(null);
            }
          } else {
            setIconHoverIndex(null);
          }
        } else {
          setIconHoverIndex(null);
        }

        // Only show reorder preview if NOT hovering over an icon
        if (!hoveringOverIcon) {
          const gridElement = elementsAtPoint.find((el) => el.classList.contains("apps-grid")) as
            | HTMLElement
            | undefined;

          if (gridElement) {
            const rect = gridElement.getBoundingClientRect();

            // Account for grid padding when calculating position
            const style = getComputedStyle(gridElement);
            const paddingLeft = parseFloat(style.paddingLeft) || 0;
            const paddingTop = parseFloat(style.paddingTop) || 0;

            const gridX = e.clientX - rect.left - paddingLeft;
            const gridY = e.clientY - rect.top - paddingTop;

            const cols = gridSettings.cols;

            // Get the actual first app-item to calculate real dimensions
            const firstItem = gridElement.querySelector(".app-item") as HTMLElement | null;
            let itemWidth = (rect.width - paddingLeft * 2) / cols;
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

            // Clamp to valid range (handles negative from padding area)
            const col = Math.max(0, Math.floor(gridX / itemWidth));
            const row = Math.max(0, Math.floor(gridY / itemHeight));
            const targetIndex = row * cols + col;
            const currentStartIndex = curPage * appsPerPage;
            const targetGlobalIndex = currentStartIndex + targetIndex;

            if (
              targetGlobalIndex >= 0 &&
              targetGlobalIndex < curItems.length &&
              targetGlobalIndex !== dragIdx
            ) {
              setPreviewTargetIndexWithRef(targetGlobalIndex);
            } else {
              setPreviewTargetIndexWithRef(null);
            }
          } else {
            setPreviewTargetIndexWithRef(null);
          }
        } else {
          setPreviewTargetIndexWithRef(null);
        }
      } else {
        if (pageSwitchTimerRef.current !== null) {
          clearTimeout(pageSwitchTimerRef.current);
          pageSwitchTimerRef.current = null;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Read current values from refs
      const wasDragging = isDraggingRef.current;
      const currentDraggedItem = draggedItemRef.current;
      const currentDraggedIndex = draggedIndexRef.current;
      const curItems = itemsRef.current;
      const curFolders = foldersRef.current;
      const curOpenFolder = openFolderRef.current;
      const curPage = currentPageRef.current;
      const curPreviewTarget = previewTargetIndexRef.current;

      if (wasDragging && currentDraggedItem) {
        const isDraggingFromFolder = currentDraggedIndex === -1;
        const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);

        const appItemElement = elementsAtPoint.find(
          (el) => el.classList.contains("app-item") || el.classList.contains("folder-item")
        ) as HTMLElement | undefined;

        if (appItemElement) {
          const title = appItemElement.getAttribute("title");

          if (title) {
            const targetGlobalIndex = curItems.findIndex((item) => {
              const itemName = isFolder(item) ? item.name : item.name;
              return itemName === title;
            });

            if (
              targetGlobalIndex !== -1 &&
              targetGlobalIndex !== currentDraggedIndex &&
              !isDraggingFromFolder
            ) {
              const targetItem = curItems[targetGlobalIndex];
              const currentStartIndex = curPage * appsPerPage;
              const targetIndexInPage = targetGlobalIndex - currentStartIndex;

              handleDropRef.current?.(null, targetIndexInPage, targetItem);
            }
          }
        } else {
          let targetGlobalIndex = curPreviewTarget;

          if (targetGlobalIndex === null) {
            const gridElement = elementsAtPoint.find((el) => el.classList.contains("apps-grid")) as
              | HTMLElement
              | undefined;

            if (gridElement) {
              const rect = gridElement.getBoundingClientRect();

              // Account for grid padding when calculating position
              const style = getComputedStyle(gridElement);
              const paddingLeft = parseFloat(style.paddingLeft) || 0;
              const paddingTop = parseFloat(style.paddingTop) || 0;

              const gridX = e.clientX - rect.left - paddingLeft;
              const gridY = e.clientY - rect.top - paddingTop;

              const cols = gridSettings.cols;
              const firstItem = gridElement.querySelector(".app-item") as HTMLElement | null;
              let itemWidth = (rect.width - paddingLeft * 2) / cols;
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

              // Clamp to valid range (handles negative from padding area)
              const col = Math.max(0, Math.floor(gridX / itemWidth));
              const row = Math.max(0, Math.floor(gridY / itemHeight));

              const targetIndex = row * cols + col;
              const currentStartIndex = curPage * appsPerPage;
              targetGlobalIndex = currentStartIndex + targetIndex;
            }
          }

          if (
            targetGlobalIndex !== null &&
            targetGlobalIndex < curItems.length &&
            currentDraggedIndex !== null &&
            targetGlobalIndex !== currentDraggedIndex &&
            !isDraggingFromFolder &&
            currentDraggedItem
          ) {
            // Find actual index in items array
            const actualDraggedIndex = curItems.findIndex((item) => {
              const itemId = isFolder(item) ? item.id : item.bundle_id;
              const draggedId = isFolder(currentDraggedItem) ? currentDraggedItem.id : currentDraggedItem.bundle_id;
              return itemId === draggedId;
            });

            if (actualDraggedIndex !== -1) {
              const newItems = [...curItems];
              const [removed] = newItems.splice(actualDraggedIndex, 1);
              newItems.splice(targetGlobalIndex, 0, removed);

              setItems(newItems);
              saveItemOrder(newItems);
            }
          }
        }

        // Handle dragging from folder to outside
        if (isDraggingFromFolder && !isFolder(currentDraggedItem)) {
          const folderModal = elementsAtPoint.find((el) => el.classList.contains("folder-modal"));

          if (
            !folderModal ||
            !elementsAtPoint.find((el) => el.classList.contains("folder-content"))
          ) {
            if (curOpenFolder) {
              const appToRemove = currentDraggedItem;
              const updatedFolder = {
                ...curOpenFolder,
                apps: curOpenFolder.apps.filter((a) => a.bundle_id !== appToRemove.bundle_id),
              };

              const newFolders = curFolders.map((f) => (f.id === curOpenFolder.id ? updatedFolder : f));
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
      }

      // ALWAYS clear drag state on mouseup, regardless of whether drop logic ran
      setIsDraggingWithRef(false);
      setDraggedIndexWithRef(null);
      setDraggedItemWithRef(null);
      setDragOverIndex(null);
      setIconHoverIndex(null);
      setPreviewTargetIndexWithRef(null);
      setMouseDownPosWithRef(null);
      setMouseDownItemWithRef(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    draggedIndex,
    draggedItem,
    dragOverIndex,
    iconHoverIndex,
    isDragging,
    mousePos,
    previewTargetIndex,
    setDraggedIndex: setDraggedIndexWithRef,
    setDraggedItem: setDraggedItemWithRef,
    setDragOverIndex,
    setMouseDownPos: setMouseDownPosWithRef,
    setMouseDownItem: setMouseDownItemWithRef,
    handleDrop,
  };
}
