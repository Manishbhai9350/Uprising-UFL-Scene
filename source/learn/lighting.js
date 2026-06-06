/**
 * Lighting setup for UFL and Home scenes.
 * Mirrors lT and aT logic from main.js.
 */

import * as THREE from '../three.js';

/**
 * Creates the Portal lighting system used in Uprising and UFL.
 * Combines a RectAreaLight with emissive materials for a high-end glow.
 */
export class PortalLighting {
  constructor(scene, settings) {
    const { color, intensity, emissive, emissiveIntensity } = settings;

    // The physical light source emitting from the portal plane
    this.rectLight = new THREE.RectAreaLight(
      new THREE.Color(color),
      intensity,
      2.5, // width
      2.5  // height
    );
    
    // The emissive material that makes the portal geometry appear as the light source
    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(emissive),
      emissiveIntensity: emissiveIntensity,
      toneMapped: false // Prevents clipping of the high-intensity glow
    });

    scene.add(this.rectLight);
  }

  /** Dynamic update for reveal animations */
  update(intensity) {
    this.material.emissiveIntensity = intensity;
    this.rectLight.intensity = intensity * 2;
  }
}

/**
 * Environment setup for Global lighting and Reflections
 */
export function setEnvironment(scene, cubeMap) {
  scene.environment = cubeMap;
}

export function createFog(color, near, far) {
  return new THREE.Fog(new THREE.Color(color), near, far);
}
