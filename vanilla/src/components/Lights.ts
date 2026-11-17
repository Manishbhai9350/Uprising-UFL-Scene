import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/Addons.js";

export function setupLights(scene: THREE.Scene) {
  RectAreaLightUniformsLib.init();

  const width = 1.04;
  const height = 2.52;
  const intensity = 4;
  
  const rectLight = new THREE.RectAreaLight(0xffffff, intensity, width, height);
  rectLight.position.set(0, height / 2 - 0.4, 0);
  rectLight.lookAt(0, height / 2 - 0.4, 1);

  scene.add(rectLight);
  return rectLight;
}