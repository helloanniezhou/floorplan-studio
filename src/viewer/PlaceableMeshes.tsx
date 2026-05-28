import type { Furniture, LandscapeElement } from '../types/floorPlan';
import { isOvalLandscapeKind } from '../lib/placeables/defaults';
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

type TreeMeshProps = Omit<MeshProps, 'color'>;

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

/** Tree / shrub: ellipsoid canopy (oval footprint). */
function OvalLandscapeMesh({
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
      scale={[width / 2, height / 2, depth / 2]}
      castShadow
      receiveShadow
    >
      <sphereGeometry args={[1, 20, 14]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

function TreeLandscapeMesh({
  position,
  width,
  depth,
  height,
  rotation,
}: TreeMeshProps) {
  const canopyHeight = Math.max(height * 0.72, 0.8);
  const trunkHeight = Math.max(height - canopyHeight, height * 0.22, 0.35);
  const trunkRadius = Math.max(Math.min(width, depth) * 0.08, 0.08);
  const canopyRadiusX = Math.max(width / 2, 0.25);
  const canopyRadiusZ = Math.max(depth / 2, 0.25);

  return (
    <group position={[position.x, 0, position.y]} rotation={[0, -rotation, 0]}>
      <mesh position={[0, trunkHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[trunkRadius * 0.85, trunkRadius, trunkHeight, 12]} />
        <meshStandardMaterial color="#7c4a2d" roughness={0.92} />
      </mesh>
      <group
        position={[0, trunkHeight, 0]}
        scale={[canopyRadiusX, canopyHeight, canopyRadiusZ]}
      >
        <mesh position={[0, 0.28, 0]} scale={[1, 0.92, 1]} castShadow receiveShadow>
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial color="#166534" roughness={0.88} />
        </mesh>
        <mesh
          position={[0, 0.6, 0]}
          scale={[0.82, 0.78, 0.82]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial color="#1b7a3a" roughness={0.86} />
        </mesh>
        <mesh
          position={[0, 0.9, 0]}
          scale={[0.58, 0.52, 0.58]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#14532d" roughness={0.86} />
        </mesh>
      </group>
    </group>
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
      {items.map((item) => {
        const props = {
          position: item.position,
          width: item.width,
          depth: item.depth,
          height: item.height,
          rotation: item.rotation,
          color: LANDSCAPE_COLORS[item.kind],
        };
        if (item.kind === 'tree') {
          return <TreeLandscapeMesh key={item.id} {...props} />;
        }
        if (isOvalLandscapeKind(item.kind)) {
          return <OvalLandscapeMesh key={item.id} {...props} />;
        }
        return <PlaceableBoxMesh key={item.id} {...props} />;
      })}
    </>
  );
}
