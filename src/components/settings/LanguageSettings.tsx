import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../i18n";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface LanguageSettingsProps {
  onClose: () => void;
}

export function LanguageSettings({ onClose }: LanguageSettingsProps) {
  const { t, i18n } = useTranslation();

  return (
    <Modal onClose={onClose} title={t("settings.language.title")}>
      <div className="mb-5">
          <label className="flex justify-between items-center mb-2.5 text-[13px] text-[var(--text-secondary)] font-medium">
            <span>{t("settings.language.label")}</span>
          </label>
          <select
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] text-[13px] cursor-pointer outline-none transition-all hover:bg-[var(--input-bg-hover)] hover:border-[var(--input-border-hover)] focus:bg-[var(--input-bg-focus)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)]"
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

      <div className="flex justify-center gap-2.5 mt-6">
        <Button onClick={onClose} variant="accent" className="px-5 py-2.5 text-[13px] font-medium">
          {t("common.done", "Done")}
        </Button>
      </div>
    </Modal>
  );
}
