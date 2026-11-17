import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/Addons.js";
import { Pane } from "tweakpane";

export function setupLights(scene: THREE.Scene) {
  RectAreaLightUniformsLib.init();

  const params = {
    width: 1.04,
    height: 2.52,
    intensity: 4,
    color: "#ffffff",
  };

  const rectLight = new THREE.RectAreaLight(params.color, params.intensity, params.width, params.height);
  rectLight.position.set(0, params.height / 2 - 0.4, 0);
  rectLight.lookAt(0, params.height / 2 - 0.4, 1);

  scene.add(rectLight);

  function addPane(pane: Pane) {
    const folder = pane.addFolder({ title: "Rect Area Light" });

    folder.addBinding(params, "intensity", { min: 0, max: 20, step: 0.1 }).on("change", (ev) => {
      rectLight.intensity = ev.value;
    });

    folder.addBinding(params, "width", { min: 0.1, max: 5, step: 0.05 }).on("change", (ev) => {
      rectLight.width = ev.value;
    });

    folder.addBinding(params, "height", { min: 0.1, max: 5, step: 0.05 }).on("change", (ev) => {
      rectLight.height = ev.value;
    });

    folder.addBinding(params, "color").on("change", (ev) => {
      rectLight.color.set(ev.value);
    });
  }

  return { rectLight, addPane };
}