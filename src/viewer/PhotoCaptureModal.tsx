import { useState } from 'react';
import { downloadDataUrl } from '../lib/export/enhanceRenderImage';
import { generateInteriorDesignRender } from '../lib/gemini/generateInteriorRender';

type Props = {
  open: boolean;
  projectName: string;
  rawUrl: string;
  enhancedUrl: string;
  onClose: () => void;
};

export function PhotoCaptureModal({
  open,
  projectName,
  rawUrl,
  enhancedUrl,
  onClose,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<'enhanced' | 'generated'>('enhanced');

  if (!open) return null;

  const base = projectName.replace(/[^\w\-]+/g, '-').slice(0, 60) || 'render';
  const previewUrl =
    preview === 'generated' && generatedUrl ? generatedUrl : enhancedUrl;
  const previewLabel =
    preview === 'generated' && generatedUrl
      ? 'AI interior design render (Nano Banana)'
      : 'Enhanced 3D screenshot';

  const handleGenerate = () => {
    setGenerateError(null);
    setGenerating(true);
    void generateInteriorDesignRender(rawUrl)
      .then((url) => {
        setGeneratedUrl(url);
        setPreview('generated');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Image generation failed.';
        setGenerateError(msg);
      })
      .finally(() => setGenerating(false));
  };

  return (
    <div className="photo-capture-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="photo-capture-modal"
        role="dialog"
        aria-labelledby="photo-capture-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="photo-capture-modal-header">
          <h2 id="photo-capture-title">Photo render</h2>
          <button type="button" className="link-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="hint">
          Download the enhanced screenshot, or use <strong>Generate image</strong> to send the 3D
          view to Google&apos;s Nano Banana model for a photorealistic interior rendering.
        </p>

        {generatedUrl && (
          <div className="photo-capture-tabs" role="tablist" aria-label="Preview">
            <button
              type="button"
              role="tab"
              aria-selected={preview === 'enhanced'}
              className={`photo-capture-tab ${preview === 'enhanced' ? 'active' : ''}`}
              onClick={() => setPreview('enhanced')}
            >
              Enhanced
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={preview === 'generated'}
              className={`photo-capture-tab ${preview === 'generated' ? 'active' : ''}`}
              onClick={() => setPreview('generated')}
            >
              AI render
            </button>
          </div>
        )}

        <div className="photo-capture-preview">
          <img src={previewUrl} alt={previewLabel} />
        </div>
        <p className="hint photo-capture-preview-caption">{previewLabel}</p>

        {generateError && <p className="hint project-status error">{generateError}</p>}

        <div className="photo-capture-actions">
          <button
            type="button"
            className="toolbar-btn primary"
            disabled={generating}
            onClick={handleGenerate}
          >
            {generating ? 'Generating…' : 'Generate image'}
          </button>
          {generatedUrl && preview === 'generated' && (
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => downloadDataUrl(generatedUrl, `${base}-interior-render.png`)}
            >
              Download AI render
            </button>
          )}
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => downloadDataUrl(enhancedUrl, `${base}-photo-render.jpg`)}
          >
            Download enhanced
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => downloadDataUrl(rawUrl, `${base}-screenshot.png`)}
          >
            Download screenshot
          </button>
        </div>
      </div>
    </div>
  );
}
