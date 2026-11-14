import { r as React } from "../react.js";
import SharedCanvas from "./renderer.js";
import { HomepageAssetLoader } from "./asset-loader.js";

export default function Application() {
  const [loadState, setLoadState] = React.useState({
    progress: 0,
    loaded: false,
    error: null,
    assets: null,
  });

  React.useEffect(() => {
    let mounted = true;
    const loader = new HomepageAssetLoader({
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
  }, []);

  return React.createElement(
    "main",
    {
      className: "uprising-app",
      "aria-label": "Uprising homepage scene",
      "aria-busy": String(!loadState.loaded && !loadState.error),
    },
    React.createElement(SharedCanvas, { assets: loadState.assets }),
    !loadState.loaded &&
      React.createElement(
        "p",
        {
          className: "scene-status",
          role: loadState.error ? "alert" : "status",
          "aria-live": "polite",
        },
        loadState.error
          ? `Homepage assets failed to load: ${loadState.error.message}`
          : `Loading homepage assets: ${Math.round(loadState.progress * 100)}%`,
      ),
  );
}
