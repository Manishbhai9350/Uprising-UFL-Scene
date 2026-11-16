import { useEffect, useState } from "react";
import SharedCanvas from "./engine/renderer";
import { HomepageAssetLoader } from "./engine/asset-loader.js";

function App() {
  const [loadState, setLoadState] = useState({
    progress: 0,
    loaded: false,
    error: null,
    assets: null,
  });

  useEffect(() => {
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

  return (
    <main
      className="uprising-app"
      aria-label="Uprising homepage scene"
      aria-busy={String(!loadState.loaded && !loadState.error)}
    >
      <SharedCanvas assets={loadState.assets} />
      {!loadState.loaded && (
        <p
          className="scene-status"
          role={loadState.error ? "alert" : "status"}
          aria-live="polite"
        >
          {loadState.error
            ? `Homepage assets failed to load: ${loadState.error.message}`
            : `Loading homepage assets: ${Math.round(
                loadState.progress * 100,
              )}%`}
        </p>
      )}
    </main>
  );
}

export default App;
