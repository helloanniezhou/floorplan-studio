import type { Furniture, LandscapeElement } from '../types/floorPlan';
import {
  FURNITURE_COLORS,
  LANDSCAPE_COLORS,
} from '../lib/placeables/defaults';

type MeshProps = {
  position: { x: number; y: number };
  width: number;
  depth: number;
  height: number;
  rotation: number;
  color: string;
};

function PlaceableBoxMesh({
  position,
  width,
  depth,
  height,
  rotation,
  color,
}: MeshProps) {
  return (
    <mesh
      position={[position.x, height / 2, position.y]}
      rotation={[0, -rotation, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

export function FurnitureMeshes({ items }: { items: Furniture[] }) {
  return (
    <>
      {items.map((item) => (
        <PlaceableBoxMesh
          key={item.id}
          position={item.position}
          width={item.width}
          depth={item.depth}
          height={item.height}
          rotation={item.rotation}
          color={FURNITURE_COLORS[item.kind]}
        />
      ))}
    </>
  );
}

export function LandscapeMeshes({ items }: { items: LandscapeElement[] }) {
  return (
    <>
      {items.map((item) => (
        <PlaceableBoxMesh
          key={item.id}
          position={item.position}
          width={item.width}
          depth={item.depth}
          height={item.height}
          rotation={item.rotation}
          color={LANDSCAPE_COLORS[item.kind]}
        />
      ))}
    </>
  );
}
