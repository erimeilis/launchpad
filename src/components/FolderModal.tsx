import type { Folder, App } from "../types";

interface FolderModalProps {
  folder: Folder;
  isDragging: boolean;
  onClose: () => void;
  onLaunchApp: (appPath: string) => void;
  onUpdateName: (name: string) => void;
  onDelete: () => void;
  onMouseDown: (e: React.MouseEvent, app: App) => void;
}

/**
 * Modal that displays folder contents with editable name and delete option
 */
export function FolderModal({
  folder,
  isDragging,
  onClose,
  onLaunchApp,
  onUpdateName,
  onDelete,
  onMouseDown,
}: FolderModalProps) {
  return (
    <div className="folder-modal" onClick={onClose}>
      <div className="folder-content" onClick={(e) => e.stopPropagation()}>
        <div className="folder-header">
          <input
            type="text"
            className="folder-name-input"
            value={folder.name}
            onChange={(e) => onUpdateName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="delete-folder"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete folder"
          >
            🗑️
          </button>
          <button className="close-folder" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="folder-apps-grid">
          {folder.apps.map((app) => (
            <div
              key={app.bundle_id}
              className="app-item"
              onClick={() => {
                if (!isDragging) {
                  onLaunchApp(app.path);
                  onClose();
                }
              }}
              onMouseDown={(e) => onMouseDown(e, app)}
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
          ))}
        </div>
      </div>
    </div>
  );
}
