import { useTranslation } from "react-i18next";
import type { GridSettings } from "../../types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface HotCornersSettingsProps {
  settings: GridSettings;
  onSettingsChange: (settings: GridSettings) => void;
  onSave: () => void;
  onClose: () => void;
}

export function HotCornersSettings({ settings, onSettingsChange, onSave, onClose }: HotCornersSettingsProps) {
  const { t } = useTranslation();

  return (
    <Modal onClose={onClose} title={t("settings.hotCorners.title")}>
      <div className="mb-5">
          <label className="flex items-center cursor-pointer text-[13px] text-[var(--text-secondary)] font-medium">
            <input
              type="checkbox"
              checked={settings.hotCornerEnabled}
              onChange={(e) => onSettingsChange({ ...settings, hotCornerEnabled: e.target.checked })}
              className="mr-2.5 w-4 h-4 cursor-pointer"
            />
            <span>{t("settings.hotCorners.enable")}</span>
          </label>
        </div>

        {settings.hotCornerEnabled && (
          <>
            <div className="mb-5">
              <label className="flex justify-between items-center mb-2.5 text-[13px] text-[var(--text-secondary)] font-medium">
                <span>{t("settings.hotCorners.cornerPosition")}</span>
              </label>
              <select
                className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] text-[13px] cursor-pointer outline-none transition-all hover:bg-[var(--input-bg-hover)] hover:border-[var(--input-border-hover)] focus:bg-[var(--input-bg-focus)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)]"
                value={settings.hotCorner}
                onChange={(e) => onSettingsChange({ ...settings, hotCorner: e.target.value })}
              >
                <option value="top-left">{t("settings.hotCorners.topLeft")}</option>
                <option value="top-right">{t("settings.hotCorners.topRight")}</option>
                <option value="bottom-left">{t("settings.hotCorners.bottomLeft")}</option>
                <option value="bottom-right">{t("settings.hotCorners.bottomRight")}</option>
              </select>
            </div>

            <div className="mb-5">
              <label className="flex justify-between items-center mb-2.5 text-[13px] text-[var(--text-secondary)] font-medium">
                <span>{t("settings.hotCorners.triggerThreshold")}</span>
                <span className="text-[var(--text-tertiary)] font-normal tabular-nums">{settings.hotCornerThreshold}</span>
              </label>
              <input
                type="range"
                className="w-full h-1 rounded bg-[var(--input-bg)] outline-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.15)]"
                min="5"
                max="50"
                value={settings.hotCornerThreshold}
                onChange={(e) => onSettingsChange({ ...settings, hotCornerThreshold: parseInt(e.target.value) })}
              />
            </div>

            <div className="mb-5">
              <label className="flex justify-between items-center mb-2.5 text-[13px] text-[var(--text-secondary)] font-medium">
                <span>{t("settings.hotCorners.debounceDelay")}</span>
                <span className="text-[var(--text-tertiary)] font-normal tabular-nums">{settings.hotCornerDebounce}</span>
              </label>
              <input
                type="range"
                className="w-full h-1 rounded bg-[var(--input-bg)] outline-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.15)]"
                min="100"
                max="1000"
                step="100"
                value={settings.hotCornerDebounce}
                onChange={(e) => onSettingsChange({ ...settings, hotCornerDebounce: parseInt(e.target.value) })}
              />
            </div>
          </>
        )}

      <div className="flex justify-center gap-2.5 mt-6">
        <Button onClick={onClose} variant="ghost" className="px-5 py-2.5 text-[13px] font-medium border border-[var(--border-secondary)]">
          {t("common.cancel")}
        </Button>
        <Button onClick={onSave} variant="accent" className="px-5 py-2.5 text-[13px] font-medium">
          {t("common.save")}
        </Button>
      </div>
    </Modal>
  );
}
