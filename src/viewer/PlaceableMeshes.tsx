import type { Furniture, LandscapeElement } from '../types/floorPlan';
import { isOvalLandscapeKind } from '../lib/placeables/defaults';
import {
  FURNITURE_COLORS,
  LANDSCAPE_COLORS,
} from '../lib/placeables/defaults';
import { furnitureMeshCenterY } from '../lib/placeables/mount';

type MeshProps = {
  position: { x: number; y: number };
  width: number;
  depth: number;
  height: number;
  rotation: number;
  color: string;
  centerY: number;
};

function PlaceableBoxMesh({
  position,
  width,
  depth,
  height,
  rotation,
  color,
  centerY,
}: MeshProps) {
  return (
    <mesh
      position={[position.x, centerY, position.y]}
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
}: Omit<MeshProps, 'centerY'>) {
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

export function FurnitureMeshes({
  items,
  wallHeight,
}: {
  items: Furniture[];
  wallHeight: number;
}) {
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
          centerY={furnitureMeshCenterY(item, wallHeight)}
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
        if (isOvalLandscapeKind(item.kind)) {
          return <OvalLandscapeMesh key={item.id} {...props} />;
        }
        return (
          <PlaceableBoxMesh key={item.id} {...props} centerY={item.height / 2} />
        );
      })}
    </>
  );
}
