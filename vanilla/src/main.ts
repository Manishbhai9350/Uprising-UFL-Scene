import * as THREE from "three";
import "./style.css";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Pane } from "tweakpane";
import { createRenderer, setupResize } from "./core/Renderer";
import { setupLights } from "./components/Lights";
import { setupFloor } from "./components/Floor";
import { loadModels } from "./components/Models";
import { setupComposer } from "./postprocessing/Composer";
import { SetupSmoke } from "./components/Smoke";
import { SetupSparkles } from "./components/Sparkle";

// Setup Canvas & Core
const canvas = document.querySelector("canvas")!;
const { renderer, camera } = createRenderer(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color("black")
setupResize(camera, renderer);

const clock = new THREE.Clock();

// Controls
const controls = new OrbitControls(camera, canvas);

// Loaders & Managers
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);

// Scene Components
setupLights(scene);
const Smoke = SetupSmoke(scene,textureLoader,clock, camera);
const { reflector, normalMap, update:UpdateFloor, addPane:FloorPane } = setupFloor(scene, textureLoader);

const Sparkles = SetupSparkles(scene,textureLoader,camera,canvas)


let uflMixer: THREE.AnimationMixer | null = null;
const { panelMaterial, addPane:ModelPane } = loadModels(scene, loadingManager, (mixer) => {
  uflMixer = mixer;
});



// Postprocessing
const { composer,addPane: ComposerPane } = await setupComposer(renderer, scene, camera);

// Tweakpane UI Setup (Optional Debugging)
const pane = new Pane();

pane.hidden = true;

ComposerPane(pane)
FloorPane(pane)
ModelPane(pane)
Smoke.addPane(pane)


// Animation Loop
let lastTime = clock.getElapsedTime();

function animate() {
  const time = clock.getElapsedTime();
  const deltaTime = time - lastTime;
  lastTime = time;

  if (uflMixer) {
    uflMixer.update(deltaTime);
  }

  Sparkles.Update(deltaTime);
  Smoke.Update(deltaTime);
  UpdateFloor(deltaTime)

  // renderer.render(scene,camera)
  composer.render(deltaTime);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);