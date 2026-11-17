import * as THREE from "three";
import { Reflector } from "three/examples/jsm/Addons.js";

export function setupFloor(
  scene: THREE.Scene,
  textureLoader: THREE.TextureLoader,
) {
  const normalMap = textureLoader.load("/textures/normal-map.jpg");
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(2, 2);

  const geometry = new THREE.PlaneGeometry(10, 10);

  // Shift geometry up by +5 so the bottom edge sits at the pivot point
  geometry.translate(0, -5, 0);

  const reflector = new Reflector(geometry, {
    color: "#ffffff",
  });

  // Now position the pivot directly at the world origin edge (z = 0)
  reflector.position.set(0, -0.4, 0);

  // Lay it flat (-Math.PI / 2) and tilt it slightly (e.g., -0.1 or +0.1)
  reflector.rotation.x = -Math.PI / 2 + 0.1 * 0;

  scene.add(reflector);

  return { reflector, normalMap };
}
