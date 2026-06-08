import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import {
  Scene as ThreeScene,
  PerspectiveCamera as ThreePerspectiveCamera,
  Vector3,
} from "three";
import { WebGLRenderTarget, LinearFilter, HalfFloatType } from "three";
import {
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import { Floor } from "./Reflector";
import { Ufl } from "./Ufl";
import { Panels } from "./Panels";

const SceneFBO = forwardRef<WebGLRenderTarget>((_, ref) => {
  const { gl } = useThree();

  // Own camera for this scene
  const cam = useRef<ThreePerspectiveCamera>(null);

  const fboScene = useMemo(() => new ThreeScene(), []);

  const fbo = useMemo(
    () =>
      new WebGLRenderTarget(1024, 1024, {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        type: HalfFloatType,
        depthBuffer: true,
        stencilBuffer: false,
      }),
    [],
  );

  useEffect(() => {
    if (ref && "current" in ref) ref.current = fbo;
  }, [fbo, ref]);

  useFrame(() => {
    if (!cam.current) return;
    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(fboScene, cam.current); // ← use inner camera
    gl.setRenderTarget(null);
  }, -1);

  useEffect(() => {
    
    if(cam.current) {
        cam.current.lookAt(new Vector3(0,0,0))
    }
  
    return () => {
      
    }
  }, [])
  

  return createPortal(
    <>
      <PerspectiveCamera
        ref={cam}
        position={[0, .5, 4.3]}
        fov={50}
        far={1000}
        near={0.01}
        // lookAt={new Vector3(0,0,0)}
        makeDefault
      />
      {/* <OrbitControls makeDefault camera={cam.current ?? undefined} /> */}
      <color attach="background" args={[0x000000]} />
      <Panels />
      <Ufl />
      <Floor />
      <Environment
        files={[
          "/textures/cube160/px.png",
          "/textures/cube160/nx.png",
          "/textures/cube160/py.png",
          "/textures/cube160/ny.png",
          "/textures/cube160/pz.png",
          "/textures/cube160/nz.png",
        ]}
        environmentIntensity={1}
        background={false}
      />
    </>,
    fboScene,
    { camera: cam.current ?? undefined }, // ← gives portal the inner camera
  );
});

export default SceneFBO;
