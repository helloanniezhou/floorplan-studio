import { useEffect } from 'react';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog confirm-dialog"
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dialog-header">
          <h2 id="confirm-dialog-title">{title}</h2>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="dialog-body">
          <p id="confirm-dialog-message">{message}</p>
          <div className="dialog-actions">
            <button type="button" className="action-bar-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="action-bar-btn danger"
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
