/**
 * Vanilla Three.js port of the asset loader and model components from main.js.
 *
 * Original locations:
 *   - Asset pipeline: ~11998–12065 (Fi, Mm, vS, Yn, rn, ri)
 *   - Asset manifest: uS() ~11041
 *   - BaseModel (Zg / BT): ~31058
 *   - FloatModel (VT / WT + drei Float _v): ~31100
 *
 * GLTF structure expected by the site:
 *   cache.get("uprising.model") → GLTF { scene, animations, ... }
 *   scene.children[0]           → root mesh node (geometry + optional transform)
 *   BaseModel uses ONLY .geometry on a new <mesh> at the scene origin.
 */

import {
  aO as LoadingManager,
  s as TextureLoader,
  a$ as CubeTextureLoader,
  f as Mesh,
  G as MeshStandardMaterial,
  W as Group,
  j as Color,
  Y as MathUtils,
} from "./three.js";
import { D as DRACOLoader, G as GLTFLoader } from "./three-stdlib.js";

// ---------------------------------------------------------------------------
// Paths — mirrors _a, aS, cn, ir in main.js (~11028)
// ---------------------------------------------------------------------------

const BASE = "/";
const DATA = `${BASE}data/`;
const ASSETS = `${BASE}assets/`;
const MODELS = `${ASSETS}models/`;
const TEXTURES = `${ASSETS}textures/`;

/** Google-hosted Draco decoder (main.js cS). */
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/v1/decoders/";

export const AssetType = {
  TEXTURE: "texture",
  JSON: "json",
  GLTF: "gltf",
  CUBE: "cube",
  LUT: "lut",
};

// ---------------------------------------------------------------------------
// Asset manifest — mirrors uS() in main.js (~11041)
// ---------------------------------------------------------------------------

/**
 * Full preload list. GLTF entries use DRACO-compressed meshes under /assets/models/.
 * The `name` field is the cache key used by components (`geometry: "uprising.model"`).
 */
export function getAssetManifest() {
  return [
    { name: "config", type: AssetType.JSON, src: `${DATA}config.json` },
    { name: "plane.model", type: AssetType.GLTF, src: `${MODELS}surface-plane.glb` },
    { name: "uprising.model", type: AssetType.GLTF, src: `${MODELS}uprising/uprising.glb` },
    {
      name: "uprising.portal",
      type: AssetType.GLTF,
      src: `${MODELS}uprising/uprising-light-reference.gltf`,
    },
    { name: "ufl.model", type: AssetType.GLTF, src: `${MODELS}ufl/ufl.glb` },
    { name: "ufl.portal", type: AssetType.GLTF, src: `${MODELS}ufl/ufl-panels.glb` },
    { name: "boombloom.model", type: AssetType.GLTF, src: `${MODELS}boom-bloom/boombloom.glb` },
    {
      name: "boombloom.portal",
      type: AssetType.GLTF,
      src: `${MODELS}boom-bloom/boombloom-panels.glb`,
    },
    { name: "doublepoint.model", type: AssetType.GLTF, src: `${MODELS}doublepoint/doublepoint.glb` },
    {
      name: "doublepoint.portal",
      type: AssetType.GLTF,
      src: `${MODELS}doublepoint/doublepoint-panels.glb`,
    },
    { name: "seacat.model", type: AssetType.GLTF, src: `${MODELS}seacat/seacat.glb` },
    { name: "seacat.portal", type: AssetType.GLTF, src: `${MODELS}seacat/seacat-panels.glb` },
    {
      name: "planetfarms.model",
      type: AssetType.GLTF,
      src: `${MODELS}planet-farms/planet-farms.glb`,
    },
    {
      name: "planetfarms.portal",
      type: AssetType.GLTF,
      src: `${MODELS}planet-farms/planet-farms-panels.glb`,
    },
    { name: "mariacallas.model", type: AssetType.GLTF, src: `${MODELS}maria-callas/callas.glb` },
    {
      name: "mariacallas.portal",
      type: AssetType.GLTF,
      src: `${MODELS}maria-callas/callas-panels.glb`,
    },
    { name: "oropress.model", type: AssetType.GLTF, src: `${MODELS}oropress/oropress.glb` },
    { name: "oropress.portal", type: AssetType.GLTF, src: `${MODELS}oropress/oropress-panels.glb` },
    { name: "igoodi.model", type: AssetType.GLTF, src: `${MODELS}igoodi/igoodi.glb` },
    { name: "igoodi.portal", type: AssetType.GLTF, src: `${MODELS}igoodi/igoodi-panels.glb` },
    { name: "mausoleum.model", type: AssetType.GLTF, src: `${MODELS}mausoleum/mausoleum.glb` },
    {
      name: "mausoleum.portal",
      type: AssetType.GLTF,
      src: `${MODELS}mausoleum/mausoleum-panels.glb`,
    },
    { name: "underground.model", type: AssetType.GLTF, src: `${MODELS}about/glb/about.glb` },
    { name: "leaf", type: AssetType.TEXTURE, src: `${TEXTURES}leaf.png` },
    { name: "noise", type: AssetType.TEXTURE, src: `${TEXTURES}noise.png` },
    { name: "normal", type: AssetType.TEXTURE, src: `${TEXTURES}normal-map.jpg` },
    { name: "pattern", type: AssetType.TEXTURE, src: `${TEXTURES}pattern.png` },
    { name: "spark", type: AssetType.TEXTURE, src: `${TEXTURES}spark.jpg` },
    {
      name: "cube",
      type: AssetType.CUBE,
      src: [
        `${TEXTURES}cube160/px.png`,
        `${TEXTURES}cube160/nx.png`,
        `${TEXTURES}cube160/py.png`,
        `${TEXTURES}cube160/ny.png`,
        `${TEXTURES}cube160/pz.png`,
        `${TEXTURES}cube160/nz.png`,
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Config $ref resolution — mirrors Np / dS / pS (~11176)
// ---------------------------------------------------------------------------

function resolveRef(ref, settings) {
  if (!ref || !ref.$ref) return ref ?? {};
  const path = ref.$ref.split(".");
  let base = { settings };
  for (const key of path) base = base[key];
  return { ...base, ...ref.extend };
}

/** Expand raw config.json into runtime scene definitions. */
export function prepareConfig(raw) {
  const { routes, scenes, settings, locale } = raw;
  return {
    routes,
    settings,
    locale,
    scenes: scenes.map(({ uuid, contents, components, builder }) => ({
      uuid,
      builder,
      contents: { ...contents, ...locale?.shared },
      components: components.map(({ settings: s, modifier: m, ...rest }) => ({
        ...rest,
        ...resolveRef(s, settings),
        ...resolveRef(m, settings),
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// AssetLoader — mirrors vS + Yn.load() (~12005)
// ---------------------------------------------------------------------------

/**
 * Central asset cache (Zn store in main.js).
 *
 * Usage:
 *   const loader = new AssetLoader();
 *   await loader.loadAll();
 *   const gltf = loader.get("uprising.model");
 */
export class AssetLoader {
  constructor({ manifest = getAssetManifest(), onProgress } = {}) {
    this.manifest = manifest;
    this.cache = new Map();
    this.loaded = false;
    this.loading = false;
    this.progress = 0;
    this.onProgress = onProgress;

    // DRACO — shared decoder, wired into every GLTFLoader (main.js Mm / i1).
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    this.loadingManager = new LoadingManager();
  }

  /** Pick loader by asset type — mirrors vS(). */
  _createLoader(item, manager) {
    switch (item.type) {
      case AssetType.TEXTURE:
        return new TextureLoader(manager);
      case AssetType.JSON:
        return null; // fetched below
      case AssetType.CUBE:
        return new CubeTextureLoader(manager);
      case AssetType.GLTF: {
        const gltf = new GLTFLoader(manager);
        gltf.setDRACOLoader(this.dracoLoader);
        return gltf;
      }
      default:
        return null;
    }
  }

  loadAll() {
    if (this.loaded) return Promise.resolve(this.cache);
    if (this.loading) {
      return new Promise((resolve) => {
        const check = () => (this.loaded ? resolve(this.cache) : setTimeout(check, 50));
        check();
      });
    }

    this.loading = true;

    return new Promise((resolve) => {
      const manager = new LoadingManager();
      manager.onStart = () => {
        this.loading = true;
        this.progress = 0;
      };
      manager.onProgress = (_url, loaded, total) => {
        this.progress = total ? (loaded / total) * 0.9 : 0;
        this.onProgress?.(this.progress);
      };
      manager.onLoad = () => {
        this.loading = false;
        this.loaded = true;
        this.progress = 1;
        this.onProgress?.(1);
        resolve(this.cache);
      };

      for (const item of this.manifest) {
        const loader = this._createLoader(item, manager);

        if (item.type === AssetType.JSON) {
          fetch(item.src)
            .then((r) => r.json())
            .then((json) => {
              const prepared = prepareConfig(json);
              this.cache.set(item.name, prepared);
              this.cache.set("config", prepared);
            })
            .catch(console.error);
          continue;
        }

        if (!loader) continue;

        loader.load(
          item.src,
          (result) => {
            this.cache.set(item.name, result);
          },
          undefined,
          (err) => console.error(`Failed to load ${item.name}:`, err),
        );
      }
    });
  }

  get(name) {
    return this.cache.get(name);
  }

  getConfig() {
    return this.get("config") || {};
  }
}

// ---------------------------------------------------------------------------
// GLTF accessors — mirrors rn(), ri(), $m() (~12059)
// ---------------------------------------------------------------------------

/**
 * First mesh node inside a GLTF scene.
 * main.js: ri(key) = rn(key).scene.children[0]
 *
 * Most project .glb files export a single child under Scene root with the
 * BufferGeometry. Position/rotation/scale on this node are ignored by BaseModel
 * (only geometry is reused); other components (WatchModel, etc.) copy transforms.
 */
export function getModelRoot(cache, geometryKey) {
  const gltf = cache.get(geometryKey);
  if (!gltf?.scene?.children?.length) {
    throw new Error(`getModelRoot: missing GLTF "${geometryKey}"`);
  }
  return gltf.scene.children[0];
}

/** Deeper child — main.js $m(key) = ri(key).children[0] (skinned rigs). */
export function getModelInner(cache, geometryKey) {
  return getModelRoot(cache, geometryKey).children[0];
}

export function findChildByName(object, name) {
  return object.children.find((c) => c.name === name);
}

// ---------------------------------------------------------------------------
// Material from settings — mirrors meshStandardMaterial props in Zg
// ---------------------------------------------------------------------------

function buildModelMaterial(settings, envMap) {
  return new MeshStandardMaterial({
    color: new Color(settings.color ?? "#333333"),
    emissive: new Color(settings.emissive ?? "#000000"),
    emissiveIntensity: settings.emissiveIntensity ?? 1,
    metalness: settings.metalness ?? 1,
    roughness: settings.roughness ?? 0,
    envMap: envMap ?? null,
    toneMapped: settings.toneMapped ?? true,
  });
}

// ---------------------------------------------------------------------------
// BaseModel — mirrors Zg + BT (~31058)
// ---------------------------------------------------------------------------

/**
 * Static hero model: one mesh using GLTF geometry + MeshStandardMaterial.
 *
 * R3F equivalent:
 *   <mesh name="model" geometry={ri(geometryKey).geometry}>
 *     <meshStandardMaterial envMap={rn(envMapRef)} {...settings} />
 *   </mesh>
 *
 * Placement:
 *   - No position/rotation/scale from the GLTF node is applied.
 *   - The mesh sits at (0,0,0) in the parent scene; GLBs are authored centered.
 *   - Parent scene (per route) is responsible for world placement via camera scroll.
 *
 * @param {object} options
 * @param {Map} options.cache — AssetLoader.cache
 * @param {string} options.geometryKey — e.g. "uprising.model"
 * @param {object} options.settings — color, emissive, metalness, envMapRef, etc.
 * @returns {Mesh}
 */
export function createBaseModel({ cache, geometryKey, settings }) {
  const root = getModelRoot(cache, geometryKey);
  const envMap = settings.envMapRef ? cache.get(settings.envMapRef) : null;
  const material = buildModelMaterial(settings, envMap);

  const mesh = new Mesh(root.geometry, material);
  mesh.name = "model";

  // Optional: drive emissive from intro timeline (main.js Uf on Zg).
  mesh.userData.applyIntro = (introState) => {
    if (introState?.model?.emissiveIntensity != null) {
      material.emissiveIntensity = introState.model.emissiveIntensity;
    }
    if (introState?.model?.emissive) {
      material.emissive.set(introState.model.emissive);
    }
  };

  return mesh;
}

// ---------------------------------------------------------------------------
// Float wrapper — mirrors drei Float (_v / gg) in react-fiber.js (~13666)
// ---------------------------------------------------------------------------

/**
 * Gentle idle motion applied to a model group.
 *
 * R3F:
 *   <Float speed rotationIntensity floatIntensity floatingRange={[min,max]}>
 *     <BaseModel ... />
 *   </Float>
 *
 * Animation (per frame, when enabled):
 *   rotation.x/y/z = sin/cos waves from elapsed time * speed
 *   position.y     = mapLinear(sin wave, -0.1..0.1, floatingRange) * floatIntensity
 */
export class FloatAnimator {
  constructor({
    speed = 1,
    rotationIntensity = 1,
    floatIntensity = 1,
    floatingRange = [-0.1, 0.1],
    enabled = true,
  } = {}) {
    this.speed = speed;
    this.rotationIntensity = rotationIntensity;
    this.floatIntensity = floatIntensity;
    this.floatingRange = floatingRange;
    this.enabled = enabled;
    this._phase = Math.random() * 10000;
  }

  update(group, elapsed) {
    if (!this.enabled || this.speed === 0) return;

    const t = this._phase + elapsed;
    group.rotation.x = (Math.cos((t / 4) * this.speed) / 8) * this.rotationIntensity;
    group.rotation.y = (Math.sin((t / 4) * this.speed) / 8) * this.rotationIntensity;
    group.rotation.z = (Math.sin((t / 4) * this.speed) / 20) * this.rotationIntensity;

    let y = Math.sin((t / 4) * this.speed) / 10;
    y = MathUtils.mapLinear(
      y,
      -0.1,
      0.1,
      this.floatingRange[0],
      this.floatingRange[1],
    );
    group.position.y = y * this.floatIntensity;
    group.updateMatrix();
  }
}

// ---------------------------------------------------------------------------
// FloatModel — mirrors VT + WT (~31100)
// ---------------------------------------------------------------------------

/**
 * BaseModel wrapped in a floating group.
 *
 * Config example (seacat scene):
 *   { "name": "FloatModel", "geometry": "seacat.model",
 *     "settings": { "$ref": "settings.model" },
 *     "modifier": { "$ref": "settings.float" } }
 *
 * After prepareConfig(), settings and float params are merged on the component.
 *
 * @returns {{ group: Group, mesh: Mesh, animator: FloatAnimator }}
 */
export function createFloatModel({ cache, geometryKey, settings }) {
  const mesh = createBaseModel({ cache, geometryKey, settings });

  const float = new FloatAnimator({
    speed: settings.speed ?? 2,
    rotationIntensity: settings.rotationIntensity ?? 1,
    floatIntensity: settings.floatIntensity ?? 0.1,
    floatingRange: [
      settings.floatingRangeMin ?? settings.floatingRange?.[0] ?? 1,
      settings.floatingRangeMax ?? settings.floatingRange?.[1] ?? 2,
    ],
  });

  // Float uses matrixAutoUpdate: false on inner group; outer group holds ref.
  const inner = new Group();
  inner.matrixAutoUpdate = false;
  inner.add(mesh);

  const group = new Group();
  group.name = "FloatModel";
  group.add(inner);

  return { group, mesh, animator: float, inner };
}

// ---------------------------------------------------------------------------
// Scene assembly — wire components from config into a Three.Scene
// ---------------------------------------------------------------------------

/**
 * Instantiate known model components for one config scene entry.
 * Called from scene.js populateScene() after assets are loaded.
 */
export function addSceneComponents(threeScene, cache, sceneDef, hooks = {}) {
  const floatAnimators = [];

  for (const comp of sceneDef.components) {
    if (comp.name === "BaseModel" && comp.geometry) {
      const mesh = createBaseModel({
        cache,
        geometryKey: comp.geometry,
        settings: comp,
      });
      threeScene.add(mesh);
      hooks.onBaseModel?.(mesh, comp);
    }

    if (comp.name === "FloatModel" && comp.geometry) {
      const { group, mesh, animator, inner } = createFloatModel({
        cache,
        geometryKey: comp.geometry,
        settings: comp,
      });
      threeScene.add(group);
      floatAnimators.push({ inner, animator });
      hooks.onFloatModel?.(mesh, group, comp);
    }

    // Other components (Ground, Portal, Fog, …) remain in main.js for now.
  }

  return {
    /** Call each frame with elapsed time from clock.getElapsedTime(). */
    updateFloats(elapsed) {
      for (const { inner, animator } of floatAnimators) {
        animator.update(inner, elapsed);
      }
    },
    floatAnimators,
  };
}
