import { useTranslation } from "react-i18next";
import type { DeleteConfirmationState } from "../types";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface DeleteConfirmationProps {
  confirmation: DeleteConfirmationState;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for deleting folders
 */
export function DeleteConfirmation({ confirmation, onConfirm, onCancel }: DeleteConfirmationProps) {
  const { t } = useTranslation();

  return (
    <Modal onClose={onCancel} title={t("folder.deleteTitle", { folderName: confirmation.folderName })}>
      <p className="m-0 mb-6 text-[14px] text-[var(--text-secondary)] leading-relaxed">
        {t("folder.deleteMessage")}
      </p>
      <div className="flex justify-center gap-2.5">
        <Button onClick={onCancel} variant="ghost" className="px-5 py-2.5 text-[13px] font-medium border border-[var(--border-secondary)]">
          {t("common.cancel")}
        </Button>
        <Button onClick={onConfirm} variant="danger" className="px-5 py-2.5 text-[13px] font-medium bg-[var(--danger-red)] text-white hover:opacity-90">
          {t("folder.deleteFolder")}
        </Button>
      </div>
    </Modal>
  );
}
