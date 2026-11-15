import { r as React } from "../react.js";
import { a as useFrame, e as extend, s as shaderMaterial } from "../react-fiber.js";
import {
  an as UniformsUtils,
  ao as ShaderLib,
  P as PlaneGeometry,
  j as Color,
  Y as MathUtils,
  b9 as AdditiveBlending,
} from "../three.js";

const createElement = React.createElement;

const vertexShader = `
  #include <fog_pars_vertex>

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
    float s = time * speed * 2.;
    vec3 transformPosition = translate + noise;
    vec3 transformRotation = rotation + vec3(0., 0., noise.z + s * direction);
    mat4 transform = transformMatrix(
      transformPosition,
      transformRotation,
      vec3(scale)
    );
    vec3 transformed = (transform * vec4(position, 1.)).xyz;

    #include <project_vertex>
    #include <fog_vertex>

    vUv = uv;
    vSpeed = s;
    vColor = color;
    vOpacity = opacity;
  }
`;

const fragmentShader = `
  #include <fog_pars_fragment>

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
    noiseUv.x += cos(vSpeed * .5);
    noiseUv.y += sin(vSpeed * .5);
    vec2 noise = texture2D(noiseMap, noiseUv * 2.).xy;
    uv += (-1. + noise * 2.) * noiseIntensity;

    vec4 texel = texture2D(map, uv);
    gl_FragColor = texel * vec4(vColor, 1.) * vOpacity;

    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
  }
`;

const SmokeShaderMaterial = shaderMaterial(
  UniformsUtils.merge([
    ShaderLib.fog,
    { map: null, noiseMap: null, time: 0, noiseIntensity: 0 },
  ]),
  vertexShader,
  fragmentShader,
  (material) => {
    material.fog = true;
  },
);

function spread(amount) {
  return MathUtils.randFloatSpread(amount);
}

function makeSmokeAttributes(settings) {
  const translate = [];
  const rotation = [];
  const opacity = [];
  const direction = [];
  const noise = [];
  const scale = [];
  const speed = [];
  const colors = [];
  const color = new Color(settings.color);

  for (let index = settings.count - 1; index >= 0; index -= 1) {
    const side = index % 2;
    translate.push(
      settings.position.x + (side === 0 ? -settings.offset.x * settings.radius : settings.offset.x * settings.radius),
      settings.position.y + spread(settings.offset.y),
      settings.position.z + spread(settings.offset.z),
    );
    rotation.push(0, 0, MathUtils.randFloat(-Math.PI, Math.PI));
    noise.push(spread(settings.noise), spread(settings.noise), spread(settings.noise));
    speed.push(settings.speed * MathUtils.randFloat(1, 2) * 0.25);
    scale.push(settings.scale * MathUtils.randFloat(2, 3));
    opacity.push(settings.opacity * MathUtils.randFloat(0.5, 1));
    direction.push(side === 0 ? 1 : -1);
    colors.push(color.r, color.g, color.b);
  }

  return {
    translate: new Float32Array(translate),
    rotation: new Float32Array(rotation),
    opacity: new Float32Array(opacity),
    direction: new Float32Array(direction),
    noise: new Float32Array(noise),
    scale: new Float32Array(scale),
    speed: new Float32Array(speed),
    color: new Float32Array(colors),
  };
}

export default function Smoke({ assets, settings }) {
  const texture = assets.get(settings.texture);
  const noiseMap = assets.get(settings.displacement);
  if (!texture || !noiseMap) {
    throw new Error("Homepage smoke textures were not loaded.");
  }

  const mesh = React.useRef(null);
  const material = React.useRef(null);
  const attributes = React.useMemo(
    () => makeSmokeAttributes(settings),
    [settings],
  );
  const geometry = React.useMemo(() => new PlaneGeometry(1, 1, 1, 1), []);

  React.useMemo(() => extend({ SmokeShaderMaterial }), []);

  useFrame(({ camera, clock }) => {
    if (!mesh.current?.userData.active) return;
    material.current.uniforms.time.value =
      mesh.current.userData.seed + clock.getElapsedTime();
    mesh.current.lookAt(camera.position);
  });

  return createElement(
    "mesh",
    {
      ref: mesh,
      name: "smoke",
      userData: { active: true, seed: Math.random() * 1000 },
    },
    createElement(
      "instancedBufferGeometry",
      {
        instanceCount: settings.count,
        index: geometry.index,
        "attributes-uv": geometry.attributes.uv,
        "attributes-position": geometry.attributes.position,
      },
      createElement("instancedBufferAttribute", {
        attach: "attributes-translate",
        args: [attributes.translate, 3],
      }),
      createElement("instancedBufferAttribute", {
        attach: "attributes-rotation",
        args: [attributes.rotation, 3],
      }),
      createElement("instancedBufferAttribute", {
        attach: "attributes-opacity",
        args: [attributes.opacity, 1],
      }),
      createElement("instancedBufferAttribute", {
        attach: "attributes-direction",
        args: [attributes.direction, 1],
      }),
      createElement("instancedBufferAttribute", {
        attach: "attributes-scale",
        args: [attributes.scale, 1],
      }),
      createElement("instancedBufferAttribute", {
        attach: "attributes-noise",
        args: [attributes.noise, 3],
      }),
      createElement("instancedBufferAttribute", {
        attach: "attributes-speed",
        args: [attributes.speed, 1],
      }),
      createElement("instancedBufferAttribute", {
        attach: "attributes-color",
        args: [attributes.color, 3],
      }),
    ),
    createElement("smokeShaderMaterial", {
      ref: material,
      map: texture,
      noiseMap,
      noiseIntensity: settings.noiseIntensity,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}
