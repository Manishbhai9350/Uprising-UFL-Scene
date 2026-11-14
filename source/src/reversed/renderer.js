import { r as React } from "../react.js";
import { C as Canvas, u as useThree } from "../react-fiber.js";
import { ba as WebGL1Renderer } from "../three.js";
import {
  calculateDrawBufferSize,
  getDeviceCapabilities,
  getRendererConfiguration,
} from "./render-pipeline.js";
import SceneCamera from "./camera.js";
import HomepageScene from "./homepage-scene.js";

const createElement = React.createElement;

function ResizeHandler({ getDPR }) {
  const getFiberState = useThree((state) => state.get);

  React.useEffect(() => {
    function resizeDrawingBuffer() {
      const state = getFiberState();
      const { width, height } = calculateDrawBufferSize(
        state.size.width,
        state.size.height,
        getDPR(),
      );

      state.setSize(width, height, false);
    }

    window.addEventListener("resize", resizeDrawingBuffer);
    resizeDrawingBuffer();

    return () => window.removeEventListener("resize", resizeDrawingBuffer);
  }, [getFiberState, getDPR]);

  return null;
}

function CanvasContents({ assets }) {
  const capabilities = React.useMemo(() => getDeviceCapabilities(), []);
  const configuration = getRendererConfiguration(capabilities);
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
    assets &&
      createElement(SceneCamera, {
        settings: assets.get("config").settings.camera,
      }),
    assets && createElement(HomepageScene, { assets }),
  );
}

export default function SharedCanvas({ assets }) {
  return createElement(CanvasContents, { assets });
}
