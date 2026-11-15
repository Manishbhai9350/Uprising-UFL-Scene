import { r as React } from "../react.js";
import { a as useFrame, u as useThree } from "../react-fiber.js";
import {
  a2 as NearestFilter,
  aH as Uniform,
  aL as NoBlending,
  aM as Scene,
  an as UniformsUtils,
  ao as UniformsLib,
  ar as DataTexture,
  as as RGBAFormat,
  at as FloatType,
  az as WebGLRenderTarget,
  am as ShaderMaterial,
  b5 as RawShaderMaterial,
  b9 as AdditiveBlending,
  e as BufferGeometry,
  f as Mesh,
  j as Color,
  P as PlaneGeometry,
  r as Vector2,
  u as Float32BufferAttribute,
  V as Vector3,
  y as RepeatWrapping,
  Z as OrthographicCamera,
} from "../three.js";
import { calculateCameraFov } from "./render-pipeline.js";

const createElement = React.createElement;
const PARTICLE_WIDTH = 128;
const PARTICLE_HEIGHT = 128;
const PARTICLE_COUNT = PARTICLE_WIDTH * PARTICLE_HEIGHT;

const simulationVertexShader = `
  precision highp float;
  attribute vec3 position;
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const copyFragmentShader = `
  precision highp float;
  uniform vec2 resolution;
  uniform sampler2D texture;
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    gl_FragColor = texture2D(texture, uv);
  }
`;

const particlePositionShader = `
  precision highp float;
  uniform sampler2D texturePosition;
  uniform sampler2D textureDefaultPosition;
  uniform vec2 resolution;
  uniform vec3 mouse3d;
  uniform float speed;
  uniform float dieSpeed;
  uniform float curlSize;
  uniform float attraction;
  uniform float radius;
  uniform float delta;
  uniform float time;

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  float mod289(float x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }
  float permute(float x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }
  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  float taylorInvSqrt(float r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p;
    vec4 s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz += (s.xyz * 2.0 - 1.0) * s.www;
    return p;
  }

  #define F4 0.309016994374947451

  vec4 snoise4(vec4 v) {
    const vec4 C = vec4(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
    vec4 i = floor(v + dot(v, vec4(F4)));
    vec4 x0 = v - i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;
    i = mod289(i);
    float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute(permute(permute(permute(
      i.w + vec4(i1.w, i2.w, i3.w, 1.0))
      + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
      + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
      + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
    vec4 p0 = grad4(j0, ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4, p4));
    vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2));
    vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));
    vec3 m0 = max(0.5 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.5 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    vec3 temp0 = -6.0 * m0 * m0 * values0;
    vec2 temp1 = -6.0 * m1 * m1 * values1;
    vec3 mmm0 = m0 * m0 * m0;
    vec2 mmm1 = m1 * m1 * m1;
    float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;
    float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;
    float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;
    float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;
    return vec4(dx, dy, dz, dw) * 49.0;
  }

  vec3 curl(vec3 p, float noiseTime, float persistence) {
    vec4 xNoisePotentialDerivatives = vec4(0.0);
    vec4 yNoisePotentialDerivatives = vec4(0.0);
    vec4 zNoisePotentialDerivatives = vec4(0.0);
    for (int i = 0; i < 3; ++i) {
      float twoPowI = pow(2.0, float(i));
      float scale = 0.5 * twoPowI * pow(persistence, float(i));
      xNoisePotentialDerivatives += snoise4(vec4(p * twoPowI, noiseTime)) * scale;
      yNoisePotentialDerivatives += snoise4(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;
      zNoisePotentialDerivatives += snoise4(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;
    }
    return vec3(
      zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
      xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
      yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]
    );
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 positionInfo = texture2D(texturePosition, uv);
    vec3 position = positionInfo.xyz;
    float life = positionInfo.a - dieSpeed;
    vec3 followPosition = mouse3d / 0.1;
    if (life < 0.0) {
      positionInfo = texture2D(textureDefaultPosition, uv);
      position = positionInfo.xyz * (1.0 + sin(time * 15.0) * 0.2) * 2.0 * radius;
      position += followPosition;
      life = 0.5 + fract(positionInfo.w * 21.4131 + time);
    } else {
      vec3 offset = followPosition - position;
      position += offset * (0.005 + life * 0.01) * attraction * (1.0 - smoothstep(50.0, 300.0, length(offset))) * speed;
      position += curl(position * curlSize, time, 0.1 + (1.0 - life) * 0.1) * speed;
      position.x -= length(offset) * delta * 2.5;
    }
    gl_FragColor = vec4(position, life);
  }
`;

const particlesVertexShader = `
  #include <common>
  #include <fog_pars_vertex>
  #include <morphtarget_pars_vertex>
  #include <skinning_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  #include <shadowmap_pars_vertex>

  uniform sampler2D texturePosition;

  varying float vLife;
  varying vec3 vWorldPosition;

  void main() {
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>

    vec4 positionInfo = texture2D(texturePosition, position.xy);
    vec4 worldPosition = modelMatrix * vec4(positionInfo.xyz, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;
    vLife = positionInfo.w;
    gl_PointSize = 3.0 / length(mvPosition.xyz) * smoothstep(0.0, 0.2, positionInfo.w);
    gl_Position = projectionMatrix * mvPosition;

    #include <logdepthbuf_vertex>
    #include <shadowmap_vertex>
    #include <fog_vertex>
    vWorldPosition = worldPosition.xyz;
  }
`;

const particlesFragmentShader = `
  #include <common>
  #include <packing>
  #include <fog_pars_fragment>
  #include <bsdfs>
  #include <lights_pars_begin>
  #include <logdepthbuf_pars_fragment>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>

  varying float vLife;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform sampler2D tDiffuse;
  varying vec3 vWorldPosition;

  void main() {
    #include <logdepthbuf_fragment>

    vec3 color1 = vec3(1.0);
    vec3 color2 = vec3(18.0 / 255.0, 118.0 / 255.0, 170.0 / 255.0);
    vec3 outgoingLight = mix(color2, color1, smoothstep(0.0, 1.0, vLife));
    float shadow = getShadowMask();
    vec3 shadowMask = vec3(1.0);
    shadowMask *= vec3(1.0 - getShadowMask());
    gl_FragColor = vec4(outgoingLight, 1.0);

    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
  }
`;

function createDoubleTarget() {
  const options = {
    wrapS: RepeatWrapping,
    wrapT: RepeatWrapping,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: FloatType,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  };
  const read = new WebGLRenderTarget(PARTICLE_WIDTH, PARTICLE_HEIGHT, options);
  const write = new WebGLRenderTarget(PARTICLE_WIDTH, PARTICLE_HEIGHT, options);
  return {
    read,
    write,
    swap() {
      [this.read, this.write] = [this.write, this.read];
    },
  };
}

class WatchParticleSimulation {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new Scene();
    this.camera = new OrthographicCamera();
    this.camera.position.z = 1;
    this.clearColor = new Color(0);
    this.mouse3d = new Vector3();
    this.copyMaterial = new RawShaderMaterial({
      uniforms: {
        resolution: { value: new Vector2(PARTICLE_WIDTH, PARTICLE_HEIGHT) },
        texture: { value: null },
      },
      vertexShader: simulationVertexShader,
      fragmentShader: copyFragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.positionMaterial = new RawShaderMaterial({
      uniforms: {
        resolution: { value: new Vector2(PARTICLE_WIDTH, PARTICLE_HEIGHT) },
        texturePosition: { value: null },
        textureDefaultPosition: { value: null },
        mouse3d: { value: new Vector3() },
        delta: { value: 0 },
        speed: { value: 1 },
        dieSpeed: { value: 0 },
        radius: { value: 0 },
        curlSize: { value: 0 },
        attraction: { value: 0 },
        time: { value: 0 },
        initAnimation: { value: 0 },
      },
      vertexShader: simulationVertexShader,
      fragmentShader: particlePositionShader,
      blending: NoBlending,
      transparent: false,
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new Mesh(new PlaneGeometry(2, 2), this.copyMaterial);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.position = createDoubleTarget();
    this.defaultPositionTexture = this.createPositionTexture();
    this.copyTexture(this.defaultPositionTexture, this.position.read);
    this.copyTexture(this.position.read.texture, this.position.write);
  }

  createPositionTexture() {
    const data = new Float32Array(PARTICLE_COUNT * 4);
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const offset = index * 4;
      const radius = (0.5 + Math.random() * 0.5) * 25;
      const latitude = (Math.random() - 0.5) * Math.PI;
      const longitude = Math.random() * Math.PI * 2;
      data[offset] = radius * Math.cos(longitude) * Math.cos(latitude);
      data[offset + 1] = radius * Math.sin(latitude);
      data[offset + 2] = radius * Math.sin(longitude) * Math.cos(latitude);
      data[offset + 3] = Math.random();
    }
    const texture = new DataTexture(
      data,
      PARTICLE_WIDTH,
      PARTICLE_HEIGHT,
      RGBAFormat,
      FloatType,
    );
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    return texture;
  }

  copyTexture(texture, target) {
    this.mesh.material = this.copyMaterial;
    this.copyMaterial.uniforms.texture.value = texture;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  updatePosition(delta) {
    this.mesh.material = this.positionMaterial;
    this.positionMaterial.uniforms.textureDefaultPosition.value =
      this.defaultPositionTexture;
    this.positionMaterial.uniforms.texturePosition.value =
      this.position.read.texture;
    this.positionMaterial.uniforms.time.value += delta;
    this.renderer.setRenderTarget(this.position.write);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.position.swap();
  }

  update(delta) {
    this.renderer.getClearColor(this.clearColor);
    const clearColor = this.clearColor.getHex();
    const clearAlpha = this.renderer.getClearAlpha();
    const autoClearColor = this.renderer.autoClearColor;
    this.renderer.autoClearColor = false;
    try {
      this.positionMaterial.uniforms.delta.value = delta;
      this.positionMaterial.uniforms.speed.value = 20 * delta;
      this.positionMaterial.uniforms.dieSpeed.value = delta;
      this.positionMaterial.uniforms.radius.value = 0.1;
      this.positionMaterial.uniforms.curlSize.value = 0.06;
      this.positionMaterial.uniforms.attraction.value = 2;
      this.positionMaterial.uniforms.mouse3d.value.lerp(this.mouse3d, 5 * delta);
      this.updatePosition(delta);
    } finally {
      this.renderer.setClearColor(clearColor, clearAlpha);
      this.renderer.autoClearColor = autoClearColor;
    }
  }

  get positionTexture() {
    return this.position.read.texture;
  }
}

const simulations = new WeakMap();

function useWatchParticleSimulation() {
  const renderer = useThree((state) => state.gl);
  return React.useMemo(() => {
    let simulation = simulations.get(renderer);
    if (!simulation) {
      simulation = new WatchParticleSimulation(renderer);
      simulations.set(renderer, simulation);
    }
    return simulation;
  }, [renderer]);
}

function WatchParticles({ assets }) {
  const simulation = useWatchParticleSimulation();
  const material = React.useMemo(
    () =>
      new ShaderMaterial({
        uniforms: UniformsUtils.merge([
          UniformsLib.lights.pointLights,
          UniformsLib.fog,
          {
            texturePosition: { value: simulation.positionTexture },
            tDiffuse: { value: assets.get("spark") },
          },
        ]),
        vertexShader: particlesVertexShader,
        fragmentShader: particlesFragmentShader,
        blending: AdditiveBlending,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
        fog: true,
      }),
    [assets, simulation],
  );
  const geometry = React.useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      positions[index * 3] = (index % PARTICLE_WIDTH) / PARTICLE_WIDTH;
      positions[index * 3 + 1] =
        Math.floor(index / PARTICLE_WIDTH) / PARTICLE_HEIGHT;
    }
    const points = new BufferGeometry();
    points.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return points;
  }, []);

  useFrame((_state, delta) => {
    simulation.update(delta * 0.25);
    material.uniforms.texturePosition.value = simulation.positionTexture;
  });

  return createElement("points", {
    geometry,
    material,
    position: [0.08, 0, 0],
    scale: 0.015,
    frustumCulled: false,
  });
}

function WatchModel({ assets, settings }) {
  const gltf = assets.get(settings.geometry);
  const sourceMesh = gltf?.scene?.children?.[0];
  if (!sourceMesh?.geometry) {
    throw new Error(`Watch model "${settings.geometry}" has no first-child mesh geometry.`);
  }
  const environment = assets.get(settings.envMapRef);
  if (!environment) {
    throw new Error(`Watch environment "${settings.envMapRef}" was not loaded.`);
  }
  const { geometry: _geometry, envMapRef: _envMapRef, name: _name, ...materialSettings } =
    settings;
  const group = React.useRef(null);
  const lookAt = React.useMemo(() => new Vector3(0, 0, 1), []);
  const lookTarget = React.useMemo(() => new Vector3(0, 0, 1), []);

  React.useEffect(() => {
    function updatePointer(event) {
      lookTarget.set(
        ((event.clientX / window.innerWidth) * 2 - 1) * 0.1,
        (-(event.clientY / window.innerHeight) * 2 + 1) * 0.1,
        1,
      );
    }
    window.addEventListener("pointermove", updatePointer);
    return () => window.removeEventListener("pointermove", updatePointer);
  }, [lookTarget]);

  useFrame(({ clock }, delta) => {
    const currentGroup = group.current;
    if (!currentGroup) return;
    const elapsed = clock.getElapsedTime();
    currentGroup.position.x = Math.cos(elapsed * 0.25) * 0.015;
    currentGroup.position.y = 0.036 + Math.sin(elapsed * 0.5) * 0.03;
    lookAt.lerp(lookTarget, delta * 2);
    currentGroup.lookAt(lookAt);
  });

  return createElement(
    "group",
    { ref: group, name: "watch-model", position: [0, 0.1, 0] },
    createElement(
      "group",
      {
        position: sourceMesh.position,
        rotation: [-0.212, 0.608, 0.132],
      },
      createElement(
        "mesh",
        { geometry: sourceMesh.geometry, scale: sourceMesh.scale },
        createElement("meshStandardMaterial", {
          ...materialSettings,
          envMap: environment,
        }),
      ),
      createElement(WatchParticles, { assets }),
    ),
  );
}

export default function WatchScene({ assets }) {
  const configuration = assets.get("config");
  const watchSettings = configuration.scene.components.find(
    (component) => component.name === "WatchModel",
  );
  if (!watchSettings) {
    throw new Error('Doublepoint configuration is missing the "WatchModel" component.');
  }
  const fogSettings = configuration.scene.components.find(
    (component) => component.name === "Fog",
  );
  return createElement(
    React.Fragment,
    null,
    fogSettings &&
      createElement("fog", {
        attach: "fog",
        args: [fogSettings.color, fogSettings.near, fogSettings.far],
      }),
    createElement(WatchModel, { assets, settings: watchSettings }),
  );
}

export function WatchCamera({ settings }) {
  const camera = useThree((state) => state.camera);
  const pointer = React.useRef({ x: 0, y: 0 });
  const offset = React.useRef({ x: 0, y: 0 });

  React.useLayoutEffect(() => {
    const isMobile = window.innerWidth < 768;
    camera.position.set(0, isMobile ? -0.25 : 0, 4.3);
    camera.near = settings.near;
    camera.far = settings.far;
    camera.fov = calculateCameraFov(window.innerWidth, settings.fov);
    camera.lookAt(0, isMobile ? -0.25 : 0, 0);
    camera.updateProjectionMatrix();

    function updateFov() {
      camera.fov = calculateCameraFov(window.innerWidth, settings.fov);
      camera.updateProjectionMatrix();
    }
    function updatePointer(event) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (-(event.clientY / window.innerHeight) * 2 + 1) * 0.2;
    }
    window.addEventListener("resize", updateFov);
    window.addEventListener("pointermove", updatePointer);
    return () => {
      window.removeEventListener("resize", updateFov);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, [camera, settings.far, settings.fov, settings.near]);

  useFrame((_state, delta) => {
    const smoothing = Math.min(delta * 2, 1);
    offset.current.x += (pointer.current.x - offset.current.x) * smoothing;
    offset.current.y += (pointer.current.y - offset.current.y) * smoothing;
    const mobileY = window.innerWidth < 768 ? -0.25 : 0;
    camera.position.set(offset.current.x, mobileY + offset.current.y, 4.3);
    camera.lookAt(0, mobileY, 0);
  });

  return null;
}
