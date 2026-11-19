import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying float vLife;
  varying float vDist;

  uniform float uTime;
  uniform vec3 uMouse;

  attribute float uOffset;
  attribute float uSeed;
  attribute float uScale;

  float hash1(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  vec3 hash3(float s) {
    return vec3(
      hash1(s * 12.9898 + 1.1),
      hash1(s * 78.233 + 2.7),
      hash1(s * 37.719 + 4.3)
    );
  }

  mat3 rotX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1.0, 0.0, 0.0,  0.0, c, -s,  0.0, s, c);
  }

  mat3 rotY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0.0, s,  0.0, 1.0, 0.0,  -s, 0.0, c);
  }

  mat3 rotZ(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, -s, 0.0,  s, c, 0.0,  0.0, 0.0, 1.0);
  }

  void main() {
    vUv = uv;

    vec3 rndA = hash3(uSeed * 19.31) * 0.2;
    vec3 rndB = hash3(uSeed * 47.17 + 9.4) * 0.3;

    // Organic cycle speed & staggered phase offset
    float speed = mix(0.14, 0.26, rndA.x) + hash3(uOffset + 100.0).r * .2;
    float life = fract(uTime * speed + uOffset + (rndA.y - 0.5) * 0.08);
    vLife = life;

    // 3D leaf flutter / tumble
    vec3 flutterSpeed = mix(vec3(1.4), vec3(3.6), rndB);
    vec3 flutterPhase = rndA * 6.2831853 + sin(uTime * flutterSpeed + rndB * 6.2831853) * 0.65;
    vec3 leafPos = rotZ(flutterPhase.z) * rotY(flutterPhase.y) * rotX(flutterPhase.x) * position;

    // Size variation per leaf
    float scale = mix(0.13, 0.25, rndB.z);
    leafPos *= scale * uScale * .4;

    // Organic rising path: helix + layered wind sway up to ~2.5
    float turns = mix(1.6, 3.0, rndA.z);
    float startAngle = rndA.x * 6.2831853;
    float theta = life * turns * 6.2831853 + startAngle;

    float baseRadius = mix(0.35, 0.95, rndB.x) * 2.0;
    float radius = baseRadius;

    vec3 sway = vec3(
      sin(life * 6.2831853 * 1.5 + uTime * 0.7 + rndB.x * 6.2831853) * 0.24,
      sin(life * 6.2831853 * 2.0 + rndA.z * 6.2831853) * 0.08,
      cos(life * 6.2831853 * 1.3 + uTime * 0.6 + rndB.y * 6.2831853) * 0.24
    );

    float y = mix(-0.15, 2.5, life);
    vec3 pathPos = vec3(
      cos(theta) * radius,
      y,
      sin(theta) * radius
    ) + sway;

    vec3 worldLocalPos = pathPos + leafPos;
    vec4 worldPos4 = modelMatrix * instanceMatrix * vec4(worldLocalPos, 1.0);
    vec3 worldPos = worldPos4.xyz;

    float dist = distance(uMouse, worldPos);

    float radii = .5;
    dist = dist / radii;
    dist = 1.0 - min(dist,1.0);

    vDist = dist;

    vec3 OutWard = normalize(worldPos - uMouse) * pow(dist,2.0) * .1;

    worldPos4.xyz += OutWard * 0.0;


    gl_Position = projectionMatrix * viewMatrix * worldPos4;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying float vLife;
  varying float vDist;


  uniform sampler2D uMap;
  uniform vec3 uColor;

  float hash1(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  void main() {
    vec4 map = texture2D(uMap, vUv);
    if (map.a < 0.05) discard;

    float fadeIn = smoothstep(0.0, 0.14, vLife);
    float fadeOut = 1.0 - smoothstep(0.82, 1.0, vLife);
    float alpha = fadeIn * fadeOut * map.a * (hash1(map.r) * .3 + .7);

    gl_FragColor = vec4(vec3(map.rgb) * uColor * 6.0, alpha);
  }
`;

export function SetupSparkles(
  scene: THREE.Scene,
  tLoader: THREE.TextureLoader,
  camera: THREE.Camera,
  domElement: HTMLElement = document.body,
) {
  const leafGeometry = new THREE.PlaneGeometry(1, 1, 2, 2);
  const leafMap = tLoader.load("/textures/leaf.png");
  leafMap.colorSpace = THREE.SRGBColorSpace;

  const leafMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uColor:{ value:new THREE.Color("#ace9ff")},
      uMap: { value: leafMap },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3(999, 999, 999) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const count = 1040;
  const offsets = new Float32Array(count);
  const seeds = new Float32Array(count);
  const scales = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    offsets[i] = i / count;
    const s = Math.sin(i * 91.3458 + 17.13) * 47453.5453;
    seeds[i] = s - Math.floor(s);
    scales[i] = Math.random() * 0.3 + 0.7;
  }

  leafGeometry.setAttribute(
    "uOffset",
    new THREE.InstancedBufferAttribute(offsets, 1),
  );
  leafGeometry.setAttribute(
    "uSeed",
    new THREE.InstancedBufferAttribute(seeds, 1),
  );
  leafGeometry.setAttribute(
    "uScale",
    new THREE.InstancedBufferAttribute(scales, 1),
  );

  const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, count);
  leaves.frustumCulled = false;
  scene.add(leaves);

  // Cylinder wrapping the spiral volume from y ~ -0.15 to y ~ 2.5
  const rMin = 0.5;
  const rMax = 1.3;
  const cylinderRadius = (rMin + rMax) * 0.5; // 0.90 — centered between min and max spiral radii
  const cylinderHeight = 2.65;

  const hitCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(
      cylinderRadius,
      cylinderRadius,
      cylinderHeight,
      48,
      1,
      true,
    ),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  hitCylinder.position.set(0, -0.15 + cylinderHeight * 0.5, 0);
  scene.add(hitCylinder);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const onPointerMove = (e: PointerEvent) => {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(hitCylinder, false)[0];
    if (hit) {
      leafMaterial.uniforms.uMouse.value.copy(hit.point);
    }
  };

  domElement.addEventListener("pointermove", onPointerMove);

  function Update(dt: number) {
    leafMaterial.uniforms.uTime.value += dt * 0.1;
  }

  function Dispose() {
    domElement.removeEventListener("pointermove", onPointerMove);
    hitCylinder.geometry.dispose();
    (hitCylinder.material as THREE.Material).dispose();
  }

  return { Update, Dispose };
}
