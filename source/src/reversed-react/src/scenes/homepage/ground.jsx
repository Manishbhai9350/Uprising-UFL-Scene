import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { RepeatWrapping, Vector2 } from "three";

function requireAsset(assets, name) {
  const asset = assets.get(name);
  if (!asset) {
    throw new Error(`Homepage asset "${name}" was not loaded.`);
  }
  return asset;
}

export default function ReflectiveGround({ assets, settings }) {
  const plane = requireAsset(assets, settings.geometry).scene?.children[0];
  if (!plane?.geometry) {
    throw new Error(
      `Homepage ground "${settings.geometry}" has no first-child mesh geometry.`
    );
  }

  const normalMap = requireAsset(assets, settings.normal);
  const ground = useRef(null);
  const material = useRef(null);
  const elapsed = useRef(0);
  
  const normalScale = useMemo(
    () => new Vector2().setScalar(settings.normalScale),
    [settings.normalScale]
  );

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (!ground.current?.userData.active || !material.current) return;

    if (material.current.normalMap) {
      material.current.normalMap.offset.x = 0.2 * Math.cos(elapsed.current * 0.1);
      material.current.normalMap.offset.y = 0.1 * Math.sin(elapsed.current * 0.2);
    }
  });

  return (
    <mesh
      ref={ground}
      name="Reflector"
      position={plane.position}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={settings.visible}
      userData={{ active: true }}
    >
      <planeGeometry args={[10, 10]} />
      <MeshReflectorMaterial
        ref={material}
        blur={[0, 0]}
        resolution={512}
        mirror={settings.mirror}
        mixStrength={settings.mixStrength}
        mixContrast={settings.mixContrast}
        color={settings.color}
        metalness={settings.metalness}
        roughness={settings.roughness}
        normalMap={normalMap}
        normalMap-wrapS={RepeatWrapping}
        normalMap-wrapT={RepeatWrapping}
        normalMap-repeat={[settings.repeat, settings.repeat]}
        normalScale={normalScale}
      />
    </mesh>
  );
}