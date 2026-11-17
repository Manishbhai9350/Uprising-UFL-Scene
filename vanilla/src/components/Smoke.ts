import * as THREE from "three";

const vertexShader = /* glsl */ `
attribute vec3 translate;
attribute vec3 rotation;
attribute float opacity;
attribute float direction;
attribute float speed;
attribute float scale;
attribute vec3 noise;
attribute vec3 color;

uniform float time;

varying vec2 vUv;
varying vec3 vColor;
varying float vSpeed;
varying float vOpacity;

mat4 translateMatrix(vec3 v) {
    return mat4(
        vec4(1., 0., 0., 0.),
        vec4(0., 1., 0., 0.),
        vec4(0., 0., 1., 0.),
        vec4(v.x, v.y, v.z, 1.)
    );
}

mat4 rotateMatrix(vec3 v) {
    mat4 rx = mat4(
        vec4(1., 0., 0., 0.),
        vec4(0., cos(v.x), -sin(v.x), 0.),
        vec4(0., sin(v.x), cos(v.x), 0.),
        vec4(0., 0., 0., 1.)
    );
    mat4 ry = mat4(
        vec4(cos(v.y), 0., sin(v.y), 0.),
        vec4(0., 1., 0., 0.),
        vec4(-sin(v.y), 0., cos(v.y), 0.),
        vec4(0., 0., 0., 1.)
    );
    mat4 rz = mat4(
        vec4(cos(v.z), -sin(v.z), 0., 0.),
        vec4(sin(v.z), cos(v.z), 0., 0.),
        vec4(0., 0., 1., 0.),
        vec4(0., 0., 0., 1.)
    );
    return rx * rz * ry;
}

mat4 scaleMatrix(vec3 v) {
    return mat4(
        vec4(v.x, 0., 0., 0.),
        vec4(0., v.y, 0., 0.),
        vec4(0., 0., v.z, 0.),
        vec4(0., 0., 0., 1.)
    );
}

mat4 transformMatrix(vec3 t, vec3 r, vec3 s) {
    return translateMatrix(t) * rotateMatrix(r) * scaleMatrix(s);
}

void main() {
    float s = time * speed * .2;
    vec3 transformPosition = translate + noise;
    vec3 transformRotation = rotation + vec3(0., 0., noise.z + s * direction);
    
    // Scale is passed as a uniform vector3 or handled via attributes. 
    // Here we scale X separately for width.
    mat4 transform = transformMatrix(
        transformPosition,
        transformRotation,
        vec3(scale * .5)
    );
    vec3 pos = position;
    vec4 mvPosition = modelViewMatrix * transform * vec4(pos, 1.0);

    gl_Position = projectionMatrix * mvPosition;

    vUv = uv;
    vSpeed = s;
    vColor = color;
    vOpacity = opacity;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D map;
uniform sampler2D noiseMap;
uniform float noiseIntensity;

varying vec2 vUv;
varying vec3 vColor;
varying float vSpeed;
varying float vOpacity;

void main() {
    vec2 uv = vUv;
    vec2 noiseUv = vUv;

    float speed = vSpeed;

    noiseUv.x += cos(speed * .5);
    noiseUv.y += sin(speed * .5);
    vec2 noise = texture2D(noiseMap, noiseUv * 2.).xy;
    uv += (-1. + noise * 2.) * noiseIntensity;

    vec4 texel = texture2D(map, uv);
    float finalOpacity = min(vOpacity, 0.3);
    gl_FragColor = texel * vec4(vColor, 1.) * finalOpacity;
}
`;

function randFloatSpread(amount: number) {
  return (Math.random() - 0.5) * amount;
}

function randFloat(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function SetupSmoke(
  scene: THREE.Scene,
  tLoader: THREE.TextureLoader,
  clock: THREE.Clock,
  camera: THREE.PerspectiveCamera,
) {
  const map = tLoader.load("/textures/smoke.jpg");
  const noiseMap = tLoader.load("/textures/noise.png", (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  });

  const settings = {
    count: 40,
    position: new THREE.Vector3(0, 0, 0),
    offset: new THREE.Vector3(0.7, 2, 0.1),
    radius: 0.5,
    noise: 0.4,
    speed: 1.0,
    scale: 1.5,
    widthMultiplier: 1.0, // <-- Exposed width multiplier (doubles width by default)
    opacity: 1,
    noiseIntensity: 0.1,
    color: "#009cd5",
  };

  // Generate Attribute Arrays
  const translate: number[] = [];
  const rotation: number[] = [];
  const opacity: number[] = [];
  const direction: number[] = [];
  const noise: number[] = [];
  const scale: number[] = [];
  const speed: number[] = [];
  const colors: number[] = [];
  const colorObj = new THREE.Color(settings.color);

  for (let index = settings.count - 1; index >= 0; index -= 1) {
    const side = index % 2;
    translate.push(
      settings.position.x +
        (side === 0
          ? -settings.offset.x * settings.radius
          : settings.offset.x * settings.radius),
      settings.position.y + randFloatSpread(settings.offset.y),
      settings.position.z + randFloatSpread(settings.offset.z),
    );
    rotation.push(0, 0, randFloat(-Math.PI, Math.PI));
    noise.push(
      randFloatSpread(settings.noise),
      randFloatSpread(settings.noise),
      randFloatSpread(settings.noise),
    );
    speed.push(settings.speed * randFloat(1, 2) * 0.25);
    scale.push(settings.scale * randFloat(1, 3));
    opacity.push(settings.opacity * randFloat(0.5, 0.7));
    direction.push(side === 0 ? 1 : -1);
    colors.push(colorObj.r, colorObj.g, colorObj.b);
  }

  const geometry = new THREE.InstancedBufferGeometry();

  // Pass the width multiplier directly into the base plane geometry width parameter (default is 1, now multiplied)
  const baseGeo = new THREE.PlaneGeometry(
    1 * settings.widthMultiplier,
    1,
    1,
    1,
  );

  geometry.index = baseGeo.index;
  geometry.setAttribute("position", baseGeo.attributes.position);
  geometry.setAttribute("uv", baseGeo.attributes.uv);

  geometry.setAttribute(
    "translate",
    new THREE.InstancedBufferAttribute(new Float32Array(translate), 3),
  );
  geometry.setAttribute(
    "rotation",
    new THREE.InstancedBufferAttribute(new Float32Array(rotation), 3),
  );
  geometry.setAttribute(
    "opacity",
    new THREE.InstancedBufferAttribute(new Float32Array(opacity), 1),
  );
  geometry.setAttribute(
    "direction",
    new THREE.InstancedBufferAttribute(new Float32Array(direction), 1),
  );
  geometry.setAttribute(
    "scale",
    new THREE.InstancedBufferAttribute(new Float32Array(scale), 1),
  );
  geometry.setAttribute(
    "noise",
    new THREE.InstancedBufferAttribute(new Float32Array(noise), 3),
  );
  geometry.setAttribute(
    "speed",
    new THREE.InstancedBufferAttribute(new Float32Array(speed), 1),
  );
  geometry.setAttribute(
    "color",
    new THREE.InstancedBufferAttribute(new Float32Array(colors), 3),
  );

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      map: new THREE.Uniform(map),
      noiseMap: new THREE.Uniform(noiseMap),
      time: new THREE.Uniform(0),
      noiseIntensity: new THREE.Uniform(settings.noiseIntensity),
    },
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const smokeMesh = new THREE.Mesh(geometry, material);
  const seed = Math.random() * 1000;
  smokeMesh.userData = { active: true, seed };

  scene.add(smokeMesh);

  function Update(dt: number) {
    if (!smokeMesh.userData.active) return;
    material.uniforms.time.value =
      smokeMesh.userData.seed + clock.getElapsedTime();
    smokeMesh.lookAt(camera.position);
  }

  return { Update, settings };
}
