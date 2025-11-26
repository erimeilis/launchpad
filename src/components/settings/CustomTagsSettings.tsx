import { useTranslation } from "react-i18next";
import type { CustomTagDefinition } from "../../types";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { getIconByName } from "../../constants/tags";

interface CustomTagsSettingsProps {
  customTags: CustomTagDefinition[];
  onDeleteTag: (tagKey: string) => void;
  onCreateTag: () => void;
  onClose: () => void;
}

export function CustomTagsSettings({ customTags, onDeleteTag, onCreateTag, onClose }: CustomTagsSettingsProps) {
  const { t } = useTranslation();

  return (
    <Modal onClose={onClose} title={t("settings.tags.title", "Custom Tags")}>
      <div className="mb-5">
          {customTags.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-[13px] m-0">
              {t("settings.tags.noCustomTags", "No custom tags created yet")}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {customTags.map((tag) => {
                const TagIcon = getIconByName(tag.iconName);
                return (
                  <div key={tag.key} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-tertiary)] rounded-md border border-[var(--border-secondary)]">
                    <div className="flex items-center gap-2">
                      {TagIcon && <TagIcon size={18} weight="regular" className="text-[var(--text-secondary)]" />}
                      <span className="text-sm text-[var(--text-primary)]">{tag.label}</span>
                    </div>
                    <Button
                      variant="unstyled"
                      className="p-1 px-2 bg-transparent cursor-pointer rounded text-[var(--text-tertiary)] transition-all hover:bg-[var(--danger-bg)] hover:text-[var(--danger-red)]"
                      onClick={() => onDeleteTag(tag.key)}
                      aria-label={t("appContextMenu.deleteTag")}
                    >
                      <TrashIcon size={16} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            variant="ghost"
            onClick={onCreateTag}
            prefixIcon={PlusIcon}
            className="mt-2 w-full justify-center"
          >
            {t("settings.tags.createNew", "Create New Tag")}
          </Button>
        </div>

      <div className="flex justify-center gap-2.5 mt-6">
        <Button onClick={onClose} variant="accent" className="px-5 py-2.5 text-[13px] font-medium">
          {t("common.done", "Done")}
        </Button>
      </div>
    </Modal>
  );
}
