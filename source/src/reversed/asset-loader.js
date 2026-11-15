import {
  aO as LoadingManager,
  m as FileLoader,
  s as TextureLoader,
  a$ as CubeTextureLoader,
} from "../three.js";
import { L as LUTLoader } from "../react-fiber.js";
import { D as DRACOLoader, G as GLTFLoader } from "../three-stdlib.js";
import {
  ABOUT_ASSETS,
  ASSET_TYPES,
  HOMEPAGE_ASSETS,
  WATCH_ASSETS,
} from "./asset-manifest.js";
import {
  HOMEPAGE_SCENE_ID,
  prepareSceneConfiguration,
} from "./scene-registry.js";

const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/v1/decoders/";

export class SceneAssetLoader {
  constructor({
    onProgress,
    manifest = HOMEPAGE_ASSETS,
    sceneId = HOMEPAGE_SCENE_ID,
  } = {}) {
    this.onProgress = onProgress;
    this.manifest = manifest;
    this.sceneId = sceneId;
    this.cache = new Map();
    this.manager = new LoadingManager();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    this.manager.onProgress = (_url, loaded, total) => {
      this.onProgress?.(total ? loaded / total : 0);
    };
  }

  createLoader(asset) {
    switch (asset.type) {
      case ASSET_TYPES.JSON:
        return new FileLoader(this.manager);
      case ASSET_TYPES.GLTF: {
        const loader = new GLTFLoader(this.manager);
        loader.setDRACOLoader(this.dracoLoader);
        return loader;
      }
      case ASSET_TYPES.TEXTURE:
        return new TextureLoader(this.manager);
      case ASSET_TYPES.CUBE:
        return new CubeTextureLoader(this.manager);
      case ASSET_TYPES.LUT:
        return new LUTLoader(this.manager);
      default:
        throw new Error(`Unsupported scene asset type: ${asset.type}`);
    }
  }

  loadAsset(asset) {
    const loader = this.createLoader(asset);

    return new Promise((resolve, reject) => {
      loader.load(
        asset.src,
        (loaded) => {
          if (asset.type !== ASSET_TYPES.JSON) {
            resolve([asset.name, loaded]);
            return;
          }

          try {
            const rawConfig = JSON.parse(loaded);
            resolve([
              asset.name,
              prepareSceneConfiguration(rawConfig, this.sceneId),
            ]);
          } catch (error) {
            reject(
              new Error(
                `Could not prepare scene configuration: ${error.message}`,
                { cause: error },
              ),
            );
          }
        },
        undefined,
        (error) => {
          reject(
            new Error(`Could not load scene asset "${asset.name}".`, {
              cause: error,
            }),
          );
        },
      );
    });
  }

  async load() {
    const loadedAssets = await Promise.all(
      this.manifest.map((asset) => this.loadAsset(asset)),
    );

    this.cache = new Map(loadedAssets);
    this.onProgress?.(1);
    return this.cache;
  }
}

export class HomepageAssetLoader extends SceneAssetLoader {
  constructor(options = {}) {
    super({ ...options, manifest: HOMEPAGE_ASSETS, sceneId: HOMEPAGE_SCENE_ID });
  }
}

export class WatchAssetLoader extends SceneAssetLoader {
  constructor(options = {}) {
    super({ ...options, manifest: WATCH_ASSETS, sceneId: "doublepoint" });
  }
}

export class AboutAssetLoader extends SceneAssetLoader {
  constructor(options = {}) {
    super({ ...options, manifest: ABOUT_ASSETS, sceneId: "underground" });
  }
}
