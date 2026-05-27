import { useState, type ReactNode } from 'react';

type Props = {
  id: string;
  title: string;
  defaultOpen?: boolean;
  highlight?: boolean;
  children: ReactNode;
};

function readStoredOpen(id: string, defaultOpen: boolean): boolean {
  try {
    const stored = localStorage.getItem(`toolbar-section-${id}`);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    /* ignore */
  }
  return defaultOpen;
}

export function CollapsibleToolbarSection({
  id,
  title,
  defaultOpen = true,
  highlight = false,
  children,
}: Props) {
  const [open, setOpen] = useState(() => readStoredOpen(id, defaultOpen));

  const toggle = () => {
    setOpen((value) => {
      const next = !value;
      try {
        localStorage.setItem(`toolbar-section-${id}`, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <section
      className={`toolbar-section ${highlight ? 'toolbar-section--highlight' : ''}`}
    >
      <button
        type="button"
        className="toolbar-section-toggle"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`toolbar-section-${id}`}
      >
        <span className="toolbar-label">{title}</span>
        <span className="toolbar-section-chevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div id={`toolbar-section-${id}`} className="toolbar-section-body">
          {children}
        </div>
      )}
    </section>
  );
}
