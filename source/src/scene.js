/**
 * Vanilla Three.js extraction of the R3F Stage (y4) and Composer (v4) from main.js.
 *
 * Original React structure:
 *   x4 (app root)
 *     └── y4 (Stage) — <Canvas> wrapper
 *           ├── d3 — resize handler
 *           ├── <color attach="background" args={["#000000"]} />
 *           ├── LS — camera rig (after assets load)
 *           └── v4 — multi-scene composer + postprocessing
 *
 * This file mirrors that setup without React or R3F.
 */

import {
  aT as WebGLRenderer,
  ba as WebGL1Renderer,
  aM as Scene,
  X as PerspectiveCamera,
  j as Color,
  az as WebGLRenderTarget,
  w as LinearFilter,
  aw as HalfFloatType,
  a6 as ClampToEdgeWrapping,
  a7 as RepeatWrapping,
  V as Vector3,
  Y as MathUtils,
} from "./three.js";
import { AssetLoader, addSceneComponents } from "./models.js";

// ---------------------------------------------------------------------------
// Constants (from main.js)
// ---------------------------------------------------------------------------

/** Max internal draw-buffer area (1920 × 1080). Used by Am() / computeDrawBufferSize. */
const MAX_PIXEL_BUDGET = 1920 * 1080;

/** Scene background — `<color attach="background" args={["#000000"]} />` in y4. */
const BACKGROUND_COLOR = 0x000000;

/** Default camera rest position: Vector3(0, 0, 4.3) + mobile Y offset. */
const MOBILE_Y_OFFSET = () => (window.innerWidth < 768 ? -0.25 : 0);
const DEFAULT_CAMERA_POSITION = () =>
  new Vector3(0, 0, 4.3).add(new Vector3(0, MOBILE_Y_OFFSET(), 0));

// ---------------------------------------------------------------------------
// DeviceCapabilities — mirrors Da() in main.js (~12877)
// ---------------------------------------------------------------------------

/**
 * Adaptive rendering flags derived from device / GPU tier.
 * - iOS phones get WebGL1, DPR 1.5, no postprocessing, 0 MSAA samples.
 * - Desktop WebGL2 + tier > 1 gets 8 MSAA samples on render targets.
 */
export function getDeviceCapabilities(options = {}) {
  const { isIosPhone = detectIosPhone(), hasWebGL2 = true, gpuTier = 1 } =
    options;

  return {
    /** DPR clamp: 1.5 on iOS phone, 1 elsewhere. R3F: dpr={[1, getDPR()]}. */
    getDPR: () => (isIosPhone ? 1.5 : 1),

    /** Use WebGL1Renderer fallback on iOS phones. */
    needsWebGL1: () => isIosPhone,

    /** Postprocessing disabled on iOS phones. */
    needsPostprocessing: () => !isIosPhone,

    /** MSAA sample count for transition render targets (0 or 8). */
    getSamples: () => (!isIosPhone && hasWebGL2 && gpuTier > 1 ? 8 : 0),
  };
}

function detectIosPhone() {
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isPhone = window.innerWidth < 768;
  return isIos && isPhone;
}

// ---------------------------------------------------------------------------
// computeDrawBufferSize — mirrors Am() in main.js (~12237)
// ---------------------------------------------------------------------------

/**
 * Scale viewport by DPR but cap total pixel count at MAX_PIXEL_BUDGET.
 * R3F d3 calls setSize(width, height, false) with these values.
 */
export function computeDrawBufferSize(width, height, dpr = 1) {
  let w = width * dpr;
  let h = height * dpr;

  if (w * h > MAX_PIXEL_BUDGET) {
    const aspect = w / h;
    h = Math.sqrt(MAX_PIXEL_BUDGET / aspect);
    w = Math.ceil(h * aspect);
    h = Math.ceil(h);
  }

  return { width: w, height: h };
}

// ---------------------------------------------------------------------------
// createRenderer — mirrors y4 Canvas `gl` prop (~32957)
// ---------------------------------------------------------------------------

/**
 * Create the WebGL renderer with the same options as the R3F Stage.
 *
 * Desktop (WebGL2):
 *   powerPreference: "default"
 *   autoClear: false
 *   antialias: false
 *   stencil: false
 *   depth: false
 *
 * iOS phone fallback uses WebGL1Renderer with the same flags except autoClear
 * defaults to true on WebGL1.
 */
export function createRenderer(canvas, capabilities) {
  const common = {
    canvas,
    powerPreference: "default",
    antialias: false,
    stencil: false,
    depth: false,
  };

  if (capabilities.needsWebGL1()) {
    return new WebGL1Renderer(common);
  }

  const renderer = new WebGLRenderer(common);
  renderer.autoClear = false; // R3F passes this only for WebGL2 path
  return renderer;
}

// ---------------------------------------------------------------------------
// ResizeManager — mirrors d3 component (~27844)
// ---------------------------------------------------------------------------

/**
 * Keeps the renderer draw-buffer size in sync with the window.
 * R3F d3 reads size from the fiber store; here we use window dimensions.
 */
export class ResizeManager {
  constructor(renderer, getDPR) {
    this.renderer = renderer;
    this.getDPR = getDPR;
    this._onResize = this._onResize.bind(this);
  }

  attach() {
    window.addEventListener("resize", this._onResize);
    this._onResize();
  }

  detach() {
    window.removeEventListener("resize", this._onResize);
  }

  _onResize() {
    const dpr = this.getDPR();
    const { width, height } = computeDrawBufferSize(
      window.innerWidth,
      window.innerHeight,
      dpr,
    );
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(1); // DPR is baked into width/height above
  }

  getSize() {
    return {
      width: this.renderer.domElement.width,
      height: this.renderer.domElement.height,
    };
  }
}

// ---------------------------------------------------------------------------
// CameraRig — simplified from LS / OS / jS (~13242)
// ---------------------------------------------------------------------------

/**
 * Perspective camera with config-driven FOV/near/far.
 * Full OS component also drives position from GSAP intro, scroll, and mouse —
 * hook those updates into update() each frame.
 */
export class CameraRig {
  constructor(settings = {}) {
    const { near = 0.01, far = 10, fov = { mobile: [55, 375], desktop: [40, 1440] } } =
      settings;

    this.camera = new PerspectiveCamera(
      this._resolveFov(fov),
      window.innerWidth / window.innerHeight,
      near,
      far,
    );

    this.camera.position.copy(DEFAULT_CAMERA_POSITION());
    this.camera.lookAt(0, 0, 0);
  }

  /** Responsive FOV lerp — mirrors FS() in main.js. */
  _resolveFov(fov) {
    const mobile = fov.mobile ?? [55, 375];
    const desktop = fov.desktop ?? [40, 1440];
    const vw = Math.min(Math.max(window.innerWidth, desktop[1]), desktop[1]);
    const t = (vw - desktop[1]) / (desktop[1] - desktop[0] || 1);
    const range = mobile[1] - mobile[0];
    return Math.round(mobile[0] + t * range);
  }

  onResize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Call each frame after animation systems update camera transform. */
  update(/* delta */) {
    // In main.js, OS useFrame drives position/lookAt from intro, hover,
    // leafMotionValue, reelMotionValue, cameraMotionValue, and mouse parallax.
  }
}

// ---------------------------------------------------------------------------
// TransitionRenderTargets — mirrors zp() (~12246)
// ---------------------------------------------------------------------------

/**
 * Pair of ping-pong WebGLRenderTargets used during scene crossfades.
 * v4 creates two of these (g and v) with HalfFloatType textures.
 */
export function createTransitionTarget(capabilities) {
  const target = new WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    type: HalfFloatType,
    wrapS: ClampToEdgeWrapping,
    wrapT: RepeatWrapping,
    generateMipmaps: false,
    samples: capabilities.getSamples(),
  });

  const resize = () => {
    const { width, height } = computeDrawBufferSize(
      window.innerWidth,
      window.innerHeight,
    );
    target.setSize(width, height);
  };

  window.addEventListener("resize", resize);
  resize();

  return {
    target,
    dispose: () => {
      window.removeEventListener("resize", resize);
      target.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// MultiSceneComposer — mirrors v4 (~32725)
// ---------------------------------------------------------------------------

/**
 * Manages N content scenes plus a transition overlay scene and postprocessing.
 *
 * Architecture (from v4 JSX):
 *   scenes[N]  ← R3F createPortal mounts g4 scene components into each Scene
 *   empty Scene()
 *   transitionScene ← fullscreen TransitionShaderMaterial plane (g3)
 *   EffectComposer (Z3) ← bloom, fluid, LUT, etc.
 *
 * Each frame (useFrame in v4):
 *   1. Read scroll motion value → prev/next scene indices
 *   2. If same index → EffectComposer.render(activeScene)
 *   3. If transitioning → render both scenes to ping-pong RTs, blend via
 *      transition material, then EffectComposer.render(transitionScene)
 *   4. Toggle userData.active on scene children for GPU savings
 */
export class MultiSceneComposer {
  constructor({ renderer, camera, sceneConfigs = [], effectSettings = {}, capabilities }) {
    this.renderer = renderer;
    this.camera = camera;
    this.capabilities = capabilities;

    // One Three.js Scene per config entry (13 in config.json).
    this.scenes = sceneConfigs.map(() => new Scene());

    // Empty scene + transition overlay scene (g3 fullscreen quad).
    this.emptyScene = new Scene();
    this.transitionScene = new Scene();
    this.transitionMaterial = null; // TransitionShaderMaterial — see main.js g3/m3

    // Ping-pong render targets for crossfade.
    this.rtA = createTransitionTarget(capabilities);
    this.rtB = createTransitionTarget(capabilities);
    this._rtFlip = true;

    // Postprocessing — Z3 EffectComposer with bloom, fluid, LUT, etc.
    this.effectComposer = null; // set via setEffectComposer()

    // Motion / transition state (driven by _r() motion store in main.js).
    this.motion = {
      value: 0,
      velocity: 0,
      getNextIndex: (v) => Math.ceil(v),
      getPrevIndex: (v) => Math.floor(v),
      getDirection: () => 1,
      needsUnderground: () => false,
      needsUpperground: () => false,
      needsShowreel: () => false,
      cameraMotionValue: { isAnimating: () => false, get: () => 0 },
      leafMotionValue: { isAnimating: () => false },
      reelMotionValue: { isAnimating: () => false },
    };

    this._prevIndex = 0;
    this._nextIndex = 0;
    this._forceSwap = false;
    this._compiled = false;

    this._buildTransitionQuad();
  }

  /** Fullscreen 2×2 plane with TransitionShaderMaterial (g3). */
  _buildTransitionQuad() {
    // In main.js: PlaneGeometry(2,2) + transitionShaderMaterial with
    // uScene0, uScene1, uNoise, uPattern, uTransition, uVelocity, etc.
    // Placeholder — wire up ShaderMaterial from main.js m3/h3 when porting.
  }

  /**
   * Populate scene content. In R3F this is g4 → h4 component registry.
   * buildFn may return a controller (e.g. float animators) from addSceneComponents.
   */
  populateScene(index, buildFn) {
    if (!buildFn) return;
    return buildFn(this.scenes[index]);
  }

  /**
   * Activate scene(s) for rendering — mirrors T() callback in v4.
   * Only active scene subtrees update in useFrame loops (userData.active).
   */
  setActiveScenes(indices) {
    const isPair = indices.length === 2 && indices[1] !== undefined;
    this.scenes.forEach((scene, i) => {
      const active = isPair ? i === indices[0] || i === indices[1] : i === indices[0];
      scene.traverse((obj) => {
        obj.userData.active = active;
      });
    });
  }

  setEffectComposer(composer) {
    this.effectComposer = composer;
  }

  markCompiled() {
    this._compiled = true;
  }

  /**
   * Shader compile warmup — mirrors m4 (~32694).
   * R3F calls gl.compile(scene, camera) on every scene with all children active.
   */
  compileShaders(onComplete) {
    console.time("compile");
    this.scenes.forEach((scene) => {
      scene.traverse((obj) => {
        obj.userData.active = true;
      });
      this.renderer.compile(scene, this.camera);
    });
    console.timeEnd("compile");
    setTimeout(onComplete, 300);
  }

  /** Main render loop body — mirrors v4 useFrame (~32785). */
  render(delta) {
    if (!this._compiled || !this.effectComposer) return;

    const motion = this.motion.value;
    const nextIdx = this.motion.getNextIndex(motion);
    const prevIdx = this.motion.getPrevIndex(motion);
    const sceneA = this.scenes[nextIdx];
    const sceneB = this.scenes[prevIdx];

    const skipTransition =
      (this.motion.needsUnderground() && !this.motion.cameraMotionValue.isAnimating()) ||
      (this.motion.needsUpperground() && !this.motion.leafMotionValue.isAnimating()) ||
      (this.motion.needsShowreel() && !this.motion.reelMotionValue.isAnimating());

    if (skipTransition) {
      this.effectComposer.render(sceneB);
    } else if (nextIdx === prevIdx) {
      this.effectComposer.render(sceneA);
    } else {
      this._renderTransition(sceneA, sceneB, nextIdx, prevIdx, delta);
    }

    this._prevIndex = nextIdx;
    this._nextIndex = prevIdx;
  }

  _renderTransition(sceneA, sceneB, nextIdx, prevIdx, delta) {
    const rtWrite = this._rtFlip ? this.rtA.target : this.rtB.target;
    const rtRead = this._rtFlip ? this.rtB.target : this.rtA.target;
    const direction = this.motion.getDirection();

    if (
      nextIdx !== this._prevIndex ||
      prevIdx !== this._nextIndex ||
      this._forceSwap
    ) {
      this._forceSwap = false;
      this.setActiveScenes([nextIdx, prevIdx]);

      const renderFirst = this._shouldRenderBFirst(direction);
      const first = renderFirst ? sceneB : sceneA;
      const second = renderFirst ? sceneA : sceneB;

      this.renderer.setRenderTarget(renderFirst === sceneB ? this.rtA.target : this.rtB.target);
      this.renderer.clear();
      this.renderer.render(first, this.camera);

      this.renderer.setRenderTarget(renderFirst === sceneB ? this.rtB.target : this.rtA.target);
      this.renderer.clear();
      this.renderer.render(second, this.camera);
    } else {
      const active = this._rtFlip ? sceneB : sceneA;
      this.renderer.setRenderTarget(rtWrite);
      this.renderer.clear();
      this.renderer.render(active, this.camera);
    }

    this.renderer.setRenderTarget(null);
    this._rtFlip = !this._rtFlip;

    // Feed blended textures into transition material uniforms.
    if (this.transitionMaterial) {
      this.transitionMaterial.uniforms.uScene0.value = this.rtA.target.texture;
      this.transitionMaterial.uniforms.uScene1.value = this.rtB.target.texture;
      this.transitionMaterial.uniforms.uVelocity.value = MathUtils.lerp(
        this.transitionMaterial.uniforms.uVelocity.value,
        this.motion.velocity,
        delta * 10,
      );
    }

    this.effectComposer.render(this.transitionScene);
  }

  _shouldRenderBFirst(direction) {
    const m = this.motion;
    if (m.needsUnderground() || m.needsUpperground() || m.needsShowreel()) {
      return direction < 0;
    }
    return direction > 0;
  }

  dispose() {
    this.rtA.dispose();
    this.rtB.dispose();
    this.scenes.forEach((s) => {
      s.traverse((obj) => {
        obj.geometry?.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Stage — mirrors y4 (~32951)
// ---------------------------------------------------------------------------

/**
 * Top-level WebGL stage: renderer, background, resize, camera, composer.
 * Equivalent to the R3F `<Canvas>` in y4.
 */
export class Stage {
  constructor({ container, sceneConfigs, settings, capabilities, onCompiled }) {
    this.container = container;
    this.capabilities = capabilities ?? getDeviceCapabilities();
    this.onCompiled = onCompiled ?? (() => {});

    // Canvas sits absolute full-viewport behind DOM UI (z-index 0).
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.zIndex = "0";
    container.appendChild(this.canvas);

    // KTX2 transcoder init — main.js: u.useMemo(() => a1.init(), [])
    // import { R as KTX2Loader } from './three-stdlib.js'; KTX2Loader.init();

    this.renderer = createRenderer(this.canvas, this.capabilities);
    this.renderer.setClearColor(new Color(BACKGROUND_COLOR), 1);

    this.resizeManager = new ResizeManager(this.renderer, () =>
      this.capabilities.getDPR(),
    );
    this.cameraRig = new CameraRig(settings?.camera);
    this.composer = new MultiSceneComposer({
      renderer: this.renderer,
      camera: this.cameraRig.camera,
      sceneConfigs,
      effectSettings: settings?.effects,
      capabilities: this.capabilities,
    });

    this._raf = null;
    this._clock = { last: 0, elapsed: 0 };
    this._sceneControllers = [];
  }

  /** Call after assets are loaded — main.js gates on Yn.loaded. */
  start() {
    this.resizeManager.attach();

    this.composer.compileShaders(() => {
      this.composer.markCompiled();
      this.onCompiled();
    });

    this._clock.last = performance.now();
    this._clock.elapsed = 0;
    const tick = (now) => {
      this._raf = requestAnimationFrame(tick);
      const delta = (now - this._clock.last) / 1000;
      this._clock.last = now;
      this._clock.elapsed += delta;

      this.cameraRig.update(delta);
      for (const ctrl of this._sceneControllers) {
        ctrl.updateFloats?.(this._clock.elapsed);
      }
      this.composer.render(delta);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this.resizeManager.detach();
    this.composer.dispose();
    this.renderer.dispose();
  }
}

// ---------------------------------------------------------------------------
// initApp — mirrors x4 app root (~32984)
// ---------------------------------------------------------------------------

/**
 * App entry point equivalent to x4.
 *
 * x4 wraps y4 (Stage) alongside DOM overlays:
 *   f3 — loading progress animation
 *   u3 — SVG sprite sheet
 *   c3 — (UI chrome)
 *   Av — React Router
 *   bm — Leva debug panel
 *
 * Only the Stage / WebGL layer is recreated here; DOM overlays stay in HTML/React.
 */
export async function initApp(options = {}) {
  const container =
    options.container ??
    document.querySelector("#root > div") ??
    document.getElementById("webgl-root");

  if (!container) {
    throw new Error("initApp: no WebGL container element found");
  }

  const assetLoader = options.assetLoader ?? new AssetLoader({ onProgress: options.onProgress });
  await assetLoader.loadAll();

  const config = assetLoader.getConfig();
  const capabilities = getDeviceCapabilities(options.device);

  const stage = new Stage({
    container,
    sceneConfigs: config.scenes,
    settings: config.settings,
    capabilities,
    onCompiled: options.onCompiled,
  });

  // Populate each scene (g4 → h4); BaseModel / FloatModel via models.js.
  config.scenes.forEach((sceneDef, index) => {
    const controller = stage.composer.populateScene(index, (scene) => {
      scene.name = sceneDef.uuid;
      return addSceneComponents(scene, assetLoader.cache, sceneDef);
    });
    if (controller) stage._sceneControllers.push(controller);
  });

  stage.start();
  return stage;
}
