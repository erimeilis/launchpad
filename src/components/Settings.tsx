import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { changeLanguage } from "../i18n";
import type { GridSettings as GridSettingsType } from "../types";

interface SettingsProps {
  settings: GridSettingsType;
  onSettingsChange: (settings: GridSettingsType) => void;
  onSave: () => void;
  onClose: () => void;
}

/**
 * Modal for configuring Launchpad settings
 */
export function Settings({ settings, onSettingsChange, onSave, onClose }: SettingsProps) {
  const { t, i18n } = useTranslation();

  // Fetch and apply system accent color
  useEffect(() => {
    invoke<string>("get_system_accent_color")
      .then((color) => {
        document.documentElement.style.setProperty("--system-accent-color", color);
      })
      .catch((error) => {
        console.error("Failed to get system accent color:", error);
        // Fallback to blue
        document.documentElement.style.setProperty("--system-accent-color", "#007aff");
      });
  }, []);

  return (
    <div className="grid-settings-modal" onClick={onClose}>
      <div className="grid-settings-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="grid-settings-header">{t("settings.title")}</h2>

        {/* Language Section */}
        <h3 className="grid-settings-section-header">{t("settings.language.title")}</h3>

        <div className="grid-setting-item">
          <label className="grid-setting-label">
            <span>{t("settings.language.label")}</span>
          </label>
          <select
            className="grid-setting-select"
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
          >
            <option value="en">{t("settings.language.languages.en")}</option>
            <option value="es">{t("settings.language.languages.es")}</option>
            <option value="fr">{t("settings.language.languages.fr")}</option>
            <option value="de">{t("settings.language.languages.de")}</option>
            <option value="zh">{t("settings.language.languages.zh")}</option>
            <option value="ja">{t("settings.language.languages.ja")}</option>
            <option value="uk">{t("settings.language.languages.uk")}</option>
            <option value="pl">{t("settings.language.languages.pl")}</option>
          </select>
        </div>

        <div className="grid-settings-separator" />

        {/* Grid Layout Section */}
        <h3 className="grid-settings-section-header">{t("settings.gridLayout.title")}</h3>

        <div className="grid-setting-item">
          <label className="grid-setting-label">
            <span>{t("settings.gridLayout.rowsPerPage")}</span>
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
            <span>{t("settings.gridLayout.columnsPerPage")}</span>
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
            <span>{t("settings.gridLayout.useFullWidth")}</span>
          </label>
        </div>

        <div className="grid-setting-info">
          <p>{t("common.appsPerPage", { count: settings.rows * settings.cols })}</p>
        </div>

        <div className="grid-settings-separator" />

        {/* Hot Corners Section */}
        <h3 className="grid-settings-section-header">{t("settings.hotCorners.title")}</h3>

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
            <span>{t("settings.hotCorners.enable")}</span>
          </label>
        </div>

        {settings.hotCornerEnabled && (
          <>
            <div className="grid-setting-item">
              <label className="grid-setting-label">
                <span>{t("settings.hotCorners.cornerPosition")}</span>
              </label>
              <select
                className="grid-setting-select"
                value={settings.hotCorner}
                onChange={(e) => onSettingsChange({ ...settings, hotCorner: e.target.value })}
              >
                <option value="top-left">{t("settings.hotCorners.topLeft")}</option>
                <option value="top-right">{t("settings.hotCorners.topRight")}</option>
                <option value="bottom-left">{t("settings.hotCorners.bottomLeft")}</option>
                <option value="bottom-right">{t("settings.hotCorners.bottomRight")}</option>
              </select>
            </div>

            <div className="grid-setting-item">
              <label className="grid-setting-label">
                <span>{t("settings.hotCorners.triggerThreshold")}</span>
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
                <span>{t("settings.hotCorners.debounceDelay")}</span>
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

        {/* Keyboard Shortcuts Section */}
        <h3 className="grid-settings-section-header">{t("settings.keyboardShortcuts.title")}</h3>

        <div className="grid-setting-item">
          <label className="grid-setting-label">
            <span>{t("settings.keyboardShortcuts.openLaunchpad")}</span>
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
            <p>{t("settings.keyboardShortcuts.examplesLabel")}</p>
            <p>{t("settings.keyboardShortcuts.modifiersLabel")}</p>
          </div>
        </div>

        <div className="grid-settings-buttons">
          <button className="grid-cancel-button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="grid-save-button" onClick={onSave}>
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
