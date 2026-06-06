/**
 * Asset Loading and Model Management System.
 * Mirrors vS and Yn logic from main.js.
 */

import * as THREE from '../three.js';
import { GLTFLoader, DRACOLoader } from '../src/three-stdlib.js';

/** 
 * Helper: Get asset from cache by name (rn in main.js)
 */
export const rn = (name, cache) => cache.get(name);

/**
 * Helper: Get the first child of a loaded GLTF scene (ri in main.js)
 */
export const ri = (name, cache) => {
  const asset = rn(name, cache);
  return asset ? asset.scene.children[0] : null;
};

/**
 * Helper: Get the first child of the first child (nested mesh/group) ($m in main.js)
 */
export const $m = (name, cache) => {
  const root = ri(name, cache);
  return root ? root.children[0] : null;
};

/**
 * Helper: Find a specific child by name (kn in main.js)
 */
export const kn = (name, object) => {
  if (!object) return null;
  return object.children.find((child) => child.name === name);
};

export class AssetLoader {
  constructor({ onProgress } = {}) {
    this.cache = new Map();
    this.onProgress = onProgress || (() => {});

    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onProgress = (url, loaded, total) => {
      this.onProgress(loaded / total);
    };

    // Initialize Draco decoder for compressed meshes
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.cubeTextureLoader = new THREE.CubeTextureLoader(this.loadingManager);
  }

  /**
   * Assets required for the UFL scene and Home (Uprising) scene.
   */
  getRequiredAssets() {
    return [
      { name: "config", type: "json", src: "data/config.json" },
      { name: "uprising.model", type: "gltf", src: "assets/models/uprising/uprising.glb" },
      { name: "uprising.portal", type: "gltf", src: "assets/models/uprising/uprising-light-reference.gltf" },
      { name: "ufl.model", type: "gltf", src: "assets/models/ufl/ufl.glb" },
      { name: "ufl.portal", type: "gltf", src: "assets/models/ufl/ufl-panels.glb" },
      { name: "noise", type: "texture", src: "assets/textures/noise.png" },
      { name: "pattern", type: "texture", src: "assets/textures/pattern.png" },
      {
        name: "cube",
        type: "cube",
        src: [
          "assets/textures/cube160/px.png", "assets/textures/cube160/nx.png",
          "assets/textures/cube160/py.png", "assets/textures/cube160/ny.png",
          "assets/textures/cube160/pz.png", "assets/textures/cube160/nz.png"
        ]
      }
    ];
  }

  async loadAll() {
    const assets = this.getRequiredAssets();
    const tasks = assets.map((asset) => {
      return new Promise((resolve, reject) => {
        switch (asset.type) {
          case "json":
            fetch(asset.src).then(res => res.json()).then(data => {
              this.cache.set(asset.name, data);
              resolve();
            }).catch(reject);
            break;
          case "gltf":
            this.gltfLoader.load(asset.src, (gltf) => {
              this.cache.set(asset.name, gltf);
              resolve();
            }, undefined, reject);
            break;
          case "texture":
            this.textureLoader.load(asset.src, (tex) => {
              this.cache.set(asset.name, tex);
              resolve();
            }, undefined, reject);
            break;
          case "cube":
            this.cubeTextureLoader.load(asset.src, (cube) => {
              this.cache.set(asset.name, cube);
              resolve();
            }, undefined, reject);
            break;
        }
      });
    });

    await Promise.all(tasks);
    return this.cache;
  }
}
