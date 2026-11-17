import * as THREE from "three";
import { Reflector } from "three/examples/jsm/Addons.js";
import { Pane } from "tweakpane";

export function setupFloor(
  scene: THREE.Scene,
  textureLoader: THREE.TextureLoader,
) {
  // 1. Load and configure the normal map texture
  const normalMap = textureLoader.load("/textures/normal-map.jpg");
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(1, 1);

  const geometry = new THREE.PlaneGeometry(10, 10);
  geometry.translate(0, -5, 0);

  const params = {
    normalScaleX: 2,
    normalScaleY: 2,
    color: "#ffffff",
    animSpeed: 1.0,
  };

  // 2. Create a Custom Reflector Shader incorporating the normal map & scale
  const CustomReflectorShader = {
    name: "CustomReflectorShader",
    uniforms: THREE.UniformsUtils.merge([
      {
        color: { value: new THREE.Color(params.color) },
        tDiffuse: { value: null },
        textureMatrix: { value: null },
        tNormal: { value: null },
        normalScale: { value: new THREE.Vector2(params.normalScaleX, params.normalScaleY) },
        uTime: { value: 0 },
      },
    ]),
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUvReflection;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vUvReflection = textureMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform sampler2D tDiffuse;
      uniform sampler2D tNormal;
      uniform vec2 normalScale;
      uniform float uTime;

      varying vec4 vUvReflection;
      varying vec2 vUv;

      void main() {
        // Sample normal map and convert from [0, 1] range to [-1, 1]
        vec4 normalColor = texture2D(tNormal, vUv * .2 + vec2(uTime * .0026));
        vec2 perturbation = (normalize(normalColor.rb) - .5) * normalScale;

        // Perturb the projection coordinates to create surface ripples/details
        vec4 perturbedUv = vUvReflection + vec4(perturbation, 0.0, 0.0);

        vec4 base = texture2DProj(tDiffuse, perturbedUv);
        gl_FragColor = vec4((base.rgb * color) * .6, 1.0);
      }
    `,
  };

  // 3. Initialize the Reflector with the custom shader
  const reflector = new Reflector(geometry, {
    color: "#ffffff",
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
    shader: CustomReflectorShader,
  });

  // Assign the normal map texture to the custom uniform
  reflector.material.uniforms.tNormal.value = normalMap;

  reflector.position.set(0, -0.4, 0);
  reflector.rotation.x = -Math.PI / 2;

  scene.add(reflector);

  // Add Tweakpane Integration
  function addPane(pane: Pane) {
    const folder = pane.addFolder({ title: "Floor", expanded:false });

    folder.addBinding(params, "color").on("change", (ev) => {
      reflector.material.uniforms.color.value.set(ev.value);
    });

    folder.addBinding(params, "normalScaleX", { min: 0, max: 10, step: 0.1 }).on("change", (ev) => {
      reflector.material.uniforms.normalScale.value.x = ev.value;
    });

    folder.addBinding(params, "normalScaleY", { min: 0, max: 10, step: 0.1 }).on("change", (ev) => {
      reflector.material.uniforms.normalScale.value.y = ev.value;
    });

    folder.addBinding(params, "animSpeed", { min: 0, max: 5, step: 0.1 });
  }

  // 4. Return update function and pane hook
  return {
    reflector,
    normalMap,
    addPane,
    update: (delta: number) => {
      reflector.material.uniforms.uTime.value += delta * params.animSpeed;
    },
  };
}