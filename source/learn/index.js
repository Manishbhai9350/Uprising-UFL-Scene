/**
 * Main Application Index.
 * Orchestrates the extracted systems for UFL and Home.
 */

import { Stage } from '../src/scene.js';
import { AssetLoader, ri } from './ModelLoader.js';
import { PortalLighting, setEnvironment } from './lighting.js';
import { createTransitionMaterial } from './transition.js';
import { FluidSimulation } from './fluidSim.js';

export async function main() {
  const container = document.getElementById("canvas-container");
  
  // 1. Load Assets
  const loader = new AssetLoader();
  const cache = await loader.loadAll();
  const config = loader.getConfig();

  // 2. Setup Stage
  const stage = new Stage({
    container,
    sceneConfigs: config.scenes,
    settings: config.settings
  });

  // 3. Init Fluid Simulation
  const fluid = new FluidSimulation(stage.renderer);

  // 4. Initialize Scenes
  config.scenes.forEach((sceneDef, index) => {
    // Only handle scope: Home (uprising) and UFL
    if (sceneDef.uuid === 'uprising' || sceneDef.uuid === 'ufl') {
      stage.composer.populateScene(index, (scene) => {
        // Apply lighting
        new PortalLighting(scene, sceneDef.contents.portal);
        setEnvironment(scene, cache.get('cube'));
        
        // Add model
        const model = ri(sceneDef.uuid + '.model', cache);
        if (model) scene.add(model);
      });
    }
  });

  // 5. Connect Transition Logic
  stage.composer.transitionMaterial = createTransitionMaterial(
    cache.get('noise'),
    cache.get('pattern')
  );

  stage.start();
}

main();
