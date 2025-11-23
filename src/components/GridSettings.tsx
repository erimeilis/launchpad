import type { GridSettings as GridSettingsType } from "../types";

interface GridSettingsProps {
  settings: GridSettingsType;
  onSettingsChange: (settings: GridSettingsType) => void;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Modal for configuring grid dimensions and layout
 */
export function GridSettings({ settings, onSettingsChange, onSave, onClose }: GridSettingsProps) {
  return (
    <div className="folder-modal" onClick={onClose}>
      <div className="folder-content grid-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="folder-header">
          <h2 className="grid-settings-header">Grid Settings</h2>
          <button className="close-folder" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="grid-settings-content">
          <div className="grid-setting-item">
            <label className="grid-setting-label">Rows per page: {settings.rows}</label>
            <input
              type="range"
              className="grid-setting-slider"
              min="3"
              max="10"
              value={settings.rows}
              onChange={(e) => onSettingsChange({ ...settings, rows: parseInt(e.target.value) })}
            />
          </div>
          <div className="grid-setting-item">
            <label className="grid-setting-label">Columns per page: {settings.cols}</label>
            <input
              type="range"
              className="grid-setting-slider"
              min="5"
              max="25"
              value={settings.cols}
              onChange={(e) => onSettingsChange({ ...settings, cols: parseInt(e.target.value) })}
            />
          </div>
          <div className="grid-setting-item">
            <label
              className="grid-setting-label"
              style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={settings.fullWidth}
                onChange={(e) => onSettingsChange({ ...settings, fullWidth: e.target.checked })}
                style={{ marginRight: "12px", width: "20px", height: "20px", cursor: "pointer" }}
              />
              Use full screen width
            </label>
          </div>
          <div className="grid-setting-info">
            <p>Apps per page: {settings.rows * settings.cols}</p>
          </div>
          <button className="grid-save-button" onClick={onSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
