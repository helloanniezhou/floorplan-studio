import { Ellipse, Group, Line, Text } from 'react-konva';
import type Konva from 'konva';
import type { Furniture, LandscapeElement, Selection } from '../types/floorPlan';
import {
  getSelectedFurnitureIds,
  getSelectedLandscapeIds,
  isFurnitureSelected,
  isLandscapeSelected,
} from '../lib/geometry/selection';
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
import { furnitureMount } from '../lib/placeables/mount';
import { isRectPlaceable } from '../lib/placeables/resizeHandles';
import { PlaceableResizeHandles } from './PlaceableResizeHandles';

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
  onPointerDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
};

function RectPlaceableShape({
  item,
  displayCorners,
  selected,
  stageScale,
  onSelect,
  onPointerDown,
}: RectShapeProps) {
  const fill =
    item.category === 'furniture'
      ? FURNITURE_COLORS[item.kind]
      : LANDSCAPE_COLORS[item.kind];
  const topMounted =
    item.category === 'furniture' && furnitureMount(item) === 'top';
  const label =
    item.category === 'furniture'
      ? FURNITURE_LABELS[item.kind]
      : LANDSCAPE_LABELS[item.kind];
  const cx =
    displayCorners.reduce((s, p) => s + p.x, 0) / displayCorners.length;
  const cy =
    displayCorners.reduce((s, p) => s + p.y, 0) / displayCorners.length;

  return (
    <Group onClick={onSelect} onMouseDown={onPointerDown}>
      <Line
        points={toFlatPoints(displayCorners)}
        closed
        fill={fill}
        opacity={topMounted ? 0.55 : 0.75}
        stroke={selected ? '#2563eb' : topMounted ? '#78716c' : '#57534e'}
        strokeWidth={(selected ? 2.5 : 1.5) / stageScale}
        dash={topMounted ? [6 / stageScale, 4 / stageScale] : undefined}
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
  onPointerDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
};

function OvalLandscapeShape({
  item,
  toDisplay,
  selected,
  stageScale,
  onSelect,
  onPointerDown,
}: OvalShapeProps) {
  const fill = LANDSCAPE_COLORS[item.kind];
  const label = LANDSCAPE_LABELS[item.kind];
  const { center, radiusX, radiusY, rotationDeg } = ellipseDisplay(item, toDisplay);

  return (
    <Group
      onClick={onSelect}
      onMouseDown={onPointerDown}
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
  selection: Selection;
  activeDragId?: { type: 'furniture' | 'landscape'; id: string } | null;
  toDisplay: (p: Point) => Point;
  stageScale: number;
  onSelectFurniture: (id: string) => void;
  onSelectLandscape: (id: string) => void;
  onPointerDown?: (
    type: 'furniture' | 'landscape',
    id: string,
    e: Konva.KonvaEventObject<MouseEvent>,
  ) => void;
};

export function PlaceableShapes({
  furniture,
  landscape,
  selection,
  activeDragId = null,
  toDisplay,
  stageScale,
  onSelectFurniture,
  onSelectLandscape,
  onPointerDown,
}: Props) {
  const isFurnitureActive = (id: string) =>
    isFurnitureSelected(selection, id) ||
    (activeDragId?.type === 'furniture' && activeDragId.id === id);
  const isLandscapeActive = (id: string) =>
    isLandscapeSelected(selection, id) ||
    (activeDragId?.type === 'landscape' && activeDragId.id === id);
  return (
    <>
      {furniture.map((item) => (
        <RectPlaceableShape
          key={item.id}
          item={item}
          displayCorners={rectCorners(item).map((c) => toDisplay(c))}
          selected={isFurnitureActive(item.id)}
          stageScale={stageScale}
          onSelect={() => onSelectFurniture(item.id)}
          onPointerDown={
            onPointerDown
              ? (e) => onPointerDown('furniture', item.id, e)
              : undefined
          }
        />
      ))}
      {landscape.map((item) =>
        isOvalLandscapeKind(item.kind) ? (
          <OvalLandscapeShape
            key={item.id}
            item={item}
            toDisplay={toDisplay}
            selected={isLandscapeActive(item.id)}
            stageScale={stageScale}
            onSelect={() => onSelectLandscape(item.id)}
            onPointerDown={
              onPointerDown
                ? (e) => onPointerDown('landscape', item.id, e)
                : undefined
            }
          />
        ) : (
          <RectPlaceableShape
            key={item.id}
            item={item}
            displayCorners={rectCorners(item).map((c) => toDisplay(c))}
            selected={isLandscapeActive(item.id)}
            stageScale={stageScale}
            onSelect={() => onSelectLandscape(item.id)}
            onPointerDown={
              onPointerDown
                ? (e) => onPointerDown('landscape', item.id, e)
                : undefined
            }
          />
        ),
      )}

      {getSelectedFurnitureIds(selection).length === 1 &&
        activeDragId?.type !== 'furniture' &&
        (() => {
          const item = furniture.find(
            (f) => f.id === getSelectedFurnitureIds(selection)[0],
          );
          if (!item) return null;
          return (
            <PlaceableResizeHandles
              key={`resize-f-${item.id}`}
              item={item}
              displayCorners={rectCorners(item).map((c) => toDisplay(c))}
              stageScale={stageScale}
              toDisplay={toDisplay}
            />
          );
        })()}

      {getSelectedLandscapeIds(selection).length === 1 &&
        activeDragId?.type !== 'landscape' &&
        (() => {
          const item = landscape.find(
            (l) => l.id === getSelectedLandscapeIds(selection)[0],
          );
          if (!item || !isRectPlaceable('landscape', item)) return null;
          return (
            <PlaceableResizeHandles
              key={`resize-l-${item.id}`}
              item={item}
              displayCorners={rectCorners(item).map((c) => toDisplay(c))}
              stageScale={stageScale}
              toDisplay={toDisplay}
            />
          );
        })()}
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
