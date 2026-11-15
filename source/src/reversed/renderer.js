import { r as React } from "../react.js";
import { C as Canvas, u as useThree } from "../react-fiber.js";
import { ba as WebGL1Renderer } from "../three.js";
import { R as RectAreaLightUniformsLib } from "../three-stdlib.js";
import {
  calculateEffectiveDpr,
  getDeviceCapabilities,
  getRendererConfiguration,
} from "./render-pipeline.js";
import SceneCamera from "./camera.js";
import HomepageEffects from "./effects.js";
import HomepageScene from "./homepage-scene.js";
import WatchScene, { WatchCamera } from "./watch-scene.js";
import AboutScene, { AboutCamera } from "./about-scene.js";

RectAreaLightUniformsLib.init();

const createElement = React.createElement;

function ResizeHandler({ getDPR }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const setDpr = useThree((state) => state.setDpr);

  React.useLayoutEffect(() => {
    setDpr(calculateEffectiveDpr(width, height, getDPR()));
  }, [width, height, getDPR, setDpr]);

  return null;
}

function CanvasContents({ assets, sceneId, scrollProgress }) {
  const capabilities = React.useMemo(() => getDeviceCapabilities(), []);
  const configuration = getRendererConfiguration(capabilities);
  const intro = React.useMemo(() => ({ progress: 0 }), [assets]);
  const isWatchScene = sceneId === "watch";
  const isAboutScene = sceneId === "about";
  const camera = createElement(
    isWatchScene ? WatchCamera : isAboutScene ? AboutCamera : SceneCamera,
    {
      settings: assets?.get("config").settings.camera,
      intro: isWatchScene ? undefined : intro,
      scrollProgress,
    },
  );
  const scene = isWatchScene
    ? createElement(WatchScene, { assets })
    : isAboutScene
      ? createElement(AboutScene, { assets, scrollProgress })
      : createElement(HomepageScene, { assets, intro });
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

  return createElement(
    Canvas,
    {
      dpr: configuration.dpr,
      gl,
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
      },
    },
    createElement("color", {
      attach: "background",
      args: [configuration.background],
    }),
    createElement(ResizeHandler, { getDPR: capabilities.getDPR }),
    assets && camera,
    assets && scene,
    assets &&
      createElement(HomepageEffects, {
        assets,
        settings: assets.get("config").settings.effects,
        isIosPhone: capabilities.isIosPhone,
        multisampling: configuration.composerSamples,
        sceneId,
      }),
  );
}

export default function SharedCanvas({ assets, sceneId, scrollProgress }) {
  return createElement(CanvasContents, { assets, sceneId, scrollProgress });
}
