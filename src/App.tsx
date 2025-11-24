import { useState, useEffect, useRef } from "react";
import "./App.css";

// Type imports
import type { GridSettings as GridSettingsType } from "./types";
import { isFolder } from "./types";

// Hook imports
import { useAppManagement } from "./hooks/useAppManagement";
import { useFolderManagement } from "./hooks/useFolderManagement";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";

// Component imports
import { SearchBar } from "./components/SearchBar";
import { AppItem } from "./components/AppItem";
import { FolderItem } from "./components/FolderItem";
import { FolderModal } from "./components/FolderModal";
import { PageIndicators } from "./components/PageIndicators";
import { DragGhost } from "./components/DragGhost";
import { EdgeIndicators } from "./components/EdgeIndicators";
import { ContextMenu } from "./components/ContextMenu";
import { AppContextMenu } from "./components/AppContextMenu";
import { GridSettings } from "./components/GridSettings";
import { DeleteConfirmation } from "./components/DeleteConfirmation";
import { TrashConfirmation } from "./components/TrashConfirmation";

function App() {
  // App management state and functions
  const {
    apps,
    items,
    loading,
    error,
    setItems,
    launchApp,
    loadApps,
    saveItemOrder,
    mergeAppsAndFolders,
    createSystemFolders,
  } = useAppManagement();

  // Folder management state and functions
  const {
    folders,
    openFolder,
    setFolders,
    setOpenFolder,
    saveFolders,
    createFolder,
    deleteFolder,
    updateFolderName,
  } = useFolderManagement();

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [appContextMenu, setAppContextMenu] = useState<{
    x: number;
    y: number;
    appName: string;
    appPath: string;
    bundleId: string;
  } | null>(null);
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    folderId: string;
    folderName: string;
  } | null>(null);
  const [trashConfirmation, setTrashConfirmation] = useState<{
    appName: string;
    appPath: string;
  } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [hiddenApps, setHiddenApps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("launchpad-hidden-apps");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Grid settings
  const [gridSettings, setGridSettings] = useState<GridSettingsType>(() => {
    const saved = localStorage.getItem("launchpad-grid-settings");
    return saved ? JSON.parse(saved) : { rows: 7, cols: 10, fullWidth: false };
  });

  const APPS_PER_PAGE = gridSettings.rows * gridSettings.cols;
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and drop functionality
  const {
    draggedIndex,
    draggedItem,
    dragOverIndex,
    isDragging,
    mousePos,
    previewTargetIndex,
    setDragOverIndex,
    setMouseDownPos,
    setMouseDownItem,
    handleDrop,
  } = useDragAndDrop({
    items,
    setItems,
    folders,
    setFolders,
    openFolder,
    setOpenFolder,
    currentPage,
    setCurrentPage,
    appsPerPage: APPS_PER_PAGE,
    filteredItems: searchQuery
      ? items.filter((item) => {
          if (isFolder(item)) {
            return (
              item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.apps.some((app) => app.name.toLowerCase().includes(searchQuery.toLowerCase()))
            );
          } else {
            return item.name.toLowerCase().includes(searchQuery.toLowerCase());
          }
        })
      : items,
    searchQuery,
    gridSettings,
    saveItemOrder,
    saveFolders,
  });

  // Filter out hidden apps from items
  const visibleItems = items.filter((item) => {
    if (isFolder(item)) return true; // Never hide folders
    return !hiddenApps.has(item.bundle_id);
  });

  // Use visibleItems instead of items for display
  const filteredItems = searchQuery
    ? visibleItems.filter((item) => {
        if (isFolder(item)) {
          return (
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.apps.some((app) => app.name.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        } else {
          return item.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
      })
    : visibleItems;

  // Create preview items array while dragging
  const displayItems = (() => {
    if (isDragging && draggedIndex !== null && draggedIndex !== -1 && previewTargetIndex !== null) {
      const preview = [...filteredItems];
      const [removed] = preview.splice(draggedIndex, 1);
      preview.splice(previewTargetIndex, 0, removed);
      return preview;
    }
    return filteredItems;
  })();

  // Pagination
  const totalPages = Math.ceil(displayItems.length / APPS_PER_PAGE);
  const startIndex = currentPage * APPS_PER_PAGE;
  const endIndex = startIndex + APPS_PER_PAGE;
  const currentItems = searchQuery ? displayItems : displayItems.slice(startIndex, endIndex);

  // Keyboard navigation
  useKeyboardNavigation({
    filteredItemsLength: filteredItems.length,
    appsPerPage: APPS_PER_PAGE,
    setCurrentPage,
    searchQuery,
    showGridSettings,
    setShowGridSettings,
    openFolder,
    setOpenFolder,
    deleteConfirmation,
    setDeleteConfirmation,
    editMode,
    setEditMode,
    trashConfirmation,
    setTrashConfirmation,
    appContextMenu,
    setAppContextMenu,
  });

  // Merge apps and folders into items array
  useEffect(() => {
    if (apps.length > 0) {
      // Auto-create System and Utilities folders if they don't exist
      const updatedFolders = createSystemFolders(apps, folders);

      // Save updated folders if we added any
      if (updatedFolders.length > folders.length) {
        saveFolders(updatedFolders);
      }

      const newItems = mergeAppsAndFolders(apps, updatedFolders);
      setItems(newItems);
    }
  }, [apps, folders, createSystemFolders, mergeAppsAndFolders, saveFolders, setItems]);

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  // Close context menus on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setAppContextMenu(null);
    };
    if (contextMenu || appContextMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [contextMenu, appContextMenu]);

  // Position window on cursor's monitor when app starts
  useEffect(() => {
    async function positionWindow() {
      const { invoke } = await import("@tauri-apps/api/core");
      try {
        await invoke("position_on_cursor_monitor");
      } catch (err) {
        console.error("Failed to position window on cursor monitor:", err);
        // Fallback: just show the window
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().show();
      }
    }

    positionWindow();
  }, []);

  // Multi-monitor aware focus handling
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let currentDisplayMonitor: { name: string | null; position: { x: number; y: number } } | null = null;

    async function setupFocusListener() {
      const { getCurrentWindow, currentMonitor, cursorPosition, monitorFromPoint } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();

      // Store which monitor Launchpad is currently on
      try {
        const monitor = await currentMonitor();
        if (monitor) {
          currentDisplayMonitor = {
            name: monitor.name,
            position: monitor.position,
          };
        }
      } catch (err) {
        console.error("Failed to get current monitor:", err);
      }

      unlisten = await appWindow.onFocusChanged(async ({ payload: focused }) => {
        if (!focused) {
          try {
            // Get cursor position when focus was lost
            const cursor = await cursorPosition();

            // Find which monitor the cursor is on
            const cursorMonitor = await monitorFromPoint(cursor.x, cursor.y);

            // Only minimize if click was on the same monitor as Launchpad
            if (currentDisplayMonitor && cursorMonitor) {
              // Compare monitors by name and position (in case name is null)
              const sameMonitor =
                (cursorMonitor.name && cursorMonitor.name === currentDisplayMonitor.name) ||
                (cursorMonitor.position.x === currentDisplayMonitor.position.x &&
                 cursorMonitor.position.y === currentDisplayMonitor.position.y);

              if (sameMonitor) {
                // Click was on same monitor - minimize Launchpad
                await appWindow.minimize();
              }
              // If different monitor: do nothing, let focus stay on other monitor
            } else {
              // Fallback: if we can't determine monitors, minimize (safe default)
              await appWindow.minimize();
            }
          } catch (err) {
            console.error("Failed to handle focus change:", err);
            // On error, minimize as fallback
            await appWindow.minimize();
          }
        }
      });
    }

    setupFocusListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Context menu handler
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  // Toggle edit mode
  function toggleEditMode() {
    setEditMode(!editMode);
    setContextMenu(null);
  }

  // Save grid settings
  function saveGridSettings() {
    localStorage.setItem("launchpad-grid-settings", JSON.stringify(gridSettings));
    setShowGridSettings(false);
  }

  // Sort all items alphabetically
  function sortAlphabetically() {
    const sorted = [...items].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    setItems(sorted);
    saveItemOrder(sorted);
    setCurrentPage(0);
  }

  // Hide app from Launchpad
  function hideApp(bundleId: string) {
    const newHidden = new Set(hiddenApps);
    newHidden.add(bundleId);
    setHiddenApps(newHidden);
    localStorage.setItem("launchpad-hidden-apps", JSON.stringify(Array.from(newHidden)));
  }

  // Handle app right-click
  function handleAppContextMenu(e: React.MouseEvent, app: any) {
    e.preventDefault();
    e.stopPropagation();
    setAppContextMenu({
      x: e.clientX,
      y: e.clientY,
      appName: app.name,
      appPath: app.path,
      bundleId: app.bundle_id,
    });
  }

  // App context menu actions
  async function revealInFinder(appPath: string) {
    const { invoke } = await import("@tauri-apps/api/core");
    try {
      await invoke("reveal_in_finder", { appPath });
    } catch (error) {
      console.error("Failed to reveal in Finder:", error);
    }
  }

  async function confirmMoveToTrash(appName: string, appPath: string) {
    setTrashConfirmation({ appName, appPath });
  }

  async function moveToTrash(appPath: string) {
    const { invoke } = await import("@tauri-apps/api/core");
    try {
      await invoke("move_app_to_trash", { appPath });
      // Reload apps list after deletion
      await loadApps();
      setTrashConfirmation(null);
    } catch (error) {
      console.error("Failed to move app to trash:", error);
      alert(`Failed to move app to trash: ${error}`);
    }
  }

  return (
    <div className="launchpad" onContextMenu={handleContextMenu}>
      {/* Dragging Ghost Element */}
      {isDragging && draggedItem && <DragGhost draggedItem={draggedItem} mousePos={mousePos} />}

      {/* Edge indicators for page switching */}
      {isDragging && !searchQuery && totalPages > 1 && (
        <EdgeIndicators currentPage={currentPage} totalPages={totalPages} mousePos={mousePos} />
      )}

      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {loading && (
        <div className="loading">
          <p>Loading applications...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={loadApps}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div
            className={`apps-grid ${gridSettings.fullWidth ? "full-width" : ""}`}
            ref={containerRef}
            style={{
              gridTemplateColumns: `repeat(${gridSettings.cols}, 1fr)`,
              gridAutoRows: "min-content",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
          >
            {currentItems.map((item, index) => {
              const globalIndex = searchQuery ? index : startIndex + index;
              const isDraggingThis = draggedIndex === globalIndex;
              const isDragOverThis = dragOverIndex === globalIndex;

              if (isFolder(item)) {
                return (
                  <FolderItem
                    key={item.id}
                    folder={item}
                    isDragging={isDraggingThis}
                    isDragOver={isDragOverThis}
                    onClick={() => {
                      if (!isDragging) setOpenFolder(item);
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      const globalIndex = startIndex + index;
                      setMouseDownPos({ x: e.clientX, y: e.clientY });
                      setMouseDownItem({ index: globalIndex, item });
                    }}
                    onMouseEnter={() => {
                      if (isDragging && draggedItem) {
                        const globalIndex = startIndex + index;
                        setDragOverIndex(globalIndex);
                      }
                    }}
                    onMouseUp={() => {
                      if (isDragging && draggedItem && dragOverIndex !== null) {
                        handleDrop(null as any, index, item);
                      }
                    }}
                  />
                );
              } else {
                return (
                  <AppItem
                    key={item.bundle_id}
                    app={item}
                    isDragging={isDraggingThis}
                    isDragOver={isDragOverThis}
                    editMode={editMode}
                    onLaunch={launchApp}
                    onRemove={hideApp}
                    onContextMenu={(e) => handleAppContextMenu(e, item)}
                    onMouseDown={(e) => {
                      if (e.button !== 0 || editMode) return;
                      const globalIndex = startIndex + index;
                      setMouseDownPos({ x: e.clientX, y: e.clientY });
                      setMouseDownItem({ index: globalIndex, item });
                    }}
                    onMouseEnter={() => {
                      if (isDragging && draggedItem && !editMode) {
                        const globalIndex = startIndex + index;
                        setDragOverIndex(globalIndex);
                      }
                    }}
                    onMouseUp={() => {
                      if (isDragging && draggedItem && dragOverIndex !== null && !editMode) {
                        handleDrop(null as any, index, item);
                      }
                    }}
                  />
                );
              }
            })}
          </div>

          {/* Page indicators */}
          {!searchQuery && totalPages > 1 && (
            <PageIndicators
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          )}
        </>
      )}

      {!loading && !error && currentItems.length === 0 && searchQuery && (
        <div className="no-results">
          <p>No apps found for "{searchQuery}"</p>
        </div>
      )}

      {/* Folder Modal */}
      {openFolder && (
        <FolderModal
          folder={openFolder}
          isDragging={isDragging}
          onClose={() => setOpenFolder(null)}
          onLaunchApp={launchApp}
          onUpdateName={(name) => updateFolderName(openFolder.id, name)}
          onDelete={() =>
            setDeleteConfirmation({ folderId: openFolder.id, folderName: openFolder.name })
          }
          onMouseDown={(e, app) => {
            if (e.button !== 0) return;
            setMouseDownPos({ x: e.clientX, y: e.clientY });
            // Use special marker to indicate this is from a folder
            setMouseDownItem({ index: -1, item: app });
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onCreateFolder={() => {
            createFolder();
            setContextMenu(null);
          }}
          onGridSettings={() => {
            setShowGridSettings(true);
            setContextMenu(null);
          }}
          onSortAlphabetically={() => {
            sortAlphabetically();
            setContextMenu(null);
          }}
          onEditApps={toggleEditMode}
          editMode={editMode}
        />
      )}

      {/* Grid Settings Modal */}
      {showGridSettings && (
        <GridSettings
          settings={gridSettings}
          onSettingsChange={setGridSettings}
          onSave={saveGridSettings}
          onClose={() => setShowGridSettings(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <DeleteConfirmation
          confirmation={deleteConfirmation}
          onConfirm={() => {
            deleteFolder(deleteConfirmation.folderId);
            setDeleteConfirmation(null);
          }}
          onCancel={() => setDeleteConfirmation(null)}
        />
      )}

      {/* App Context Menu */}
      {appContextMenu && (
        <AppContextMenu
          position={{ x: appContextMenu.x, y: appContextMenu.y }}
          appName={appContextMenu.appName}
          onOpen={() => launchApp(appContextMenu.appPath)}
          onRevealInFinder={() => revealInFinder(appContextMenu.appPath)}
          onMoveToTrash={() => confirmMoveToTrash(appContextMenu.appName, appContextMenu.appPath)}
          onHideFromLaunchpad={() => hideApp(appContextMenu.bundleId)}
          onClose={() => setAppContextMenu(null)}
        />
      )}

      {/* Trash Confirmation Modal */}
      {trashConfirmation && (
        <TrashConfirmation
          appName={trashConfirmation.appName}
          onConfirm={() => moveToTrash(trashConfirmation.appPath)}
          onCancel={() => setTrashConfirmation(null)}
        />
      )}
    </div>
  );
}

export default App;
