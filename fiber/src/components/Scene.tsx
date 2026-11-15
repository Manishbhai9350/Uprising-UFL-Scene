import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { RepeatWrapping } from "three";
import Portal from "./Portal";


const Scene = () => {
  return (
    <group>
      <ReflectorBase />
      <Portal />
    </group>
  );
};

export default Scene;

const ReflectorBase = () => {
  const normalMap = useTexture("/textures/normal-map.jpg", (texture) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(8, 8);
  });

  return (
    <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <MeshReflectorMaterial
        blur={[0, 0]}
        resolution={512}
        mirror={0.92}
        mixStrength={24}
        mixContrast={0.98}
        color={"#ffffff"}
        metalness={0.98}
        roughness={0.98}
        normalMap={normalMap}
        normalScale={0.08}
      />
    </mesh>
  );
};
