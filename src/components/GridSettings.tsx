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
    <div className="grid-settings-modal" onClick={onClose}>
      <div className="grid-settings-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="grid-settings-header">Grid Settings</h2>

        <div className="grid-setting-item">
          <label className="grid-setting-label">
            <span>Rows per page</span>
            <span className="grid-setting-value">{settings.rows}</span>
          </label>
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
          <label className="grid-setting-label">
            <span>Columns per page</span>
            <span className="grid-setting-value">{settings.cols}</span>
          </label>
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
              style={{ marginRight: "10px", width: "16px", height: "16px", cursor: "pointer" }}
            />
            <span>Use full screen width</span>
          </label>
        </div>

        <div className="grid-setting-info">
          <p>Apps per page: {settings.rows * settings.cols}</p>
        </div>

        <div className="grid-settings-buttons">
          <button className="grid-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="grid-save-button" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
