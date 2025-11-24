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
  return (
    <div className="confirmation-modal" onClick={onCancel}>
      <div className="confirmation-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirmation-title">Move "{appName}" to Trash?</h2>
        <p className="confirmation-message">
          This will move the application to Trash. You can recover it from Trash if needed.
        </p>
        <div className="confirmation-buttons">
          <button className="confirmation-cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirmation-danger-button" onClick={onConfirm}>
            Move to Trash
          </button>
        </div>
      </div>
    </div>
  );
}
