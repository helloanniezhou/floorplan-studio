import { useMemo } from 'react';
import * as THREE from 'three';
import type { Furniture, LandscapeElement, Opening, Wall } from '../types/floorPlan';
import { FurnitureMeshes, LandscapeMeshes } from './PlaceableMeshes';
import { splitWallForOpenings, boundsFromWalls } from '../lib/walls3d/miter';

function polygonToShape(polygon: { x: number; y: number }[]): THREE.Shape {
  const shape = new THREE.Shape();
  if (polygon.length === 0) return shape;
  shape.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i++) {
    shape.lineTo(polygon[i].x, polygon[i].y);
  }
  shape.closePath();
  return shape;
}

function WallPartMesh({
  polygon,
  yMin,
  yMax,
}: {
  polygon: { x: number; y: number }[];
  yMin: number;
  yMax: number;
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
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#e8e4dc" roughness={0.85} />
    </mesh>
  );
}

type WallMeshProps = {
  walls: Wall[];
  openings: Opening[];
  wallHeight: number;
};

function WallMeshes({ walls, openings, wallHeight }: WallMeshProps) {
  const parts = useMemo(() => {
    return walls.flatMap((wall) =>
      splitWallForOpenings(wall, walls, openings, wallHeight),
    );
  }, [walls, openings, wallHeight]);

  return (
    <>
      {parts.map((part, i) => {
        const depth = part.yMax - part.yMin;
        if (depth < 0.01) return null;
        return (
          <WallPartMesh
            key={`${part.wallId}-${i}`}
            polygon={part.polygon}
            yMin={part.yMin}
            yMax={part.yMax}
          />
        );
      })}
    </>
  );
}

function FloorPlane({ walls }: { walls: Wall[] }) {
  const bounds = useMemo(() => boundsFromWalls(walls), [walls]);
  const w = Math.max(0.5, bounds.maxX - bounds.minX + 1);
  const d = Math.max(0.5, bounds.maxZ - bounds.minZ + 1);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color="#c8c4bc" roughness={0.95} />
    </mesh>
  );
}

export function SceneContent({
  walls,
  openings,
  wallHeight,
  furniture,
  landscape,
}: {
  walls: Wall[];
  openings: Opening[];
  wallHeight: number;
  furniture: Furniture[];
  landscape: LandscapeElement[];
}) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow />
      <FloorPlane walls={walls} />
      <WallMeshes walls={walls} openings={openings} wallHeight={wallHeight} />
      <FurnitureMeshes items={furniture} />
      <LandscapeMeshes items={landscape} />
    </>
  );
}

export function sceneCenter(walls: Wall[]): [number, number, number] {
  const b = boundsFromWalls(walls);
  return [(b.minX + b.maxX) / 2, 1.2, (b.minZ + b.maxZ) / 2];
}
