import { Ellipse, Group, Line, Text } from 'react-konva';
import type { Furniture, LandscapeElement } from '../types/floorPlan';
import {
  pointInEllipse,
  pointInRect,
  rectCorners,
  type PlacedRect,
} from '../lib/placeables/geometry';
import {
  FURNITURE_COLORS,
  FURNITURE_LABELS,
  isOvalLandscapeKind,
  LANDSCAPE_COLORS,
  LANDSCAPE_LABELS,
} from '../lib/placeables/defaults';

type Point = { x: number; y: number };

function toFlatPoints(corners: Point[]): number[] {
  return corners.flatMap((p) => [p.x, p.y]);
}

function ellipseDisplay(
  item: PlacedRect,
  toDisplay: (p: Point) => Point,
): { center: Point; radiusX: number; radiusY: number; rotationDeg: number } {
  const center = toDisplay(item.position);
  const east = toDisplay({
    x: item.position.x + item.width / 2,
    y: item.position.y,
  });
  const north = toDisplay({
    x: item.position.x,
    y: item.position.y + item.depth / 2,
  });
  return {
    center,
    radiusX: Math.hypot(east.x - center.x, east.y - center.y),
    radiusY: Math.hypot(north.x - center.x, north.y - center.y),
    rotationDeg: (item.rotation * 180) / Math.PI,
  };
}

type RectShapeProps = {
  item: Furniture | LandscapeElement;
  displayCorners: Point[];
  selected: boolean;
  stageScale: number;
  onSelect: () => void;
};

function RectPlaceableShape({
  item,
  displayCorners,
  selected,
  stageScale,
  onSelect,
}: RectShapeProps) {
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

type OvalShapeProps = {
  item: LandscapeElement;
  toDisplay: (p: Point) => Point;
  selected: boolean;
  stageScale: number;
  onSelect: () => void;
};

function OvalLandscapeShape({
  item,
  toDisplay,
  selected,
  stageScale,
  onSelect,
}: OvalShapeProps) {
  const fill = LANDSCAPE_COLORS[item.kind];
  const label = LANDSCAPE_LABELS[item.kind];
  const { center, radiusX, radiusY, rotationDeg } = ellipseDisplay(item, toDisplay);

  return (
    <Group
      onClick={onSelect}
      x={center.x}
      y={center.y}
      rotation={rotationDeg}
    >
      <Ellipse
        radiusX={Math.max(radiusX, 2)}
        radiusY={Math.max(radiusY, 2)}
        fill={fill}
        opacity={0.75}
        stroke={selected ? '#2563eb' : '#57534e'}
        strokeWidth={(selected ? 2.5 : 1.5) / stageScale}
      />
      <Text
        x={0}
        y={0}
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
  return (
    <>
      {furniture.map((item) => (
        <RectPlaceableShape
          key={item.id}
          item={item}
          displayCorners={rectCorners(item).map((c) => toDisplay(c))}
          selected={selection?.type === 'furniture' && selection.id === item.id}
          stageScale={stageScale}
          onSelect={() => onSelectFurniture(item.id)}
        />
      ))}
      {landscape.map((item) =>
        isOvalLandscapeKind(item.kind) ? (
          <OvalLandscapeShape
            key={item.id}
            item={item}
            toDisplay={toDisplay}
            selected={selection?.type === 'landscape' && selection.id === item.id}
            stageScale={stageScale}
            onSelect={() => onSelectLandscape(item.id)}
          />
        ) : (
          <RectPlaceableShape
            key={item.id}
            item={item}
            displayCorners={rectCorners(item).map((c) => toDisplay(c))}
            selected={selection?.type === 'landscape' && selection.id === item.id}
            stageScale={stageScale}
            onSelect={() => onSelectLandscape(item.id)}
          />
        ),
      )}
    </>
  );
}

function hitTestLandscape(point: Point, item: LandscapeElement): boolean {
  if (isOvalLandscapeKind(item.kind)) {
    return pointInEllipse(point, item);
  }
  return pointInRect(point, item);
}

export function getPlaceableAtPoint(
  point: Point,
  furniture: Furniture[],
  landscape: LandscapeElement[],
): { type: 'furniture' | 'landscape'; id: string } | null {
  for (let i = landscape.length - 1; i >= 0; i--) {
    const item = landscape[i];
    if (hitTestLandscape(point, item)) {
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
