import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Furniture, LandscapeElement, LotSize, Opening, SunTime, Wall } from '../types/floorPlan';
import { FurnitureMeshes, LandscapeMeshes } from './PlaceableMeshes';
import { splitWallForOpenings, boundsFromWalls } from '../lib/walls3d/miter';
import { planToShapePoint } from '../lib/walls3d/planTo3D';
import { sunLightConfig } from '../lib/compass/orientation';
import { useOrbitFocusOnDoubleClick } from './useOrbitFocusOnDoubleClick';

function polygonToShape(polygon: { x: number; y: number }[]): THREE.Shape {
  const shape = new THREE.Shape();
  if (polygon.length === 0) return shape;
  const pts = polygon.map(planToShapePoint).reverse();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i].x, pts[i].y);
  }
  shape.closePath();
  return shape;
}

function WallPartMesh({
  polygon,
  yMin,
  yMax,
  onDoubleClick,
}: {
  polygon: { x: number; y: number }[];
  yMin: number;
  yMax: number;
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const geometry = useMemo(() => {
    const depth = yMax - yMin;
    const shape = polygonToShape(polygon);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, yMin, 0);
    return geo;
  }, [polygon, yMin, yMax]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow onDoubleClick={onDoubleClick}>
      <meshStandardMaterial color="#e8e4dc" roughness={0.85} />
    </mesh>
  );
}

function WallMeshes({
  walls,
  openings,
  wallHeight,
  onDoubleClick,
}: {
  walls: Wall[];
  openings: Opening[];
  wallHeight: number;
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const parts = useMemo(() => {
    return walls.flatMap((wall) =>
      splitWallForOpenings(wall, walls, openings, wallHeight),
    );
  }, [walls, openings, wallHeight]);

  return (
    <>
      {parts.map((part, i) => {
        const depth = part.yMax - part.yMin;
        if (depth < 0.01 || part.polygon.length < 3) return null;
        if (part.polygon.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
        return (
          <WallPartMesh
            key={`${part.wallId}-${i}`}
            polygon={part.polygon}
            yMin={part.yMin}
            yMax={part.yMax}
            onDoubleClick={onDoubleClick}
          />
        );
      })}
    </>
  );
}

function LotOutline3D({ lotSize }: { lotSize: LotSize }) {
  const points = useMemo<[number, number, number][]>(
    () => [
      [0, 0.02, 0],
      [lotSize.width, 0.02, 0],
      [lotSize.width, 0.02, lotSize.depth],
      [0, 0.02, lotSize.depth],
      [0, 0.02, 0],
    ],
    [lotSize],
  );

  return <Line points={points} color="#15803d" lineWidth={2} />;
}

function FloorPlane({
  walls,
  onDoubleClick,
}: {
  walls: Wall[];
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const bounds = useMemo(() => boundsFromWalls(walls), [walls]);
  const w = Math.max(0.5, bounds.maxX - bounds.minX + 1);
  const d = Math.max(0.5, bounds.maxZ - bounds.minZ + 1);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[cx, 0, cz]}
      receiveShadow
      onDoubleClick={onDoubleClick}
    >
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color="#c8c4bc" roughness={0.95} />
    </mesh>
  );
}

function SunLighting({
  center,
  northAngleDeg,
  sunTime,
  wallHeight,
}: {
  center: [number, number, number];
  northAngleDeg: number;
  sunTime: SunTime;
  wallHeight: number;
}) {
  const light = useMemo(
    () => sunLightConfig(northAngleDeg, sunTime, wallHeight),
    [northAngleDeg, sunTime, wallHeight],
  );

  return (
    <group position={center}>
      <ambientLight intensity={light.ambient} />
      <directionalLight
        position={light.sunPosition}
        intensity={light.sunIntensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={light.fillPosition}
        intensity={light.fillIntensity}
        color="#c4d4f0"
      />
    </group>
  );
}

export function SceneContent({
  walls,
  openings,
  wallHeight,
  furniture,
  landscape,
  northAngleDeg,
  sunTime,
  lotSize,
}: {
  walls: Wall[];
  openings: Opening[];
  wallHeight: number;
  furniture: Furniture[];
  landscape: LandscapeElement[];
  northAngleDeg: number;
  sunTime: SunTime;
  lotSize: LotSize | null;
}) {
  const onDoubleClick = useOrbitFocusOnDoubleClick();
  const center = useMemo(() => sceneCenter(walls), [walls]);

  return (
    <>
      <SunLighting
        center={center}
        northAngleDeg={northAngleDeg}
        sunTime={sunTime}
        wallHeight={wallHeight}
      />
      <FloorPlane walls={walls} onDoubleClick={onDoubleClick} />
      {lotSize && <LotOutline3D lotSize={lotSize} />}
      <WallMeshes
        walls={walls}
        openings={openings}
        wallHeight={wallHeight}
        onDoubleClick={onDoubleClick}
      />
      <FurnitureMeshes items={furniture} wallHeight={wallHeight} />
      <LandscapeMeshes items={landscape} />
    </>
  );
}

export function sceneCenter(walls: Wall[]): [number, number, number] {
  const b = boundsFromWalls(walls);
  return [(b.minX + b.maxX) / 2, 1.2, (b.minZ + b.maxZ) / 2];
}
