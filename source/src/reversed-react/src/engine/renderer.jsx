import * as React from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { WebGL1Renderer } from "three";
import { RectAreaLightUniformsLib } from "three-stdlib";
import {
  calculateEffectiveDpr,
  getDeviceCapabilities,
  getRendererConfiguration,
} from "./render-pipeline";
import SceneCamera from "./camera";
import HomepageEffects from "./effects";
import HomepageScene from "../scenes/homepage/homepage-scene";

RectAreaLightUniformsLib.init();

function ResizeHandler({ getDPR }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const setDpr = useThree((state) => state.setDpr);

  React.useLayoutEffect(() => {
    setDpr(calculateEffectiveDpr(width, height, getDPR()));
  }, [width, height, getDPR, setDpr]);

  return null;
}

function CanvasContents({ assets }) {
  const capabilities = React.useMemo(() => getDeviceCapabilities(), []);
  const configuration = getRendererConfiguration(capabilities);
  const intro = React.useMemo(() => ({ progress: 0 }), []);
  
  const gl = configuration.renderer.implementation === "WebGL1Renderer"
    ? (canvas) => new WebGL1Renderer({
        canvas,
        powerPreference: "default",
        antialias: false,
        stencil: false,
        depth: false,
      })
    : {
        powerPreference: "default",
        autoClear: false,
        antialias: false,
        stencil: false,
        depth: false,
      };

  return (
    <Canvas
      dpr={configuration.dpr}
      gl={gl}
      camera={{
        position:[.05,-.11,2.35],
        fov:42
      }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
      }}
    >
      <color attach="background" args={[configuration.background]} />
      <ResizeHandler getDPR={capabilities.getDPR} />
      {assets && (
        <>
          <SceneCamera settings={assets?.get("config").settings.camera} intro={intro} />
          <HomepageScene assets={assets} intro={intro} />
          <HomepageEffects
            assets={assets}
            settings={assets.get("config").settings.effects}
            isIosPhone={capabilities.isIosPhone}
            multisampling={configuration.composerSamples}
          />
        </>
      )}
    </Canvas>
  );
}

export default function SharedCanvas({ assets }) {
  return <CanvasContents assets={assets} />;
}