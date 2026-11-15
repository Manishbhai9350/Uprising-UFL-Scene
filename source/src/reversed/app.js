import { r as React } from "../react.js";
import SharedCanvas from "./renderer.js";
import {
  AboutAssetLoader,
  HomepageAssetLoader,
  WatchAssetLoader,
} from "./asset-loader.js";
import AboutContent from "./about-content.js";

function getRequestedScene() {
  const requested = new URLSearchParams(window.location.search).get("scene");
  if (requested === "about") return "about";
  if (requested === "watch") return "watch";
  if (window.location.pathname === "/about") return "about";
  if (window.location.pathname === "/watch") return "watch";
  return "homepage";
}

export default function Application() {
  const sceneId = getRequestedScene();
  const sceneLabel = sceneId === "about"
    ? "About"
    : sceneId === "watch"
      ? "Watch"
      : "Homepage";
  const scrollProgress = React.useRef(0);
  const [loadState, setLoadState] = React.useState({
    progress: 0,
    loaded: false,
    error: null,
    assets: null,
  });

  React.useEffect(() => {
    let mounted = true;
    const Loader = sceneId === "about"
      ? AboutAssetLoader
      : sceneId === "watch"
        ? WatchAssetLoader
        : HomepageAssetLoader;
    const loader = new Loader({
      onProgress: (progress) => {
        if (mounted) {
          setLoadState((state) => ({ ...state, progress }));
        }
      },
    });

    loader
      .load()
      .then((assets) => {
        if (mounted) {
          setLoadState({ progress: 1, loaded: true, error: null, assets });
        }
      })
      .catch((error) => {
        if (mounted) {
          setLoadState({ progress: 0, loaded: false, error, assets: null });
        }
      });

    return () => {
      mounted = false;
    };
  }, [sceneId]);

  return React.createElement(
    "main",
    {
      className: "uprising-app",
      "aria-label": `Uprising ${sceneLabel.toLowerCase()} scene`,
      "aria-busy": String(!loadState.loaded && !loadState.error),
    },
    React.createElement(SharedCanvas, {
      assets: loadState.assets,
      sceneId,
      scrollProgress,
    }),
    // sceneId === "about" &&
    //   loadState.assets &&
    //   React.createElement(AboutContent, {
    //     configuration: loadState.assets.get("config"),
    //     scrollProgress,
    //   }),
    !loadState.loaded &&
      React.createElement(
        "p",
        {
          className: "scene-status",
          role: loadState.error ? "alert" : "status",
          "aria-live": "polite",
        },
        loadState.error
          ? `${sceneLabel} assets failed to load: ${loadState.error.message}`
          : `Loading ${sceneLabel.toLowerCase()} assets: ${Math.round(loadState.progress * 100)}%`,
      ),
  );
}
