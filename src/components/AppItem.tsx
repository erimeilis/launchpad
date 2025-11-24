import type { App } from "../types";

interface AppItemProps {
  app: App;
  isDragging: boolean;
  isDragOver: boolean;
  editMode: boolean;
  onLaunch: (appPath: string) => void;
  onRemove?: (bundleId: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseUp: () => void;
}

/**
 * Individual app item component with icon and name
 * Handles drag operations and app launching
 */
export function AppItem({
  app,
  isDragging,
  isDragOver,
  editMode,
  onLaunch,
  onRemove,
  onContextMenu,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}: AppItemProps) {
  return (
    <div
      className={`app-item ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""} ${editMode ? "jiggle" : ""}`}
      onClick={() => {
        if (!isDragging && !editMode) onLaunch(app.path);
      }}
      onContextMenu={onContextMenu}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      title={app.name}
      draggable="false"
    >
      {editMode && onRemove && (
        <button
          className="app-remove-button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(app.bundle_id);
          }}
          aria-label={`Remove ${app.name}`}
        >
          ×
        </button>
      )}
      <div className="app-icon">
        {app.icon ? (
          <img src={app.icon} alt={app.name} />
        ) : (
          <div className="app-icon-placeholder">{app.name.charAt(0).toUpperCase()}</div>
        )}
      </div>
      <div className="app-name">{app.name}</div>
    </div>
  );
}
