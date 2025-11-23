import type { ContextMenuPosition } from "../types";

interface ContextMenuProps {
  position: ContextMenuPosition;
  onCreateFolder: () => void;
  onGridSettings: () => void;
}

/**
 * Right-click context menu for creating folders and accessing settings
 */
export function ContextMenu({ position, onCreateFolder, onGridSettings }: ContextMenuProps) {
  return (
    <div
      className="context-menu"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onCreateFolder}>Create Folder</button>
      <button onClick={onGridSettings}>Grid Settings</button>
    </div>
  );
}
