import type { App } from "../types";

interface AppItemProps {
  app: App;
  isDragging: boolean;
  isDragOver: boolean;
  onLaunch: (appPath: string) => void;
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
  onLaunch,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}: AppItemProps) {
  return (
    <div
      className={`app-item ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
      onClick={() => {
        if (!isDragging) onLaunch(app.path);
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      title={app.name}
      draggable="false"
    >
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
