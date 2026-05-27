import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function SaveAsDialog({ open, defaultName, onClose, onSave }: Props) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog save-as-dialog"
        role="dialog"
        aria-labelledby="save-as-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dialog-header">
          <h2 id="save-as-title">Save as</h2>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form className="dialog-body" onSubmit={submit}>
          <label className="field">
            <span>Plan name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Enter a name"
            />
          </label>
          <p className="hint">Creates a new saved copy. The original plan is unchanged.</p>
          <div className="dialog-actions">
            <button type="button" className="action-bar-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="action-bar-btn primary" disabled={!name.trim()}>
              Save copy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
