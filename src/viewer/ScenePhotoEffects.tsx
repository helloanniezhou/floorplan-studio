import { ContactShadows, Environment } from '@react-three/drei';

type Props = {
  center: [number, number, number];
  enabled: boolean;
};

export function ScenePhotoEffects({ center, enabled }: Props) {
  if (!enabled) return null;

  return (
    <>
      <color attach="background" args={['#c5d4e8']} />
      <fog attach="fog" args={['#c5d4e8', 28, 95]} />
      <Environment preset="apartment" background={false} />
      <ContactShadows
        position={[center[0], 0.02, center[2]]}
        opacity={0.4}
        scale={28}
        blur={2.8}
        far={14}
      />
    </>
  );
}
