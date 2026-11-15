import * as THREE from "three";
import "./style.css";
import { Pane } from "tweakpane";
import {
  DRACOLoader,
  GLTFLoader,
  OrbitControls,
  RectAreaLightHelper,
  RectAreaLightUniformsLib,
  Reflector,
} from "three/examples/jsm/Addons.js";
import { Tab } from "three/examples/jsm/inspector/ui/Tab.js";
import {
  EffectComposer,
  RenderPass,
  BloomEffect,
  EffectPass,
  VignetteEffect,
  ToneMappingEffect,
  ToneMappingMode,
  KernelSize,
  NoiseEffect,
  BlendFunction,
} from "postprocessing";

// import {
//   EffectComposer,
//   ShaderPass,
//   BloomEffect,
//   RenderPass,
// } from "postprocessing";

const canvas = document.querySelector("canvas")!;

const pane = new Pane();

canvas.width = innerWidth;
canvas.height = innerHeight;

RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setClearColor(0x000000);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const camera = new THREE.PerspectiveCamera(
  55,
  innerWidth / innerHeight,
  1,
  1000,
);
camera.position.set(0, 0.2, 5);

scene.add(camera);

const Manager = new THREE.LoadingManager();
const DRACO = new DRACOLoader(Manager);
const Tex = new THREE.TextureLoader(Manager);
const GLB = new GLTFLoader(Manager);

DRACO.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
GLB.setDRACOLoader(DRACO);

const PanelMaterial = new THREE.MeshStandardMaterial({
  color: "#0e9cff",
  emissive: "#69d0ff",
  emissiveIntensity: 6.5,
  roughness: 1,
  metalness: 0,
  toneMapped: false,
  // blending: THREE.AdditiveBlending
});

pane.addBinding(PanelMaterial, "color", {
  label: "Panel Color",
  color: { type: "float" },
});
pane.addBinding(PanelMaterial, "emissive", {
  label: "Panel Emissive",
  color: { type: "float" },
});
pane.addBinding(PanelMaterial, "emissiveIntensity", {
  label: "Panel Emissive Intensity",
  min: 0,
  max: 10,
});

let uflMixer = null;

// anim.clipAction()

GLB.load("/models/ufl-panels.glb", (glb) => {
  const panels = glb.scene;

  panels.scale.setScalar(1.5);

  panels.traverse((node) => {
    if (node.isMesh) {
      node.material = PanelMaterial;
    }
  });

  scene.add(panels);
});
GLB.load("/models/ufl.glb", (glb) => {
  const ufl = glb.scene;
  uflMixer = new THREE.AnimationMixer(ufl);
  const action = uflMixer.clipAction(glb.animations[0]);

  ufl.traverse(n => {
    n.material = new THREE.MeshBasicMaterial({
      color:0x000000,
      // roughness:1,
      // metalness:0
    })
  })

  action.play();
  scene.add(ufl);
});

const NormalMap = Tex.load("/textures/normal-map.jpg");

NormalMap.colorSpace = THREE.NoColorSpace;
NormalMap.wrapS = NormalMap.wrapT = THREE.RepeatWrapping;
NormalMap.repeat.set(2, 2);


const reflector = new Reflector(new THREE.PlaneGeometry(10, 10), {
  
});



reflector.rotation.x = -Math.PI / 2;
reflector.position.y = -0.4;

const refDebug = {
  repeat: 5,
  scale: 0.01,
};

const refFolder = pane.addFolder({ title: "Reflector Params" });

refFolder
  .addBinding(refDebug, "repeat", {
    min: 1,
    max: 10,
    label: "Normal Repeat",
  })
  .on("change", ({ value }) => {
    NormalMap.repeat.set(value, value);
    NormalMap.needsUpdate = true;
  });
refFolder
  .addBinding(refDebug, "scale", {
    min: 0,
    max: 0.4,
    label: "Normal Scale",
  })
  .on("change", ({ value }) => {
    reflector.material.uniforms.uNormalScale.value.set(value, value);
  });

// reflector.material = new THREE.MeshBasicMaterial({color:'purple'})

pane.addBinding(reflector.position, "y", {
  max: -0.3,
  min: -0.45,
});

scene.add(reflector);

const width = 1.5;
const height = 3;
const intensity = 10; // Higher intensity often needed for area lights
const rectLight = new THREE.RectAreaLight(0xffffff, intensity, width, height);

// scene.add(new RectAreaLightHelper(rectLight,'red'))

// Position and orient the light
rectLight.position.set(0, height/2 - .4, 0);
rectLight.lookAt(0, height/2 - .4, 1); // Must look at the target object

scene.add(rectLight);

const controls = new OrbitControls(camera, canvas);

// Postprocessing

const composer = new EffectComposer(renderer, {
  frameBufferType: THREE.HalfFloatType,
});
composer.addPass(new RenderPass(scene, camera));

// Dual layer Kawase bloom — same as weareuprising
const bloomCore = new BloomEffect({
  mipmapBlur: true,
  luminanceThreshold: 0.4,
  luminanceSmoothing: 0.5,
  intensity: .45,
  kernelSize: KernelSize.LARGE,
});

const bloomHalo = new BloomEffect({
  mipmapBlur: true,
  luminanceThreshold: 0.3,
  luminanceSmoothing: 0.15,
  intensity: 0.6,
  kernelSize: KernelSize.HUGE,
});

const vignette = new VignetteEffect({
  offset: 0.22,
  darkness: 0.85,
});

// const toneMapping = new ToneMappingEffect({
//   mode: ToneMappingMode.ACES_FILMIC,
// });

const grain = new NoiseEffect({
  blendFunction: BlendFunction.ADD, // additive — brightens, especially in glow areas
  premultiply: false,
});
grain.blendMode.opacity.value = 0.08;

// composer.addPass(new EffectPass(camera,bloomCore))

pane.addBinding(grain.blendMode.opacity, "value", {
  min: 0,
  max: 0.2,
  label: "Grain Opacity",
});

// ── Tweakpane ──────────────────────────────────────────────────────────────

const pp = pane.addFolder({ title: "Postprocessing", expanded: true });

// pp.hidden = true;

// Bloom core
const coreFolder = pp.addFolder({
  title: "Bloom Core (tight)",
  expanded: true,
});
const coreParams = { threshold: 0.9, smoothing: 0.05, intensity: 0.8 };

coreFolder
  .addBinding(coreParams, "threshold", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    bloomCore.luminanceMaterial.threshold = value;
  });
coreFolder
  .addBinding(coreParams, "smoothing", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    bloomCore.luminanceMaterial.smoothing = value;
  });
coreFolder
  .addBinding(coreParams, "intensity", { min: 0, max: 2, step: 0.05 })
  .on("change", ({ value }) => {
    bloomCore.intensity = value;
  });

// Bloom halo
const haloFolder = pp.addFolder({ title: "Bloom Halo (wide)", expanded: true });
const haloParams = { threshold: 0.6, smoothing: 0.1, intensity: 0.4 };

haloFolder.hidden = true;

haloFolder
  .addBinding(haloParams, "threshold", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    bloomHalo.luminanceMaterial.threshold = value;
  });
haloFolder
  .addBinding(haloParams, "smoothing", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    bloomHalo.luminanceMaterial.smoothing = value;
  });
haloFolder
  .addBinding(haloParams, "intensity", { min: 0, max: 5, step: 0.05 })
  .on("change", ({ value }) => {
    bloomHalo.intensity = value;
  });

// Vignette
const vigFolder = pp.addFolder({ title: "Vignette", expanded: false });
const vigParams = { offset: 0.22, darkness: 0.85 };

vigFolder
  .addBinding(vigParams, "offset", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    vignette.offset = value;
  });
vigFolder
  .addBinding(vigParams, "darkness", { min: 0, max: 1, step: 0.01 })
  .on("change", ({ value }) => {
    vignette.darkness = value;
  });

const clock = new THREE.Clock();

let elt = clock.getElapsedTime();

function animate() {
  const time = clock.getElapsedTime();
  const DT = time - elt;
  elt = time;

  reflector.material.uniforms.uTime.value = time;

  if (uflMixer) {
    console.log(DT);
    uflMixer.update(DT);
  }

  composer.render(DT);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

window.addEventListener("resize", resize);
