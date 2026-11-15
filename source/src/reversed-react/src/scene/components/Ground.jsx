import { MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useRef } from "react";
import { RepeatWrapping } from "three";

const Ground = () => {
  const NormalMap = useTexture("/textures/normal-map.jpg", (t) => {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(8, 8); // Pass both x and y arguments
  });

  const ground = useRef(null);
  const material = useRef(null);
  const elapsed = useRef(0);

  const { normalScale } = useControls("Ground",{
    normalScale:{
        value:.08,
        min:0,
        max:1,
        step:.001
    }
  })

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (!material.current) return;
    material.current.normalMap.offset.x = Math.cos(elapsed.current * 0.1);
    material.current.normalMap.offset.y = Math.sin(elapsed.current * 0.2);
  });

  return (
      <mesh ref={ground} position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <MeshReflectorMaterial
          ref={material}
          blur={0}
          resolution={512}
          mixStrength={24}
          color="#ffffff"
          mirror={0.92}
          metalness={0.98}
          mixContrast={.98}
          roughness={0.2} // Lowered roughness so reflections are sharp and aligned
          mixBlur={10}    // Smooths out reflection edges
          normalScale={[normalScale,normalScale]}
          normalMap={NormalMap}
        />
      </mesh>
  );
};

export default Ground;