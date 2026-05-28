import { useEffect, useState } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { formatLength } from '../lib/geometry/vectors';
import type { LotSize } from '../types/floorPlan';

export function defaultLotForUnit(unit: 'ft' | 'm'): LotSize {
  return unit === 'ft' ? { width: 50, depth: 100 } : { width: 15, depth: 30 };
}

export function LotSizeEditor() {
  const unit = useFloorPlanStore((s) => s.unit);
  const lotSize = useFloorPlanStore((s) => s.lotSize);
  const setLotSize = useFloorPlanStore((s) => s.setLotSize);

  const [widthDraft, setWidthDraft] = useState('');
  const [depthDraft, setDepthDraft] = useState('');

  const syncDrafts = (lot: LotSize | null) => {
    setWidthDraft(lot ? String(lot.width) : '');
    setDepthDraft(lot ? String(lot.depth) : '');
  };

  useEffect(() => {
    syncDrafts(lotSize);
  }, [lotSize]);

  const enabled = lotSize !== null;

  const toggleEnabled = (on: boolean) => {
    if (on) {
      const next = lotSize ?? defaultLotForUnit(unit);
      setLotSize(next);
      syncDrafts(next);
    } else {
      setLotSize(null);
      setWidthDraft('');
      setDepthDraft('');
    }
  };

  const applyDimensions = () => {
    const width = parseFloat(widthDraft);
    const depth = parseFloat(depthDraft);
    if (!(width > 0 && depth > 0)) return;
    setLotSize({ width, depth });
  };

  const area =
    enabled && lotSize
      ? (lotSize.width * lotSize.depth).toLocaleString(undefined, { maximumFractionDigits: 1 })
      : null;

  return (
    <>
      <label className="field row lot-enable-row">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggleEnabled(e.target.checked)}
        />
        <span>Show lot boundary</span>
      </label>

      {enabled && (
        <>
          <div className="lot-dimension-fields">
            <label className="field">
              <span>Lot width ({unit})</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={widthDraft || (lotSize ? String(lotSize.width) : '')}
                onChange={(e) => setWidthDraft(e.target.value)}
                onBlur={applyDimensions}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyDimensions();
                }}
              />
            </label>
            <label className="field">
              <span>Lot depth ({unit})</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={depthDraft || (lotSize ? String(lotSize.depth) : '')}
                onChange={(e) => setDepthDraft(e.target.value)}
                onBlur={applyDimensions}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyDimensions();
                }}
              />
            </label>
          </div>

          {lotSize && (
            <p className="readout lot-readout">
              {formatLength(lotSize.width, unit)} × {formatLength(lotSize.depth, unit)}
              {area && (
                <>
                  {' '}
                  · {area} {unit}
                  <sup>2</sup>
                </>
              )}
            </p>
          )}
        </>
      )}
    </>
  );
}
