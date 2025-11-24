import type { ContextMenuPosition } from "../types";

interface AppContextMenuProps {
  position: ContextMenuPosition;
  appName: string;
  onOpen: () => void;
  onRevealInFinder: () => void;
  onMoveToTrash: () => void;
  onHideFromLaunchpad: () => void;
  onClose: () => void;
}

/**
 * Context menu for individual app items
 * Shows options: Open, Show in Finder, Move to Trash, Hide from Launchpad
 */
export function AppContextMenu({
  position,
  appName: _appName,
  onOpen,
  onRevealInFinder,
  onMoveToTrash,
  onHideFromLaunchpad,
  onClose,
}: AppContextMenuProps) {
  return (
    <div
      className="app-context-menu"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onOpen();
          onClose();
        }}
      >
        Open
      </button>
      <button
        onClick={() => {
          onRevealInFinder();
          onClose();
        }}
      >
        Show in Finder
      </button>
      <div className="context-menu-separator" />
      <button
        onClick={() => {
          onHideFromLaunchpad();
          onClose();
        }}
      >
        Hide from Launchpad
      </button>
      <div className="context-menu-separator" />
      <button
        className="context-menu-danger"
        onClick={() => {
          onMoveToTrash();
          onClose();
        }}
      >
        Move to Trash
      </button>
    </div>
  );
}
