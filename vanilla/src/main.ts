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

// Setup Canvas & Core
const canvas = document.querySelector("canvas")!;
const { renderer, camera } = createRenderer(canvas);
const scene = new THREE.Scene();
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
const { reflector, normalMap, update:UpdateFloor } = setupFloor(scene, textureLoader);


let uflMixer: THREE.AnimationMixer | null = null;
const { panelMaterial } = loadModels(scene, loadingManager, (mixer) => {
  uflMixer = mixer;
});



// Postprocessing
const { composer, bloomCore, grain } = await setupComposer(renderer, scene, camera);

// Tweakpane UI Setup (Optional Debugging)
const pane = new Pane();
pane.hidden = true; // Toggle as needed

// Animation Loop
let lastTime = clock.getElapsedTime();

function animate() {
  const time = clock.getElapsedTime();
  const deltaTime = time - lastTime;
  lastTime = time;

  if (uflMixer) {
    uflMixer.update(deltaTime);
  }

  Smoke.Update(deltaTime);
  UpdateFloor(deltaTime)

  composer.render(deltaTime);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);