import { Rect, Text } from 'react-konva';
import type { LotSize } from '../types/floorPlan';
import { formatLength } from '../lib/geometry/vectors';
import type { FloorPlanUnit } from '../types/floorPlan';

type Props = {
  lotSize: LotSize;
  unit: FloorPlanUnit;
  pixelsPerUnit: number | null;
  stageScale: number;
};

export function PlanLotBoundary({ lotSize, unit, pixelsPerUnit, stageScale }: Props) {
  const w = pixelsPerUnit ? lotSize.width * pixelsPerUnit : lotSize.width;
  const d = pixelsPerUnit ? lotSize.depth * pixelsPerUnit : lotSize.depth;
  const label = `${formatLength(lotSize.width, unit)} × ${formatLength(lotSize.depth, unit)}`;
  const fontSize = 11 / stageScale;

  return (
    <>
      <Rect
        x={0}
        y={0}
        width={w}
        height={d}
        stroke="#15803d"
        strokeWidth={2 / stageScale}
        dash={[10 / stageScale, 6 / stageScale]}
        fill="rgba(21, 128, 61, 0.04)"
        listening={false}
      />
      <Text
        x={6 / stageScale}
        y={6 / stageScale}
        text={`Lot · ${label}`}
        fontSize={fontSize}
        fill="#15803d"
        listening={false}
      />
    </>
  );
}
