import type { Folder } from "../types";

interface FolderItemProps {
  folder: Folder;
  isDragging: boolean;
  isDragOver: boolean;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseUp: () => void;
}

/**
 * Folder item component with preview of contained apps
 */
export function FolderItem({
  folder,
  isDragging,
  isDragOver,
  onClick,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}: FolderItemProps) {
  const previewApps = folder.apps.slice(0, 4);

  return (
    <div
      className={`app-item folder-item ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      title={folder.name}
      draggable="false"
    >
      <div className="folder-icon">
        <div className="folder-mini-grid">
          {previewApps.map((app) => (
            <div key={app.bundle_id} className="folder-mini-icon">
              {app.icon ? (
                <img src={app.icon} alt={app.name} />
              ) : (
                <div className="mini-placeholder">{app.name.charAt(0).toUpperCase()}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="app-name">{folder.name}</div>
    </div>
  );
}
