import {
  aO as LoadingManager,
  m as FileLoader,
  s as TextureLoader,
  a$ as CubeTextureLoader,
} from "../three.js";
import { L as LUTLoader } from "../react-fiber.js";
import { D as DRACOLoader, G as GLTFLoader } from "../three-stdlib.js";
import { ASSET_TYPES, HOMEPAGE_ASSETS } from "./asset-manifest.js";
import { prepareHomepageConfiguration } from "./scene-registry.js";

const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/v1/decoders/";

export class HomepageAssetLoader {
  constructor({ onProgress } = {}) {
    this.onProgress = onProgress;
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
        throw new Error(`Unsupported homepage asset type: ${asset.type}`);
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
              prepareHomepageConfiguration(rawConfig),
            ]);
          } catch (error) {
            reject(
              new Error(
                `Could not prepare homepage configuration: ${error.message}`,
                { cause: error },
              ),
            );
          }
        },
        undefined,
        (error) => {
          reject(
            new Error(`Could not load homepage asset "${asset.name}".`, {
              cause: error,
            }),
          );
        },
      );
    });
  }

  async load() {
    const loadedAssets = await Promise.all(
      HOMEPAGE_ASSETS.map((asset) => this.loadAsset(asset)),
    );

    this.cache = new Map(loadedAssets);
    this.onProgress?.(1);
    return this.cache;
  }
}
