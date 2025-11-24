import type { ContextMenuPosition } from "../types";

interface ContextMenuProps {
  position: ContextMenuPosition;
  onCreateFolder: () => void;
  onGridSettings: () => void;
  onSortAlphabetically: () => void;
  onEditApps: () => void;
  editMode: boolean;
}

/**
 * Right-click context menu for creating folders and accessing settings
 */
export function ContextMenu({
  position,
  onCreateFolder,
  onGridSettings,
  onSortAlphabetically,
  onEditApps,
  editMode,
}: ContextMenuProps) {
  return (
    <div
      className="context-menu"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onCreateFolder}>Create Folder</button>
      <button onClick={onSortAlphabetically}>Sort Alphabetically</button>
      <button onClick={onEditApps}>{editMode ? "Done Editing" : "Edit Apps"}</button>
      <button onClick={onGridSettings}>Grid Settings</button>
    </div>
  );
}
