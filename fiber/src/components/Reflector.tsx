import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import {
  Mesh,
  MeshPhysicalMaterial,
  NoColorSpace,
  PlaneGeometry,
  RepeatWrapping,
} from "three";

export function Floor() {
  const normalMapSource = useTexture("/textures/normal-map.jpg");

  const RefMatRef = useRef<MeshPhysicalMaterial | null>(
    null,
  );

  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (RefMatRef.current && RefMatRef.current.normalMap) {
      RefMatRef.current.normalMap.offset.x =
        0.2 * Math.cos(timeRef.current * 0.1);
      RefMatRef.current.normalMap.offset.y =
        0.1 * Math.sin(timeRef.current * 0.2);
    }
  });

  const { y } = useControls("Relector", {
    y: {
      min: -10,
      max: 10,
      value: 0,
      step: 0.1,
    },
  });

  const normalMap = useMemo(() => {
    const t = normalMapSource.clone();
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(8, 8);
    t.colorSpace = NoColorSpace;
    t.needsUpdate = true;
    return t;
  }, [normalMapSource]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3799 + y * 0.01, 0]}>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        ref={RefMatRef}
        toneMapped
        mirror={0.98}
        mixBlur={0}
        resolution={1024}
        // normalMap={normalMap}
        // normalScale={[2, 2]}
        color="#ffffff"
        envMap={null}
        envMapIntensity={0}
        emissive={0x000000}
        metalness={1}
        roughness={1}
        mixStrength={24}
        distortionMap={normalMap}
        // mixStrength={1.5}
        // mixContrast={2}
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
