import { useTranslation } from "react-i18next";
import type { GridSettings } from "../../types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface KeyboardShortcutsSettingsProps {
  settings: GridSettings;
  onSettingsChange: (settings: GridSettings) => void;
  onSave: () => void;
  onClose: () => void;
}

export function KeyboardShortcutsSettings({ settings, onSettingsChange, onSave, onClose }: KeyboardShortcutsSettingsProps) {
  const { t } = useTranslation();

  return (
    <Modal onClose={onClose} title={t("settings.keyboardShortcuts.title")}>
      <div className="mb-5">
          <label className="flex justify-between items-center mb-2.5 text-[13px] text-[var(--text-secondary)] font-medium">
            <span>{t("settings.keyboardShortcuts.openLaunchpad")}</span>
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-[var(--input-border)] rounded-md bg-[var(--input-bg)] text-[var(--text-primary)] text-sm font-mono hover:border-[var(--input-border-hover)] focus:outline-none focus:border-[var(--accent-blue)] focus:bg-[var(--input-bg-focus)]"
            value={settings.globalShortcut}
            onChange={(e) => onSettingsChange({ ...settings, globalShortcut: e.target.value.toUpperCase() })}
            placeholder="F4"
          />
          <div className="mt-2 p-3.5 bg-[var(--bg-tertiary)] rounded-[10px] border border-[var(--border-primary)]">
            <p className="m-0 text-[13px] text-[var(--text-secondary)] leading-relaxed">{t("settings.keyboardShortcuts.examplesLabel")}</p>
            <p className="m-0 text-[13px] text-[var(--text-secondary)] leading-relaxed">{t("settings.keyboardShortcuts.modifiersLabel")}</p>
          </div>
        </div>

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
