import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./App.css";

// Type imports
import type { GridSettings as GridSettingsType, Tag, App } from "./types";
import { isFolder } from "./types";

// Constants
import { PREDEFINED_TAGS, getIconByName } from "./constants/tags";

// Hook imports
import { useAppManagement } from "./hooks/useAppManagement";
import { useFolderManagement } from "./hooks/useFolderManagement";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";

// Component imports
import { SearchBar } from "./components/SearchBar";
import { TagBar } from "./components/TagBar";
import { AppItem } from "./components/AppItem";
import { FolderItem } from "./components/FolderItem";
import { FolderModal } from "./components/FolderModal";
import { PageIndicators } from "./components/PageIndicators";
import { DragGhost } from "./components/DragGhost";
import { EdgeIndicators } from "./components/EdgeIndicators";
import { ContextMenu } from "./components/ContextMenu";
import { AppContextMenu } from "./components/AppContextMenu";
import { DeleteConfirmation } from "./components/DeleteConfirmation";
import {
  LanguageSettings,
  GridLayoutSettings,
  HotCornersSettings,
  KeyboardShortcutsSettings,
  CustomTagsSettings,
} from "./components/settings";
import { TrashConfirmation } from "./components/TrashConfirmation";
import { AboutDialog } from "./components/AboutDialog";
import { CreateTagModal } from "./components/CreateTagModal";
import { Button } from "./components/ui/Button";

function App() {
  const { t } = useTranslation();

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
  // Settings modals state
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);
  const [showGridLayoutSettings, setShowGridLayoutSettings] = useState(false);
  const [showHotCornersSettings, setShowHotCornersSettings] = useState(false);
  const [showKeyboardShortcutsSettings, setShowKeyboardShortcutsSettings] = useState(false);
  const [showCustomTagsSettings, setShowCustomTagsSettings] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    folderId: string;
    folderName: string;
  } | null>(null);
  const [trashConfirmation, setTrashConfirmation] = useState<{
    appName: string;
    appPath: string;
  } | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Tag state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // Tag assignments persistence (bundleId -> array of tag keys)
  const [tagAssignments, setTagAssignments] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem("launchpad-tag-assignments");
    return saved ? JSON.parse(saved) : {};
  });
  const [customTags, setCustomTags] = useState<{
    key: string;
    label: string;
    iconName: string;
  }[]>(() => {
    const saved = localStorage.getItem("launchpad-custom-tags");
    if (!saved) return [];

    // Deduplicate tags by key (keep the last occurrence)
    const parsed = JSON.parse(saved) as { key: string; label: string; iconName: string }[];
    const uniqueByKey = new Map<string, { key: string; label: string; iconName: string }>();
    parsed.forEach(tag => uniqueByKey.set(tag.key, tag));
    const deduplicated = Array.from(uniqueByKey.values());

    // Save deduplicated version back if there were duplicates
    if (deduplicated.length !== parsed.length) {
      localStorage.setItem("launchpad-custom-tags", JSON.stringify(deduplicated));
    }

    return deduplicated;
  });

  // Grid settings
  const [gridSettings, setGridSettings] = useState<GridSettingsType>(() => {
    const saved = localStorage.getItem("launchpad-grid-settings");
    const defaults = {
      rows: 7,
      cols: 10,
      fullWidth: false,
      hotCornerEnabled: false,
      hotCorner: "top-left",
      hotCornerThreshold: 10,
      hotCornerDebounce: 5000,
      globalShortcut: "F4",
      tagSettings: {
        showTagBar: true,
        autoTagNewApps: true,
        customTags: [],
      },
    };

    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all properties exist
      return { ...defaults, ...parsed };
    }

    return defaults;
  });

  const APPS_PER_PAGE = gridSettings.rows * gridSettings.cols;
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and drop functionality
  const {
    draggedIndex,
    draggedItem,
    dragOverIndex,
    iconHoverIndex,
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
    isFiltering: !!searchQuery || !!selectedTag,
    gridSettings,
    saveItemOrder,
    saveFolders,
  });

  // Apply tag filtering and search filtering
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by selected tag (exclude folders from tag views - only show on "All")
    if (selectedTag) {
      result = result.filter((item) => {
        // Exclude all folders when a tag is selected
        if (isFolder(item)) {
          return false;
        } else {
          const app = item as App;
          return app.tags?.includes(selectedTag);
        }
      });
    }

    // Filter by search query
    if (searchQuery) {
      result = result.filter((item) => {
        if (isFolder(item)) {
          return (
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.apps.some((app) =>
              app.name.toLowerCase().includes(searchQuery.toLowerCase()),
            )
          );
        } else {
          return item.name.toLowerCase().includes(searchQuery.toLowerCase());
        }
      });
    }

    return result;
  }, [items, selectedTag, searchQuery]);

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

  // Settings modal helpers
  const isAnySettingsOpen =
    showLanguageSettings ||
    showGridLayoutSettings ||
    showHotCornersSettings ||
    showKeyboardShortcutsSettings ||
    showCustomTagsSettings;

  // Check if ANY modal is open (to block context menus)
  const isAnyModalOpen =
    isAnySettingsOpen ||
    showAboutDialog ||
    showCreateTagModal ||
    openFolder !== null ||
    deleteConfirmation !== null ||
    trashConfirmation !== null;

  const closeAllSettings = () => {
    setShowLanguageSettings(false);
    setShowGridLayoutSettings(false);
    setShowHotCornersSettings(false);
    setShowKeyboardShortcutsSettings(false);
    setShowCustomTagsSettings(false);
  };

  // Keyboard navigation
  useKeyboardNavigation({
    filteredItemsLength: filteredItems.length,
    appsPerPage: APPS_PER_PAGE,
    setCurrentPage,
    searchQuery,
    isAnySettingsOpen,
    closeAllSettings,
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

  // Merge apps and folders into items array, using tagAssignments as single source of truth
  useEffect(() => {
    if (apps.length > 0) {
      // Initialize tagAssignments for new apps with their auto-tags from Rust
      const newAssignments: Record<string, string[]> = {};
      let hasNewAssignments = false;

      apps.forEach((app) => {
        // Check if key EXISTS (not just truthy) - empty array means user removed all tags
        if (!(app.bundle_id in tagAssignments)) {
          // New app - initialize with auto-tags from Rust
          newAssignments[app.bundle_id] = app.tags || [];
          hasNewAssignments = true;
        }
      });

      // Persist new app tags to localStorage
      if (hasNewAssignments) {
        const updatedAssignments = { ...tagAssignments, ...newAssignments };
        setTagAssignments(updatedAssignments);
        localStorage.setItem("launchpad-tag-assignments", JSON.stringify(updatedAssignments));
      }

      // Apply tags from tagAssignments (single source of truth)
      const effectiveAssignments = hasNewAssignments
        ? { ...tagAssignments, ...newAssignments }
        : tagAssignments;

      const appsWithTags = apps.map((app) => ({
        ...app,
        tags: effectiveAssignments[app.bundle_id] ?? [],
      }));

      // Auto-create System and Utilities folders if they don't exist
      const updatedFolders = createSystemFolders(appsWithTags, folders);

      // Save updated folders if we added any
      if (updatedFolders.length > folders.length) {
        saveFolders(updatedFolders);
      }

      const newItems = mergeAppsAndFolders(appsWithTags, updatedFolders);
      setItems(newItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, folders, tagAssignments]);

  // Fetch and apply system accent color
  useEffect(() => {
    async function fetchAccentColor() {
      const { invoke } = await import("@tauri-apps/api/core");
      try {
        const color = await invoke<string>("get_system_accent_color");
        document.documentElement.style.setProperty("--accent-color", color);
      } catch (err) {
        console.error("Failed to get system accent color:", err);
        document.documentElement.style.setProperty("--accent-color", "#007aff");
      }
    }
    fetchAccentColor();
  }, []);

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  // Calculate available tags and their counts
  useEffect(() => {
    const tagMap = new Map<string, number>();

    // Count tags from apps (not folders)
    items.forEach((item) => {
      if (!isFolder(item)) {
        const app = item as App;
        app.tags?.forEach((tagKey) => {
          tagMap.set(tagKey, (tagMap.get(tagKey) || 0) + 1);
        });
      }
    });

    // Build tags array from predefined tags + custom tags
    const allTagDefinitions = [
      ...PREDEFINED_TAGS.map((pt) => ({
        ...pt,
        label: "", // Will use labelKey for translation
        isCustom: false,
        isDeletable: false,
      })),
      ...customTags.map((ct) => ({
        key: ct.key,
        label: ct.label,
        labelKey: undefined,
        icon: getIconByName(ct.iconName) || PREDEFINED_TAGS[0].icon,
        iconName: ct.iconName,
        isCustom: true,
        isDeletable: true,
      })),
    ];

    // Custom tags should always be shown (even with count 0) so users can tag apps
    // Predefined tags only show if apps have them
    const tags: Tag[] = allTagDefinitions
      .filter((tag) => tag.isCustom || tagMap.has(tag.key))
      .map((tag) => ({
        ...tag,
        count: tagMap.get(tag.key) || 0,
      }))
      .sort((a, b) => b.count - a.count);

    setAvailableTags(tags);
  }, [items, customTags]);

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

  // Listen for hot corner and global shortcut trigger events
  useEffect(() => {
    let unlistenHotCorner: (() => void) | undefined;
    let unlistenShortcut: (() => void) | undefined;
    let unlistenAboutDialog: (() => void) | undefined;

    async function setupListeners() {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { listen } = await import("@tauri-apps/api/event");
      const { invoke } = await import("@tauri-apps/api/core");
      const appWindow = getCurrentWindow();

      // Hot corner trigger
      unlistenHotCorner = await listen("hot-corner-triggered", async () => {
        try {
          await invoke("position_on_cursor_monitor");
        } catch (err) {
          console.error("Failed to show window from hot corner:", err);
          await appWindow.show();
        }
      });

      // Global shortcut trigger
      unlistenShortcut = await listen("global-shortcut-triggered", async () => {
        try {
          await invoke("position_on_cursor_monitor");
        } catch (err) {
          console.error("Failed to show window from shortcut:", err);
          await appWindow.show();
        }
      });

      // About dialog trigger from menu
      unlistenAboutDialog = await listen("show-about-dialog", () => {
        setShowAboutDialog(true);
      });

      // Register user's saved shortcut on startup
      try {
        await invoke("register_global_shortcut", {
          shortcut: gridSettings.globalShortcut,
        });
      } catch (err) {
        console.error("Failed to register saved shortcut on startup:", err);
      }
    }

    setupListeners();

    return () => {
      if (unlistenHotCorner) unlistenHotCorner();
      if (unlistenShortcut) unlistenShortcut();
      if (unlistenAboutDialog) unlistenAboutDialog();
    };
  }, [gridSettings.globalShortcut]);

  // Apply hot corner settings on startup (runs once on mount)
  // Uses a ref to capture initial settings to avoid dependency warnings
  const hotCornerInitializedRef = useRef(false);
  useEffect(() => {
    if (hotCornerInitializedRef.current) return;
    hotCornerInitializedRef.current = true;

    async function applyHotCornerOnStartup() {
      const { invoke } = await import("@tauri-apps/api/core");
      // Read from localStorage directly to get the initial saved settings
      const saved = localStorage.getItem("launchpad-grid-settings");
      if (!saved) return;

      try {
        const settings = JSON.parse(saved);
        if (settings.hotCornerEnabled) {
          await invoke("enable_hot_corner", {
            corner: settings.hotCorner || "top-left",
            threshold: settings.hotCornerThreshold || 10,
            debounceMs: settings.hotCornerDebounce || 300,
          });
        }
      } catch (err) {
        console.error("Failed to apply hot corner settings on startup:", err);
      }
    }

    applyHotCornerOnStartup();
  }, []);

  // Context menu handler
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    // Don't show context menu if any modal is open
    if (isAnyModalOpen) return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  // Toggle edit mode
  function toggleEditMode() {
    setEditMode(!editMode);
    setContextMenu(null);
  }

  // Save grid settings
  async function saveGridSettings() {
    localStorage.setItem("launchpad-grid-settings", JSON.stringify(gridSettings));

    const { invoke } = await import("@tauri-apps/api/core");

    // Apply hot corner settings
    try {
      if (gridSettings.hotCornerEnabled) {
        await invoke("enable_hot_corner", {
          corner: gridSettings.hotCorner,
          threshold: gridSettings.hotCornerThreshold,
          debounceMs: gridSettings.hotCornerDebounce,
        });
      } else {
        await invoke("disable_hot_corner");
      }
    } catch (err) {
      console.error("Failed to update hot corner settings:", err);
    }

    // Register global shortcut
    try {
      await invoke("register_global_shortcut", {
        shortcut: gridSettings.globalShortcut,
      });
    } catch (err) {
      console.error("Failed to register global shortcut:", err);
    }

    closeAllSettings();
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

  // Tag manipulation handlers
  function handleToggleTag(bundleId: string, tagKey: string) {
    // Update items state
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (!isFolder(item)) {
          const app = item as App;
          if (app.bundle_id === bundleId) {
            const tags = app.tags || [];
            const hasTag = tags.includes(tagKey);
            return {
              ...app,
              tags: hasTag
                ? tags.filter((t) => t !== tagKey)
                : [...tags, tagKey],
            };
          }
        }
        return item;
      }),
    );

    // Persist tag assignment to localStorage (single source of truth)
    setTagAssignments((prev) => {
      const currentTags = prev[bundleId] || [];
      const hasTag = currentTags.includes(tagKey);
      const newTags = hasTag
        ? currentTags.filter((t) => t !== tagKey)
        : [...currentTags, tagKey];

      // Always store the result, even if empty - empty array means "user removed all tags"
      const updated = { ...prev, [bundleId]: newTags };

      localStorage.setItem("launchpad-tag-assignments", JSON.stringify(updated));
      return updated;
    });
  }

  function handleCreateTag() {
    setShowCreateTagModal(true);
  }

  function handleTagCreated(tagData: { key: string; label: string; iconName: string }) {
    // Check if tag with same key already exists - update it instead of duplicating
    const existingIndex = customTags.findIndex(t => t.key === tagData.key);
    let updatedCustomTags: typeof customTags;

    if (existingIndex >= 0) {
      // Update existing tag (e.g., if user re-creates with different icon)
      updatedCustomTags = [...customTags];
      updatedCustomTags[existingIndex] = tagData;
    } else {
      // Add new tag
      updatedCustomTags = [...customTags, tagData];
    }

    setCustomTags(updatedCustomTags);
    localStorage.setItem("launchpad-custom-tags", JSON.stringify(updatedCustomTags));
  }

  function handleDeleteTag(tagKey: string) {
    // Remove tag from custom tags
    const updatedCustomTags = customTags.filter((t) => t.key !== tagKey);
    setCustomTags(updatedCustomTags);
    localStorage.setItem(
      "launchpad-custom-tags",
      JSON.stringify(updatedCustomTags),
    );

    // Remove tag from all apps
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (!isFolder(item)) {
          const app = item as App;
          if (app.tags?.includes(tagKey)) {
            return {
              ...app,
              tags: app.tags.filter((t) => t !== tagKey),
            };
          }
        }
        return item;
      }),
    );

    // Clear selected tag if it was the deleted one
    if (selectedTag === tagKey) {
      setSelectedTag(null);
    }
  }

  // Handle app right-click
  function handleAppContextMenu(e: React.MouseEvent, app: any) {
    e.preventDefault();
    e.stopPropagation();
    // Don't show context menu if any modal is open
    if (isAnyModalOpen) return;
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

  // Handle tag selection with page reset
  function handleTagSelect(tagKey: string | null) {
    setSelectedTag(tagKey);
    setCurrentPage(0); // Reset to first page when changing tag filter
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

      {/* Tag Bar */}
      {gridSettings.tagSettings.showTagBar && availableTags.length > 0 && (
        <TagBar
          tags={availableTags}
          selectedTag={selectedTag}
          onTagSelect={handleTagSelect}
          totalAppsCount={items.filter((item) => !isFolder(item)).length}
        />
      )}

      {loading && (
        <div className="loading">
          <p>{t("common.loading")}</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>{error}</p>
          <Button onClick={loadApps}>{t("common.retry")}</Button>
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
                      e.preventDefault(); // Prevent native browser drag
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
                // Check if this is a folder join scenario (app being dragged over another app's icon)
                // Use iconHoverIndex for precise icon detection instead of container hover
                const actualItemIndex = items.findIndex(i =>
                  !isFolder(i) && (i as App).bundle_id === item.bundle_id
                );
                const isFolderJoinTarget = iconHoverIndex === actualItemIndex &&
                  draggedItem !== null &&
                  !isFolder(draggedItem) &&
                  !isFolder(item);

                return (
                  <AppItem
                    key={item.bundle_id}
                    app={item}
                    isDragging={isDraggingThis}
                    isDragOver={isDragOverThis}
                    isFolderJoinTarget={isFolderJoinTarget}
                    editMode={editMode}
                    onLaunch={launchApp}
                    onContextMenu={(e) => handleAppContextMenu(e, item)}
                    onMouseDown={(e) => {
                      if (e.button !== 0 || editMode) return;
                      e.preventDefault(); // Prevent native browser drag
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
          <p>{t("search.noResults", { query: searchQuery })}</p>
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
            const currentItemCount = items.length;
            createFolder();
            setContextMenu(null);

            // Wait for items to update, then navigate to last page
            setTimeout(() => {
              // New folder will be at the end after merge
              const newItemCount = currentItemCount + 1;
              const totalPages = Math.ceil(newItemCount / APPS_PER_PAGE);
              const lastPage = Math.max(0, totalPages - 1);

              console.log('Create folder navigation:', {
                currentItemCount,
                newItemCount,
                APPS_PER_PAGE,
                totalPages,
                lastPage,
                currentPage,
                willNavigate: lastPage !== currentPage
              });

              if (lastPage !== currentPage) {
                setCurrentPage(lastPage);
              }
            }, 150);
          }}
          onSortAlphabetically={() => {
            sortAlphabetically();
            setContextMenu(null);
          }}
          onEditApps={toggleEditMode}
          onResetTags={() => {
            if (confirm("Reset all tags? This will clear all tag assignments and let you test auto-tagging.")) {
              // Clear custom tags
              setCustomTags([]);
              localStorage.removeItem("launchpad-custom-tags");
              // Clear tag assignments
              setTagAssignments({});
              localStorage.removeItem("launchpad-tag-assignments");

              // Clear folders to remove old cached tags
              localStorage.removeItem("launchpad-folders");
              setFolders([]);

              // Reload apps to get fresh auto-tags from Rust
              loadApps();
            }
            setContextMenu(null);
          }}
          onLanguageSettings={() => {
            setShowLanguageSettings(true);
            setContextMenu(null);
          }}
          onGridLayoutSettings={() => {
            setShowGridLayoutSettings(true);
            setContextMenu(null);
          }}
          onHotCornersSettings={() => {
            setShowHotCornersSettings(true);
            setContextMenu(null);
          }}
          onKeyboardShortcutsSettings={() => {
            setShowKeyboardShortcutsSettings(true);
            setContextMenu(null);
          }}
          onCustomTagsSettings={() => {
            setShowCustomTagsSettings(true);
            setContextMenu(null);
          }}
          onAbout={() => {
            setShowAboutDialog(true);
            setContextMenu(null);
          }}
          editMode={editMode}
        />
      )}

      {/* Settings Modals */}
      {showLanguageSettings && (
        <LanguageSettings onClose={() => setShowLanguageSettings(false)} />
      )}

      {showGridLayoutSettings && (
        <GridLayoutSettings
          settings={gridSettings}
          onSettingsChange={setGridSettings}
          onSave={saveGridSettings}
          onClose={() => setShowGridLayoutSettings(false)}
        />
      )}

      {showHotCornersSettings && (
        <HotCornersSettings
          settings={gridSettings}
          onSettingsChange={setGridSettings}
          onSave={saveGridSettings}
          onClose={() => setShowHotCornersSettings(false)}
        />
      )}

      {showKeyboardShortcutsSettings && (
        <KeyboardShortcutsSettings
          settings={gridSettings}
          onSettingsChange={setGridSettings}
          onSave={saveGridSettings}
          onClose={() => setShowKeyboardShortcutsSettings(false)}
        />
      )}

      {showCustomTagsSettings && (
        <CustomTagsSettings
          customTags={customTags}
          onDeleteTag={handleDeleteTag}
          onCreateTag={handleCreateTag}
          onClose={() => setShowCustomTagsSettings(false)}
        />
      )}

      {/* About Dialog */}
      {showAboutDialog && (
        <AboutDialog onClose={() => setShowAboutDialog(false)} />
      )}

      {/* Create Tag Modal */}
      {showCreateTagModal && (
        <CreateTagModal
          onClose={() => setShowCreateTagModal(false)}
          onCreateTag={handleTagCreated}
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
      {appContextMenu && (() => {
        const app = items.find(item => !isFolder(item) && (item as App).bundle_id === appContextMenu.bundleId) as App | undefined;
        const appTags = app?.tags || [];

        return (
          <AppContextMenu
            position={{ x: appContextMenu.x, y: appContextMenu.y }}
            appName={appContextMenu.appName}
            appTags={appTags}
            availableTags={availableTags}
            onOpen={() => launchApp(appContextMenu.appPath)}
            onRevealInFinder={() => revealInFinder(appContextMenu.appPath)}
            onMoveToTrash={() => confirmMoveToTrash(appContextMenu.appName, appContextMenu.appPath)}
            onToggleTag={(tagKey) => handleToggleTag(appContextMenu.bundleId, tagKey)}
            onCreateTag={handleCreateTag}
            onClose={() => setAppContextMenu(null)}
          />
        );
      })()}

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
