import { Circle, Group, Star } from 'react-konva';
import type { LightFixture, Selection } from '../types/floorPlan';
import type { Point } from '../types/floorPlan';

type LightShapesProps = {
  lights: LightFixture[];
  selection: Selection;
  toDisplay: (p: Point) => Point;
  stageScale: number;
  onSelect: (id: string) => void;
  onMouseDown?: (id: string, e: { cancelBubble: boolean }) => void;
};

export function getLightAtPoint(
  world: Point,
  lights: LightFixture[],
  radiusWorld: number,
): LightFixture | null {
  const r2 = radiusWorld * radiusWorld;
  for (let i = lights.length - 1; i >= 0; i--) {
    const l = lights[i];
    const dx = l.position.x - world.x;
    const dy = l.position.y - world.y;
    if (dx * dx + dy * dy <= r2) return l;
  }
  return null;
}

export function LightShapes({
  lights,
  selection,
  toDisplay,
  stageScale,
  onSelect,
  onMouseDown,
}: LightShapesProps) {
  const r = 11 / stageScale;

  return (
    <>
      {lights.map((light) => {
        const p = toDisplay(light.position);
        const selected = selection?.type === 'light' && selection.id === light.id;
        const fill = light.kind === 'outdoor' ? '#fde68a' : '#fef08a';
        return (
          <Group
            key={light.id}
            onClick={() => onSelect(light.id)}
            onMouseDown={(e) => {
              if (onMouseDown) {
                e.cancelBubble = true;
                onMouseDown(light.id, e);
              }
            }}
          >
            <Circle
              x={p.x}
              y={p.y}
              radius={r}
              fill={selected ? '#f59e0b' : fill}
              stroke={selected ? '#b45309' : '#ca8a04'}
              strokeWidth={2 / stageScale}
              hitStrokeWidth={Math.max(18 / stageScale, r * 2)}
            />
            <Star
              x={p.x}
              y={p.y}
              numPoints={4}
              innerRadius={r * 0.35}
              outerRadius={r * 0.7}
              fill="#fffbeb"
              opacity={0.9}
              listening={false}
            />
          </Group>
        );
      })}
    </>
  );
}
