import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface TrashConfirmationProps {
  appName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for moving apps to Trash
 * Prevents accidental deletion of applications
 */
export function TrashConfirmation({ appName, onConfirm, onCancel }: TrashConfirmationProps) {
  const { t } = useTranslation();

  return (
    <Modal onClose={onCancel} title={t("trash.confirmTitle", { appName })}>
      <p className="m-0 mb-6 text-[14px] text-[var(--text-secondary)] leading-relaxed">
        {t("trash.confirmMessage")}
      </p>
      <div className="flex justify-center gap-2.5">
        <Button onClick={onCancel} variant="ghost" className="px-5 py-2.5 text-[13px] font-medium border border-[var(--border-secondary)]">
          {t("common.cancel")}
        </Button>
        <Button onClick={onConfirm} variant="danger" className="px-5 py-2.5 text-[13px] font-medium bg-[var(--danger-red)] text-white hover:opacity-90">
          {t("trash.moveToTrash")}
        </Button>
      </div>
    </Modal>
  );
}
