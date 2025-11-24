import { useTranslation } from "react-i18next";
import type { ContextMenuPosition } from "../types";

interface ContextMenuProps {
  position: ContextMenuPosition;
  onCreateFolder: () => void;
  onGridSettings: () => void;
  onSortAlphabetically: () => void;
  onEditApps: () => void;
  editMode: boolean;
}

/**
 * Right-click context menu for creating folders and accessing settings
 */
export function ContextMenu({
  position,
  onCreateFolder,
  onGridSettings,
  onSortAlphabetically,
  onEditApps,
  editMode,
}: ContextMenuProps) {
  const { t } = useTranslation();

  return (
    <div
      className="context-menu"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onCreateFolder}>{t("contextMenu.createFolder")}</button>
      <button onClick={onSortAlphabetically}>{t("contextMenu.sortAlphabetically")}</button>
      <button onClick={onEditApps}>
        {editMode ? t("contextMenu.doneEditing") : t("contextMenu.editApps")}
      </button>
      <button onClick={onGridSettings}>{t("contextMenu.settings")}</button>
    </div>
  );
}
