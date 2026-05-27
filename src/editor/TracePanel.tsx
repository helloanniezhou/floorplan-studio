import { useState } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { traceFloorPlan } from '../lib/opencv/traceFloorPlan';

export function TracePanel() {
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const traceParams = useFloorPlanStore((s) => s.traceParams);
  const suggestions = useFloorPlanStore((s) => s.suggestions);
  const traceLoading = useFloorPlanStore((s) => s.traceLoading);
  const setTraceParams = useFloorPlanStore((s) => s.setTraceParams);
  const setSuggestions = useFloorPlanStore((s) => s.setSuggestions);
  const setTraceLoading = useFloorPlanStore((s) => s.setTraceLoading);
  const acceptAllSuggestions = useFloorPlanStore((s) => s.acceptAllSuggestions);
  const clearSuggestions = useFloorPlanStore((s) => s.clearSuggestions);
  const [error, setError] = useState<string | null>(null);

  const runTrace = async () => {
    if (!backgroundImage) return;
    setError(null);
    setTraceLoading(true);
    try {
      const result = await traceFloorPlan(backgroundImage, traceParams);
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trace failed');
    } finally {
      setTraceLoading(false);
    }
  };

  if (!backgroundImage) return null;

  return (
    <div className="trace-panel">
      <h3>Auto-detect walls</h3>
      <p className="hint">OpenCV edge detection + Hough lines. Review suggestions before accepting.</p>

      <label className="field">
        <span>Canny low ({traceParams.cannyLow})</span>
        <input
          type="range"
          min={10}
          max={200}
          value={traceParams.cannyLow}
          onChange={(e) => setTraceParams({ cannyLow: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Canny high ({traceParams.cannyHigh})</span>
        <input
          type="range"
          min={50}
          max={300}
          value={traceParams.cannyHigh}
          onChange={(e) => setTraceParams({ cannyHigh: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Hough threshold ({traceParams.houghThreshold})</span>
        <input
          type="range"
          min={20}
          max={200}
          value={traceParams.houghThreshold}
          onChange={(e) => setTraceParams({ houghThreshold: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Min line length ({traceParams.minLineLength})</span>
        <input
          type="range"
          min={10}
          max={150}
          value={traceParams.minLineLength}
          onChange={(e) => setTraceParams({ minLineLength: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span>Max line gap ({traceParams.maxLineGap})</span>
        <input
          type="range"
          min={1}
          max={50}
          value={traceParams.maxLineGap}
          onChange={(e) => setTraceParams({ maxLineGap: Number(e.target.value) })}
        />
      </label>
      <label className="field row">
        <input
          type="checkbox"
          checked={traceParams.orthogonalize}
          onChange={(e) => setTraceParams({ orthogonalize: e.target.checked })}
        />
        <span>Orthogonalize (snap to 90°)</span>
      </label>

      <button
        type="button"
        className="toolbar-btn primary"
        onClick={runTrace}
        disabled={traceLoading}
      >
        {traceLoading ? 'Loading OpenCV…' : 'Run auto-detect'}
      </button>

      {error && <p className="error">{error}</p>}

      {suggestions.length > 0 && (
        <div className="trace-actions">
          <p>{suggestions.length} suggestions — click lines on canvas to accept</p>
          <button type="button" className="toolbar-btn" onClick={acceptAllSuggestions}>
            Accept all
          </button>
          <button type="button" className="toolbar-btn" onClick={clearSuggestions}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
