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

        <div className="grid-settings-separator" />

        <h3 className="grid-settings-section-header">Hot Corners</h3>

        <div className="grid-setting-item">
          <label
            className="grid-setting-label"
            style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={settings.hotCornerEnabled}
              onChange={(e) => onSettingsChange({ ...settings, hotCornerEnabled: e.target.checked })}
              style={{ marginRight: "10px", width: "16px", height: "16px", cursor: "pointer" }}
            />
            <span>Enable hot corner</span>
          </label>
        </div>

        {settings.hotCornerEnabled && (
          <>
            <div className="grid-setting-item">
              <label className="grid-setting-label">
                <span>Corner position</span>
              </label>
              <select
                className="grid-setting-select"
                value={settings.hotCorner}
                onChange={(e) => onSettingsChange({ ...settings, hotCorner: e.target.value })}
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>

            <div className="grid-setting-item">
              <label className="grid-setting-label">
                <span>Trigger threshold (pixels)</span>
                <span className="grid-setting-value">{settings.hotCornerThreshold}</span>
              </label>
              <input
                type="range"
                className="grid-setting-slider"
                min="5"
                max="50"
                value={settings.hotCornerThreshold}
                onChange={(e) => onSettingsChange({ ...settings, hotCornerThreshold: parseInt(e.target.value) })}
              />
            </div>

            <div className="grid-setting-item">
              <label className="grid-setting-label">
                <span>Debounce delay (ms)</span>
                <span className="grid-setting-value">{settings.hotCornerDebounce}</span>
              </label>
              <input
                type="range"
                className="grid-setting-slider"
                min="100"
                max="1000"
                step="100"
                value={settings.hotCornerDebounce}
                onChange={(e) => onSettingsChange({ ...settings, hotCornerDebounce: parseInt(e.target.value) })}
              />
            </div>
          </>
        )}

        <div className="grid-settings-separator" />

        <h3 className="grid-settings-section-header">Global Shortcut</h3>

        <div className="grid-setting-item">
          <label className="grid-setting-label">
            <span>Keyboard shortcut to open Launchpad</span>
          </label>
          <input
            type="text"
            className="grid-setting-input"
            value={settings.globalShortcut}
            onChange={(e) => onSettingsChange({ ...settings, globalShortcut: e.target.value.toUpperCase() })}
            placeholder="F4"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              fontSize: "14px",
              fontFamily: "monospace",
            }}
          />
          <div className="grid-setting-info" style={{ marginTop: "8px", fontSize: "12px" }}>
            <p>Examples: F4, CommandOrControl+Space, Alt+L</p>
            <p>Modifiers: Cmd/CommandOrControl, Alt/Option, Shift, Ctrl</p>
          </div>
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
