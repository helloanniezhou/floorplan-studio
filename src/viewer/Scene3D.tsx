import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type {
  Furniture,
  LandscapeElement,
  LightFixture,
  LotSize,
  Opening,
  PlanLevel,
  SunTime,
  Wall,
} from '../types/floorPlan';
import { allLevelLights, allLevelWalls, floorLevels, roofLevel } from '../lib/plan/levels';
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
  photoMode,
  onDoubleClick,
}: {
  polygon: { x: number; y: number }[];
  yMin: number;
  yMax: number;
  photoMode: boolean;
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
      <meshStandardMaterial
        color={photoMode ? '#f4efe6' : '#e8e4dc'}
        roughness={photoMode ? 0.62 : 0.85}
        metalness={photoMode ? 0.02 : 0}
      />
    </mesh>
  );
}

function WallMeshes({
  walls,
  openings,
  wallHeight,
  photoMode,
  onDoubleClick,
}: {
  walls: Wall[];
  openings: Opening[];
  wallHeight: number;
  photoMode: boolean;
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
            photoMode={photoMode}
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
  photoMode,
  onDoubleClick,
}: {
  walls: Wall[];
  photoMode: boolean;
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
      <meshStandardMaterial
        color={photoMode ? '#b8b0a4' : '#c8c4bc'}
        roughness={photoMode ? 0.88 : 0.95}
      />
    </mesh>
  );
}

function RoofCap({
  roofWalls,
  wallHeight,
  photoMode,
}: {
  roofWalls: Wall[];
  wallHeight: number;
  photoMode: boolean;
}) {
  const bounds = useMemo(() => boundsFromWalls(roofWalls), [roofWalls]);
  if (roofWalls.length < 2) return null;

  const w = Math.max(0.5, bounds.maxX - bounds.minX);
  const d = Math.max(0.5, bounds.maxZ - bounds.minZ);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[cx, wallHeight + 0.05, cz]}
      receiveShadow
      castShadow
    >
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial
        color={photoMode ? '#6b5d4f' : '#7a6a58'}
        roughness={photoMode ? 0.75 : 0.92}
      />
    </mesh>
  );
}

function FixtureLights({ lights }: { lights: LightFixture[] }) {
  return (
    <>
      {lights.map((light) => {
        const y = light.height;
        const x = light.position.x;
        const z = light.position.y;
        const intensity = light.intensity * (light.kind === 'outdoor' ? 2.5 : 1.8);
        if (light.kind === 'outdoor') {
          return (
            <spotLight
              key={light.id}
              position={[x, y, z]}
              angle={0.65}
              penumbra={0.4}
              intensity={intensity}
              castShadow
              distance={14}
            />
          );
        }
        return (
          <pointLight
            key={light.id}
            position={[x, y, z]}
            intensity={intensity}
            distance={10}
            decay={2}
          />
        );
      })}
    </>
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
  levels,
  wallHeight,
  furniture,
  landscape,
  northAngleDeg,
  sunTime,
  lotSize,
  photoMode = false,
}: {
  levels: PlanLevel[];
  wallHeight: number;
  furniture: Furniture[];
  landscape: LandscapeElement[];
  northAngleDeg: number;
  sunTime: SunTime;
  lotSize: LotSize | null;
  photoMode?: boolean;
}) {
  const onDoubleClick = useOrbitFocusOnDoubleClick();
  const floors = useMemo(() => floorLevels(levels), [levels]);
  const roof = useMemo(() => roofLevel(levels), [levels]);
  const groundWalls = floors[0]?.walls ?? [];
  const centerWalls = groundWalls.length > 0 ? groundWalls : allLevelWalls(levels);
  const center = useMemo(() => sceneCenter(centerWalls), [centerWalls]);
  const allLights = useMemo(() => allLevelLights(levels), [levels]);
  const roofElevation = floors.length * wallHeight;

  return (
    <>
      <SunLighting
        center={center}
        northAngleDeg={northAngleDeg}
        sunTime={sunTime}
        wallHeight={wallHeight}
      />
      <FixtureLights lights={allLights} />
      {floors.map((floor, index) => (
        <group key={floor.id} position={[0, index * wallHeight, 0]}>
          {index === 0 && (
            <FloorPlane
              walls={floor.walls}
              photoMode={photoMode}
              onDoubleClick={onDoubleClick}
            />
          )}
          <WallMeshes
            walls={floor.walls}
            openings={floor.openings}
            wallHeight={wallHeight}
            photoMode={photoMode}
            onDoubleClick={onDoubleClick}
          />
        </group>
      ))}
      {lotSize && <LotOutline3D lotSize={lotSize} />}
      {roof && roof.walls.length > 0 && (
        <RoofCap
          roofWalls={roof.walls}
          wallHeight={roofElevation}
          photoMode={photoMode}
        />
      )}
      <FurnitureMeshes items={furniture} wallHeight={wallHeight} photoMode={photoMode} />
      <LandscapeMeshes items={landscape} photoMode={photoMode} />
    </>
  );
}

export function sceneCenter(walls: Wall[]): [number, number, number] {
  const b = boundsFromWalls(walls);
  return [(b.minX + b.maxX) / 2, 1.2, (b.minZ + b.maxZ) / 2];
}
