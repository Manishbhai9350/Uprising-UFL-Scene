import * as THREE from "three";
import { DRACOLoader, GLTFLoader } from "three/examples/jsm/Addons.js";

export function loadModels(
  scene: THREE.Scene,
  loadingManager: THREE.LoadingManager,
  onMixerReady: (mixer: THREE.AnimationMixer) => void
) {
  const dracoLoader = new DRACOLoader(loadingManager);
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");

  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.setDRACOLoader(dracoLoader);

  const panelMaterial = new THREE.MeshStandardMaterial({
    // color: "#f0f0f0",
    // emissive: "#ffacac",
    color: "#42cdff",
    emissive: "#ace9ff",
    emissiveIntensity: 2,
    toneMapped: false,
  });

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
        (n as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: "black",
          roughness: 1,
          metalness: 0,
        });
      }
    });

    action.play();
    scene.add(ufl);
    onMixerReady(mixer);
  });

  return { panelMaterial };
}