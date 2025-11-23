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
import { GridSettings } from "./components/GridSettings";
import { DeleteConfirmation } from "./components/DeleteConfirmation";

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
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    folderId: string;
    folderName: string;
  } | null>(null);

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

  // Filter items based on search
  const filteredItems = searchQuery
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
    : items;

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

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // Context menu handler
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  // Save grid settings
  function saveGridSettings() {
    localStorage.setItem("launchpad-grid-settings", JSON.stringify(gridSettings));
    setShowGridSettings(false);
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
                    onLaunch={launchApp}
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
    </div>
  );
}

export default App;
