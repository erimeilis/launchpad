import type { DeleteConfirmationState } from "../types";

interface DeleteConfirmationProps {
  confirmation: DeleteConfirmationState;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for deleting folders
 */
export function DeleteConfirmation({ confirmation, onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div className="folder-modal" onClick={onCancel}>
      <div
        className="folder-content delete-confirmation-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="folder-header">
          <h2 className="grid-settings-header">Delete Folder</h2>
          <button className="close-folder" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="delete-confirmation-content">
          <p>Delete folder "{confirmation.folderName}"?</p>
          <p className="delete-confirmation-note">Apps will be moved back to the main grid.</p>
          <div className="delete-confirmation-buttons">
            <button className="delete-confirmation-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button className="delete-confirmation-confirm" onClick={onConfirm}>
              Delete Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
