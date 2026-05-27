import { Group, Line, Text } from 'react-konva';
import type { Furniture, LandscapeElement } from '../types/floorPlan';
import { pointInRect, rectCorners } from '../lib/placeables/geometry';
import {
  FURNITURE_COLORS,
  FURNITURE_LABELS,
  LANDSCAPE_COLORS,
  LANDSCAPE_LABELS,
} from '../lib/placeables/defaults';

type Point = { x: number; y: number };

function toFlatPoints(corners: Point[]): number[] {
  return corners.flatMap((p) => [p.x, p.y]);
}

type PlaceableShapeProps = {
  item: Furniture | LandscapeElement;
  displayCorners: Point[];
  selected: boolean;
  stageScale: number;
  onSelect: () => void;
};

function PlaceableShape({
  item,
  displayCorners,
  selected,
  stageScale,
  onSelect,
}: PlaceableShapeProps) {
  const fill =
    item.category === 'furniture'
      ? FURNITURE_COLORS[item.kind]
      : LANDSCAPE_COLORS[item.kind];
  const label =
    item.category === 'furniture'
      ? FURNITURE_LABELS[item.kind]
      : LANDSCAPE_LABELS[item.kind];
  const cx =
    displayCorners.reduce((s, p) => s + p.x, 0) / displayCorners.length;
  const cy =
    displayCorners.reduce((s, p) => s + p.y, 0) / displayCorners.length;

  return (
    <Group onClick={onSelect}>
      <Line
        points={toFlatPoints(displayCorners)}
        closed
        fill={fill}
        opacity={0.75}
        stroke={selected ? '#2563eb' : '#57534e'}
        strokeWidth={(selected ? 2.5 : 1.5) / stageScale}
      />
      <Text
        x={cx}
        y={cy}
        text={label}
        fontSize={11 / stageScale}
        fill="#1a1a1a"
        align="center"
        verticalAlign="middle"
        offsetX={label.length * 2.5}
        offsetY={5 / stageScale}
        listening={false}
      />
    </Group>
  );
}

type Props = {
  furniture: Furniture[];
  landscape: LandscapeElement[];
  selection: { type: string; id: string } | null;
  toDisplay: (p: Point) => Point;
  stageScale: number;
  onSelectFurniture: (id: string) => void;
  onSelectLandscape: (id: string) => void;
};

export function PlaceableShapes({
  furniture,
  landscape,
  selection,
  toDisplay,
  stageScale,
  onSelectFurniture,
  onSelectLandscape,
}: Props) {
  const mapCorners = (item: Furniture | LandscapeElement) =>
    rectCorners(item).map((c) => toDisplay(c));

  return (
    <>
      {furniture.map((item) => (
        <PlaceableShape
          key={item.id}
          item={item}
          displayCorners={mapCorners(item)}
          selected={selection?.type === 'furniture' && selection.id === item.id}
          stageScale={stageScale}
          onSelect={() => onSelectFurniture(item.id)}
        />
      ))}
      {landscape.map((item) => (
        <PlaceableShape
          key={item.id}
          item={item}
          displayCorners={mapCorners(item)}
          selected={selection?.type === 'landscape' && selection.id === item.id}
          stageScale={stageScale}
          onSelect={() => onSelectLandscape(item.id)}
        />
      ))}
    </>
  );
}

export function getPlaceableAtPoint(
  point: Point,
  furniture: Furniture[],
  landscape: LandscapeElement[],
): { type: 'furniture' | 'landscape'; id: string } | null {
  for (let i = landscape.length - 1; i >= 0; i--) {
    const item = landscape[i];
    if (pointInRect(point, item)) {
      return { type: 'landscape', id: item.id };
    }
  }
  for (let i = furniture.length - 1; i >= 0; i--) {
    const item = furniture[i];
    if (pointInRect(point, item)) {
      return { type: 'furniture', id: item.id };
    }
  }
  return null;
}
