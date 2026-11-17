import * as THREE from "three";

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(0x000000);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setSize(window.innerWidth, window.innerHeight);

  const camera = new THREE.PerspectiveCamera(
    10,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  
  const camPosition = new THREE.Vector3(0, 1, 5).multiplyScalar(4);
  camera.position.copy(camPosition);

  return { renderer, camera };
}

export function setupResize(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}