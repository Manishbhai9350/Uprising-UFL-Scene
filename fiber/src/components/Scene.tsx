import {
  MeshBasicMaterial,
  PlaneGeometry,
  type Mesh,
  type WebGLRenderTarget,
} from "three";
import { Suspense, useRef } from "react";
import SceneFBO from "./SceneFbo";
import {
  Bloom,
  EffectComposer,
  LUT,
  ToneMapping,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  LUTCubeLoader,
  type LUTCubeResult,
} from "three/examples/jsm/Addons.js";
import { useControls } from "leva";

const LUTPass = () => {
  const lut = useLoader(LUTCubeLoader, "/lut.cube") as LUTCubeResult;
  if (!lut) return null;
  return <LUT lut={lut.texture3D} tetrahedralInterpolation />;
};

const Scene = () => {
  const FboRef = useRef<WebGLRenderTarget | null>(null);
  const FboMeshRef = useRef<Mesh<PlaneGeometry, MeshBasicMaterial> | null>(
    null,
  );
  const { width, height } = useThree((v) => v.viewport);

  const bloom = useControls("Bloom", {
    luminanceThreshold: { value: 0.76, min: 0, max: 10, step: 0.01 },
    luminanceSmoothing: { value: 0.86, min: 0, max: 10, step: 0.01 },
    intensity: { value: 1.0, min: 0, max: 10, step: 0.05 },
    radius: { value: 0.78, min: 0, max: 1, step: 0.01 },
    mipmapBlur: true,
  });

  const toneMapping = useControls("ToneMapping", {
    middleGrey: { value: 0.4, min: 0, max: 1, step: 0.01 },
    maxLuminance: { value: 4.0, min: 1, max: 32, step: 0.5 },
    adaptationRate: { value: 1.0, min: 0, max: 10, step: 0.1 },
    minLuminance: { value: 0.01, min: 0, max: 1, step: 0.001 },
  });

  useFrame(() => {
    if (FboRef.current && FboMeshRef.current) {
      FboMeshRef.current.material.map = FboRef.current.texture;
      FboMeshRef.current.material.needsUpdate = true;
    }
  });

  return (
    <>
      <mesh ref={FboMeshRef}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial toneMapped={false} />
      </mesh>
      <SceneFBO ref={FboRef} />
      <Suspense fallback={null}>
        <EffectComposer>
          <Bloom
            luminanceThreshold={bloom.luminanceThreshold}
            luminanceSmoothing={bloom.luminanceSmoothing}
            intensity={bloom.intensity}
            radius={bloom.radius}
            mipmapBlur={bloom.mipmapBlur}
            blendFunction={BlendFunction.ADD}
          />
          <ToneMapping
            mode={ToneMappingMode.REINHARD2_ADAPTIVE}
            middleGrey={toneMapping.middleGrey}
            maxLuminance={toneMapping.maxLuminance}
            adaptationRate={toneMapping.adaptationRate}
            minLuminance={toneMapping.minLuminance}
          />
          {/* <LUTPass /> */}
        </EffectComposer>
      </Suspense>
    </>
  );
};

export default Scene;
