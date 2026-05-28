import { Circle, Group, Line } from 'react-konva';
import type { Furniture, LandscapeElement } from '../types/floorPlan';
import {
  isPlaceableCornerHandle,
  placeableResizeHandlePositions,
} from '../lib/placeables/resizeHandles';

type Point = { x: number; y: number };

type Props = {
  item: Furniture | LandscapeElement;
  displayCorners: Point[];
  stageScale: number;
  toDisplay: (p: Point) => Point;
};

export function PlaceableResizeHandles({
  displayCorners,
  stageScale,
  toDisplay: _toDisplay,
  item: _item,
}: Props) {
  const handles = placeableResizeHandlePositions(_item, _toDisplay);
  const cornerR = 7 / stageScale;
  const edgeR = 4 / stageScale;
  const strokeW = 1.5 / stageScale;
  const edgesFirst = [...handles].sort((a, b) => {
    const aCorner = isPlaceableCornerHandle(a.id);
    const bCorner = isPlaceableCornerHandle(b.id);
    if (aCorner === bCorner) return 0;
    return aCorner ? 1 : -1;
  });

  return (
    <Group>
      <Line
        points={displayCorners.flatMap((p) => [p.x, p.y])}
        closed
        stroke="#2563eb"
        strokeWidth={strokeW}
        dash={[5 / stageScale, 4 / stageScale]}
        listening={false}
      />
      {edgesFirst.map((h) => {
        const corner = isPlaceableCornerHandle(h.id);
        return (
          <Circle
            key={h.id}
            x={h.x}
            y={h.y}
            radius={corner ? cornerR : edgeR}
            fill="#fff"
            stroke="#2563eb"
            strokeWidth={strokeW}
            listening={false}
          />
        );
      })}
    </Group>
  );
}
