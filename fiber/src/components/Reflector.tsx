import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { PlaneGeometry } from "three";
import { NoColorSpace, RepeatWrapping, TangentSpaceNormalMap } from "three";

export function Floor() {
  const normalMapSource = useTexture("/textures/normal-map.jpg");

  // Create geometry and rotate it immediately
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(20, 20);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const normalMap = useMemo(() => {
    const t = normalMapSource.clone();
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(10, 10);
    t.colorSpace = NoColorSpace;
    t.needsUpdate = true;
    return t;
  }, [normalMapSource]);

  return (
    <mesh position={[0, -0.3799, 0]}>
      <primitive object={geometry} />
      <MeshReflectorMaterial
        mirror={0.98}
        mixBlur={0}
        resolution={1024}
        normalMap={normalMap}
        normalScale={[0.1, 0.1]}
        color="#ffffff"
        metalness={1}
        roughness={1}
        mixStrength={10}
        mixContrast={2}
        toneMapped
        // mirror={0.92}
        // mixBlur={0}
        // blur={[0, 0]}
        // resolution={1024}
        // normalMapType={TangentSpaceNormalMap}
        // normalMap={normalMap}
        // normalScale={[0.08, 0.08]}
        // color="#ffffff"
        // emissive="0x000000"
        // metalness={0.98}
        // roughness={0.98}
        // mixStrength={24}
        // mixContrast={0.98}
        // envMapIntensity={0}
      />
    </mesh>
  );
}
