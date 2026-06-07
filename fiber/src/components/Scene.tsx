import type { Mesh, WebGLRenderTarget } from "three";
import { useRef } from "react";
import SceneFBO from "./SceneFbo";
import { EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const Scene = () => {
  const FboRef = useRef<WebGLRenderTarget | null>(null);
  const FboMeshRef = useRef<Mesh | null>(null);

  const { width, height } = useThree((v) => v.viewport);

  useFrame(() => {
    if (FboRef.current && FboMeshRef.current) {
      const t = FboRef.current.texture;
      FboMeshRef.current.material.map = t;
    }
  });

  return (
    <>
      <mesh ref={FboMeshRef}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={"pink"} />
      </mesh>
      <SceneFBO ref={FboRef} />
      <EffectComposer>
        <ToneMapping
          mode={ToneMappingMode.REINHARD2_ADAPTIVE}
          maxLuminance={1.0}
          adaptationRate={1.0}
          minLuminance={0.01}
        />
      </EffectComposer>
    </>
  );
};

export default Scene;
