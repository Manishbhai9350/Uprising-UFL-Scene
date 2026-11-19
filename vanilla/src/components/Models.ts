import * as THREE from "three";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";
import { Pane } from "tweakpane";

export function loadModels(
  scene: THREE.Scene,
  loadingManager: THREE.LoadingManager,
  onMixerReady: (mixer: THREE.AnimationMixer) => void,
) {
  const dracoLoader = new DRACOLoader(loadingManager);
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.setDRACOLoader(dracoLoader);

  const panelParams = {
    color: "#42cdff",
    emissive: "#ace9ff",
    emissiveIntensity: 2,
  };

  const modelParams = {
    color: "#000000",
    roughness: 1,
    metalness: 0,
  };

  const panelMaterial = new THREE.MeshStandardMaterial({
    color: panelParams.color,
    emissive: panelParams.emissive,
    emissiveIntensity: panelParams.emissiveIntensity * 1.25,
    toneMapped: false,
  });

  const mainModelMaterials: THREE.MeshStandardMaterial[] = [];

  // Load Panels
  gltfLoader.load("/models/ufl-panels.glb", (glb) => {
    const panels = glb.scene;
    panels.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        (node as THREE.Mesh).material = panelMaterial;
      }
    });
    scene.add(panels);
  });

  // Load Main Model & Animation
  gltfLoader.load("/models/ufl.glb", (glb) => {
    const ufl = glb.scene;
    const mixer = new THREE.AnimationMixer(ufl);
    const action = mixer.clipAction(glb.animations[0]);

    ufl.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) {
        const mat = new THREE.MeshStandardMaterial({
          color: modelParams.color,
          roughness: modelParams.roughness,
          metalness: modelParams.metalness,
        });
        (n as THREE.Mesh).material = mat;
        mainModelMaterials.push(mat);
      }
    });

    action.play();
    scene.add(ufl);
    onMixerReady(mixer);
  });

  function addPane(pane: Pane) {
    const folder = pane.addFolder({ title: "Models & Materials", expanded:false });

    const panelFolder = folder.addFolder({ title: "Panel Material" });
    panelFolder.addBinding(panelParams, "color").on("change", (ev) => {
      panelMaterial.color.set(ev.value);
    });
    panelFolder.addBinding(panelParams, "emissive").on("change", (ev) => {
      panelMaterial.emissive.set(ev.value);
    });
    panelFolder
      .addBinding(panelParams, "emissiveIntensity", {
        min: 0,
        max: 10,
        step: 0.1,
      })
      .on("change", (ev) => {
        panelMaterial.emissiveIntensity = ev.value;
      });

    const uflFolder = folder.addFolder({ title: "Main Model Material" });
    uflFolder.addBinding(modelParams, "color").on("change", (ev) => {
      mainModelMaterials.forEach((m) => m.color.set(ev.value));
    });
    uflFolder
      .addBinding(modelParams, "roughness", { min: 0, max: 1, step: 0.01 })
      .on("change", (ev) => {
        mainModelMaterials.forEach((m) => (m.roughness = ev.value));
      });
    uflFolder
      .addBinding(modelParams, "metalness", { min: 0, max: 1, step: 0.01 })
      .on("change", (ev) => {
        mainModelMaterials.forEach((m) => (m.metalness = ev.value));
      });
  }

  return { panelMaterial, addPane };
}
