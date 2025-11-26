import { useTranslation } from "react-i18next";
import type { GridSettings } from "../../types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface GridLayoutSettingsProps {
  settings: GridSettings;
  onSettingsChange: (settings: GridSettings) => void;
  onSave: () => void;
  onClose: () => void;
}

export function GridLayoutSettings({ settings, onSettingsChange, onSave, onClose }: GridLayoutSettingsProps) {
  const { t } = useTranslation();

  return (
    <Modal onClose={onClose} title={t("settings.gridLayout.title")}>
      <div className="mb-5">
          <label className="flex justify-between items-center mb-2.5 text-[13px] text-[var(--text-secondary)] font-medium">
            <span>{t("settings.gridLayout.rowsPerPage")}</span>
            <span className="text-[var(--text-tertiary)] font-normal tabular-nums">{settings.rows}</span>
          </label>
          <input
            type="range"
            className="w-full h-1 rounded bg-[var(--input-bg)] outline-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.15)]"
            min="3"
            max="10"
            value={settings.rows}
            onChange={(e) => onSettingsChange({ ...settings, rows: parseInt(e.target.value) })}
          />
        </div>

        <div className="mb-5">
          <label className="flex justify-between items-center mb-2.5 text-[13px] text-[var(--text-secondary)] font-medium">
            <span>{t("settings.gridLayout.columnsPerPage")}</span>
            <span className="text-[var(--text-tertiary)] font-normal tabular-nums">{settings.cols}</span>
          </label>
          <input
            type="range"
            className="w-full h-1 rounded bg-[var(--input-bg)] outline-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.15)]"
            min="5"
            max="25"
            value={settings.cols}
            onChange={(e) => onSettingsChange({ ...settings, cols: parseInt(e.target.value) })}
          />
        </div>

        <div className="mb-5">
          <label className="flex items-center cursor-pointer text-[13px] text-[var(--text-secondary)] font-medium">
            <input
              type="checkbox"
              checked={settings.fullWidth}
              onChange={(e) => onSettingsChange({ ...settings, fullWidth: e.target.checked })}
              className="mr-2.5 w-4 h-4 cursor-pointer"
            />
            <span>{t("settings.gridLayout.useFullWidth")}</span>
          </label>
        </div>

        <div className="mb-6 p-3.5 bg-[var(--bg-tertiary)] rounded-[10px] border border-[var(--border-primary)]">
          <p className="m-0 text-[13px] text-[var(--text-secondary)] leading-relaxed">
            {t("common.appsPerPage", { count: settings.rows * settings.cols })}
          </p>
        </div>

      <div className="flex justify-center gap-2.5">
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
