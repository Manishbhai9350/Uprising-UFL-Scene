import { r as React } from "../react.js";
import { a as useFrame, e as extend, s as shaderMaterial } from "../react-fiber.js";
import {
  an as UniformsUtils,
  ao as ShaderLib,
  j as Color,
  Y as MathUtils,
  b9 as AdditiveBlending,
} from "../three.js";

const createElement = React.createElement;

const vertexShader = `
  #include <fog_pars_vertex>

  uniform float pixelRatio;
  uniform float time;

  attribute float opacity;
  attribute float speed;
  attribute float size;
  attribute float glow;
  attribute vec3 noise;
  attribute vec3 color;

  varying vec3 vColor;
  varying float vGlow;
  varying float vOpacity;

  void main() {
    vec4 transform = vec4(position, 1.);
    transform.x += cos(time * speed * noise.x);
    transform.y += sin(time * speed * noise.y);
    transform.z += cos(time * speed * noise.z);
    vec3 transformed = transform.xyz;

    #include <project_vertex>
    gl_PointSize = size * 25. * pixelRatio;
    #include <fog_vertex>

    vGlow = glow;
    vColor = color;
    vOpacity = opacity;
  }
`;

const fragmentShader = `
  #include <fog_pars_fragment>

  uniform sampler2D map;
  varying vec3 vColor;
  varying float vGlow;
  varying float vOpacity;

  void main() {
    vec4 texel = texture2D(map, gl_PointCoord);
    vec4 color = texel * vec4(vColor, 1.);
    gl_FragColor = color + color * vGlow;
    gl_FragColor.a *= vOpacity;

    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
  }
`;

const SparklesShaderMaterial = shaderMaterial(
  UniformsUtils.merge([
    ShaderLib.fog,
    { map: null, time: 0, pixelRatio: 1, vertexColor: true },
  ]),
  vertexShader,
  fragmentShader,
  (material) => {
    material.fog = true;
  },
);

function makeSparkleAttributes(settings) {
  const positions = [];
  const opacities = [];
  const noises = [];
  const speeds = [];
  const colors = [];
  const sizes = [];
  const glows = [];
  const color = new Color(settings.color);

  for (let index = settings.count - 1; index >= 0; index -= 1) {
    positions.push(
      settings.position.x + MathUtils.randFloatSpread(settings.scale),
      settings.position.y + MathUtils.randFloatSpread(settings.scale),
      settings.position.z + MathUtils.randFloatSpread(settings.scale / 1.5),
    );
    noises.push(
      MathUtils.randFloatSpread(settings.noise),
      MathUtils.randFloatSpread(settings.noise),
      MathUtils.randFloatSpread(settings.noise),
    );
    colors.push(color.r, color.g, color.b);
    opacities.push(settings.opacity);
    speeds.push(settings.speed);
    sizes.push(MathUtils.randFloat(0, settings.size));
    glows.push(settings.glow);
  }

  return {
    positions: new Float32Array(positions),
    opacities: new Float32Array(opacities),
    noises: new Float32Array(noises),
    speeds: new Float32Array(speeds),
    colors: new Float32Array(colors),
    sizes: new Float32Array(sizes),
    glows: new Float32Array(glows),
  };
}

export default function Sparkles({ assets, settings }) {
  const texture = assets.get(settings.texture);
  if (!texture) {
    throw new Error("Sparkle texture was not loaded.");
  }

  const points = React.useRef(null);
  const material = React.useRef(null);
  const attributes = React.useMemo(
    () => makeSparkleAttributes(settings),
    [settings],
  );
  const seed = React.useMemo(() => Math.random() * 1000, []);

  React.useMemo(() => extend({ SparklesShaderMaterial }), []);

  useFrame(({ clock }) => {
    if (points.current?.userData.active) {
      material.current.uniforms.time.value = seed + clock.getElapsedTime();
    }
  });

  return createElement(
    "points",
    {
      ref: points,
      name: "sparkles",
      frustumCulled: false,
      userData: { active: true },
    },
    createElement(
      "bufferGeometry",
      null,
      createElement("bufferAttribute", {
        attach: "attributes-position",
        args: [attributes.positions, 3],
      }),
      createElement("bufferAttribute", {
        attach: "attributes-opacity",
        args: [attributes.opacities, 1],
      }),
      createElement("bufferAttribute", {
        attach: "attributes-size",
        args: [attributes.sizes, 1],
      }),
      createElement("bufferAttribute", {
        attach: "attributes-speed",
        args: [attributes.speeds, 1],
      }),
      createElement("bufferAttribute", {
        attach: "attributes-noise",
        args: [attributes.noises, 3],
      }),
      createElement("bufferAttribute", {
        attach: "attributes-color",
        args: [attributes.colors, 3],
      }),
      createElement("bufferAttribute", {
        attach: "attributes-glow",
        args: [attributes.glows, 1],
      }),
    ),
    createElement("sparklesShaderMaterial", {
      ref: material,
      map: texture,
      blending: AdditiveBlending,
      depthWrite: false,
      pixelRatio: 1,
      toneMapped: false,
    }),
  );
}
