import * as React from "react";
import { useThree } from "@react-three/fiber";
import { Effect } from "postprocessing";
import {
  Box3,
  BufferGeometry,
  Float32BufferAttribute,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  RGFormat,
  RedFormat,
  ShaderMaterial,
  Sphere,
  Uniform,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";

const fullscreenVertexShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
    vUv = uv;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(position, 1.0);
  }
`;

const clearShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main () {
    gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

const splatShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`;

const advectionShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform vec2 dyeTexelSize;
  uniform float dt;
  uniform float dissipation;
  vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
    vec2 st = uv / tsize - 0.5;
    vec2 iuv = floor(st);
    vec2 fuv = fract(st);
    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
  }
  void main () {
    vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
    gl_FragColor = dissipation * bilerp(uSource, coord, dyeTexelSize);
    gl_FragColor.a = 1.0;
  }
`;

const fastAdvectionShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform float dt;
  uniform float dissipation;
  void main () {
    vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
    gl_FragColor = dissipation * texture2D(uSource, coord);
    gl_FragColor.a = 1.0;
  }
`;

const divergenceShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    vec2 C = texture2D(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

const curlShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`;

const vorticityShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
  }
`;

const pressureShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

const gradientSubtractShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

const fluidEffectShader = `
  uniform sampler2D tDiffuse;
  uniform sampler2D tFluid;
  uniform int debug;

  vec4 getRGB(sampler2D source, vec2 uv, float angle, float amount) {
    vec2 offset = vec2(cos(angle), sin(angle)) * amount;
    vec4 red = texture2D(source, uv + offset);
    vec4 green = texture2D(source, uv);
    vec4 blue = texture2D(source, uv - offset);
    return vec4(red.r, green.g, blue.b, green.a);
  }

  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void mainUv(inout vec2 uv) {
    vec3 fluid = texture2D(tFluid, uv).rgb;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 fluid = texture2D(tFluid, vUv).rgb;
    vec4 diffuse = texture2D(tDiffuse, uv);
    vec4 aberration = getRGB(tDiffuse, uv, PI / 4.0, 0.005);
    vec3 hsvAberration = rgb2hsv(aberration.rgb);
    hsvAberration.y *= 1.2;
    vec4 rgbAberration = vec4(hsv2rgb(hsvAberration), aberration.a);
    vec4 color = mix(diffuse, rgbAberration, fluid.b);
    color = diffuse;
    outputColor = inputColor;
    outputColor = color;
  }
`;

function isIosDevice() {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function makeShaderMesh(geometry, fragmentShader, uniforms) {
  return new Mesh(
    geometry,
    new ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    }),
  );
}

class FullscreenTriangle extends BufferGeometry {
  constructor() {
    super();
    this.setAttribute(
      "position",
      new Float32BufferAttribute(
        new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
        3,
      ),
    );
    this.setAttribute(
      "uv",
      new Float32BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2),
    );
  }

  computeBoundingSphere() {
    this.boundingSphere ??= new Sphere();
    const positions = this.attributes.position.array;
    const count = positions.length / 3;
    let minX = positions[0];
    let minY = positions[1];
    let maxX = minX;
    let maxY = minY;

    for (let index = 0; index < count; index += 1) {
      const x = positions[index * 3];
      const y = positions[index * 3 + 1];
      minX = Math.min(x, minX);
      minY = Math.min(y, minY);
      maxX = Math.max(x, maxX);
      maxY = Math.max(y, maxY);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    this.boundingSphere.center.set(minX + width / 2, minY + height / 2, 0);
    this.boundingSphere.radius = Math.sqrt(width * width + height * height) / 2;
  }

  computeBoundingBox() {
    this.boundingBox ??= new Box3();
    const positions = this.attributes.position.array;
    let minX = positions[0];
    let minY = positions[1];
    let maxX = minX;
    let maxY = minY;

    for (let index = 0; index < positions.length / 3; index += 1) {
      const x = positions[index * 3];
      const y = positions[index * 3 + 1];
      minX = Math.min(x, minX);
      minY = Math.min(y, minY);
      maxX = Math.max(x, maxX);
      maxY = Math.max(y, maxY);
    }

    this.boundingBox.min.set(minX, minY, 0);
    this.boundingBox.max.set(maxX, maxY, 0);
  }
}

class PointerPosition extends Vector2 {
  constructor(x = 0, y = 0) {
    super(x, y);
    this.isInit = false;
  }
}

class FluidSimulation {
  static instances = new WeakMap();

  constructor(renderer) {
    this.renderer = renderer;
    this.simulationResolution = 128;
    this.densityResolution = 512;
    this.iterations = 5;
    this.densityDissipation = 0.97;
    this.velocityDissipation = 0.98;
    this.pressureDissipation = 0.8;
    this.curlStrength = 30;
    this.radius = 0.25;
    this.splats = [];
    this.pointer = new PointerPosition();
    this.lastPointer = new PointerPosition();
    this.viewport = new Vector2();
    this.triangle = new FullscreenTriangle();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.updateMouse = this.updateMouse.bind(this);
    this.updateSize = this.updateSize.bind(this);

    const texelSize = {
      value: new Vector2(
        1 / this.simulationResolution,
        1 / this.simulationResolution,
      ),
    };
    const supportsLinearFloat = renderer.extensions.get(
      `OES_texture_${
        renderer.capabilities.isWebGL2 && !isIosDevice() ? "" : "half_"
      }float_linear`,
    );
    const halfFloatExtension =
      renderer.capabilities.isWebGL2 && !isIosDevice()
        ? null
        : renderer.extensions.get("OES_texture_half_float");

    if (!renderer.capabilities.isWebGL2 && !halfFloatExtension) {
      throw new Error(
        "The fluid postprocessing effect requires half-float textures.",
      );
    }

    const textureType =
      renderer.capabilities.isWebGL2 && !isIosDevice()
        ? HalfFloatType
        : halfFloatExtension.HALF_FLOAT_OES;
    const filter = supportsLinearFloat ? LinearFilter : NearestFilter;

    this.density = this.createDoubleFramebuffer(
      this.densityResolution,
      this.densityResolution,
      {
        type: textureType,
        format: RGBAFormat,
        minFilter: filter,
        depthBuffer: false,
      },
    );
    this.velocity = this.createDoubleFramebuffer(
      this.simulationResolution,
      this.simulationResolution,
      {
        type: textureType,
        format: RGFormat,
        minFilter: filter,
        depthBuffer: false,
      },
    );
    this.pressure = this.createDoubleFramebuffer(
      this.simulationResolution,
      this.simulationResolution,
      {
        type: textureType,
        format: RedFormat,
        minFilter: NearestFilter,
        depthBuffer: false,
      },
    );
    this.divergence = new WebGLRenderTarget(
      this.simulationResolution,
      this.simulationResolution,
      {
        type: textureType,
        format: RedFormat,
        minFilter: NearestFilter,
        generateMipmaps: false,
        depthBuffer: false,
      },
    );
    this.curl = new WebGLRenderTarget(
      this.simulationResolution,
      this.simulationResolution,
      {
        type: textureType,
        format: RedFormat,
        minFilter: NearestFilter,
        generateMipmaps: false,
        depthBuffer: false,
      },
    );

    this.clearProgram = makeShaderMesh(this.triangle, clearShader, {
      texelSize,
      uTexture: { value: null },
      value: { value: this.pressureDissipation },
    });
    this.splatProgram = makeShaderMesh(this.triangle, splatShader, {
      texelSize,
      uTarget: { value: null },
      aspectRatio: { value: 1 },
      color: { value: new Vector3() },
      point: { value: new Vector2() },
      radius: { value: 1 },
    });
    this.advectionProgram = makeShaderMesh(
      this.triangle,
      supportsLinearFloat ? fastAdvectionShader : advectionShader,
      {
        texelSize,
        dyeTexelSize: {
          value: new Vector2(
            1 / this.densityResolution,
            1 / this.densityResolution,
          ),
        },
        uVelocity: { value: null },
        uSource: { value: null },
        dt: { value: 0.016 },
        dissipation: { value: 1 },
      },
    );
    this.divergenceProgram = makeShaderMesh(this.triangle, divergenceShader, {
      texelSize,
      uVelocity: { value: null },
    });
    this.curlProgram = makeShaderMesh(this.triangle, curlShader, {
      texelSize,
      uVelocity: { value: null },
    });
    this.vorticityProgram = makeShaderMesh(this.triangle, vorticityShader, {
      texelSize,
      uVelocity: { value: null },
      uCurl: { value: null },
      curl: { value: this.curlStrength },
      dt: { value: 0.016 },
    });
    this.pressureProgram = makeShaderMesh(this.triangle, pressureShader, {
      texelSize,
      uPressure: { value: null },
      uDivergence: { value: null },
    });
    this.gradientSubtractProgram = makeShaderMesh(
      this.triangle,
      gradientSubtractShader,
      {
        texelSize,
        uPressure: { value: null },
        uVelocity: { value: null },
      },
    );

    if ("ontouchstart" in window) {
      window.addEventListener("touchstart", this.updateMouse, false);
      window.addEventListener("touchmove", this.updateMouse, false);
    } else {
      window.addEventListener("mousemove", this.updateMouse, false);
    }
    window.addEventListener("resize", this.updateSize, false);
    this.updateSize();
  }

  static getInstance(renderer) {
    let instance = FluidSimulation.instances.get(renderer);
    if (!instance) {
      instance = new FluidSimulation(renderer);
      FluidSimulation.instances.set(renderer, instance);
    }
    return instance;
  }

  createDoubleFramebuffer(width, height, options) {
    const targetOptions = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: false,
      ...options,
    };
    const framebuffer = {
      read: new WebGLRenderTarget(width, height, targetOptions),
      write: new WebGLRenderTarget(width, height, targetOptions),
      swap() {
        const read = this.read;
        this.read = this.write;
        this.write = read;
      },
    };
    return framebuffer;
  }

  updateSize() {
    this.viewport.set(window.innerWidth, window.innerHeight);
  }

  updateMouse(event) {
    if (
      window.TouchEvent &&
      event instanceof TouchEvent &&
      event.changedTouches?.length
    ) {
      this.pointer.set(
        event.changedTouches[0].pageX,
        event.changedTouches[0].pageY,
      );
    }
    if (event instanceof MouseEvent) {
      this.pointer.set(event.pageX, event.pageY);
    }
    if (!this.lastPointer.isInit) {
      this.lastPointer.isInit = true;
      this.lastPointer.copy(this.pointer);
    }

    const deltaX = this.pointer.x - this.lastPointer.x;
    const deltaY = this.pointer.y - this.lastPointer.y;
    this.lastPointer.copy(this.pointer);
    if (Math.abs(deltaX) || Math.abs(deltaY)) {
      this.splats.push({
        x: this.pointer.x / this.viewport.x,
        y: 1 - this.pointer.y / this.viewport.y,
        dx: deltaX * 5,
        dy: deltaY * -5,
      });
    }
  }

  splat({ x, y, dx, dy }) {
    const { renderer } = this;
    this.splatProgram.material.uniforms.uTarget.value =
      this.velocity.read.texture;
    this.splatProgram.material.uniforms.aspectRatio.value =
      this.viewport.x / this.viewport.y;
    this.splatProgram.material.uniforms.point.value.set(x, y);
    this.splatProgram.material.uniforms.color.value.set(dx, dy, 1);
    this.splatProgram.material.uniforms.radius.value = this.radius / 100;
    renderer.setRenderTarget(this.velocity.write);
    renderer.render(this.splatProgram, this.camera);
    renderer.setRenderTarget(null);
    this.velocity.swap();

    this.splatProgram.material.uniforms.uTarget.value =
      this.density.read.texture;
    renderer.setRenderTarget(this.density.write);
    renderer.render(this.splatProgram, this.camera);
    renderer.setRenderTarget(null);
    this.density.swap();
  }

  update(renderer = this.renderer) {
    renderer.autoClear = false;
    for (let index = this.splats.length - 1; index >= 0; index -= 1) {
      this.splat(this.splats.splice(index, 1)[0]);
    }

    this.curlProgram.material.uniforms.uVelocity.value =
      this.velocity.read.texture;
    renderer.setRenderTarget(this.curl);
    renderer.render(this.curlProgram, this.camera);
    renderer.setRenderTarget(null);

    this.vorticityProgram.material.uniforms.uVelocity.value =
      this.velocity.read.texture;
    this.vorticityProgram.material.uniforms.uCurl.value = this.curl.texture;
    renderer.setRenderTarget(this.velocity.write);
    renderer.render(this.vorticityProgram, this.camera);
    renderer.setRenderTarget(null);
    this.velocity.swap();

    this.divergenceProgram.material.uniforms.uVelocity.value =
      this.velocity.read.texture;
    renderer.setRenderTarget(this.divergence);
    renderer.render(this.divergenceProgram, this.camera);
    renderer.setRenderTarget(null);

    this.clearProgram.material.uniforms.uTexture.value =
      this.pressure.read.texture;
    this.clearProgram.material.uniforms.value.value = this.pressureDissipation;
    renderer.setRenderTarget(this.pressure.write);
    renderer.render(this.clearProgram, this.camera);
    renderer.setRenderTarget(null);
    this.pressure.swap();

    this.pressureProgram.material.uniforms.uDivergence.value =
      this.divergence.texture;
    for (let index = 0; index < this.iterations; index += 1) {
      this.pressureProgram.material.uniforms.uPressure.value =
        this.pressure.read.texture;
      renderer.setRenderTarget(this.pressure.write);
      renderer.render(this.pressureProgram, this.camera);
      renderer.setRenderTarget(null);
      this.pressure.swap();
    }

    this.gradientSubtractProgram.material.uniforms.uPressure.value =
      this.pressure.read.texture;
    this.gradientSubtractProgram.material.uniforms.uVelocity.value =
      this.velocity.read.texture;
    renderer.setRenderTarget(this.velocity.write);
    renderer.render(this.gradientSubtractProgram, this.camera);
    renderer.setRenderTarget(null);
    this.velocity.swap();

    const advectionUniforms = this.advectionProgram.material.uniforms;
    advectionUniforms.dyeTexelSize.value.set(
      1 / this.simulationResolution,
      1 / this.simulationResolution,
    );
    advectionUniforms.uVelocity.value = this.velocity.read.texture;
    advectionUniforms.uSource.value = this.velocity.read.texture;
    advectionUniforms.dissipation.value = this.velocityDissipation;
    renderer.setRenderTarget(this.velocity.write);
    renderer.render(this.advectionProgram, this.camera);
    renderer.setRenderTarget(null);
    this.velocity.swap();

    advectionUniforms.dyeTexelSize.value.set(
      1 / this.densityResolution,
      1 / this.densityResolution,
    );
    advectionUniforms.uVelocity.value = this.velocity.read.texture;
    advectionUniforms.uSource.value = this.density.read.texture;
    advectionUniforms.dissipation.value = this.densityDissipation;
    renderer.setRenderTarget(this.density.write);
    renderer.render(this.advectionProgram, this.camera);
    renderer.setRenderTarget(null);
    this.density.swap();

    this.renderer.autoClear = true;
  }

  get densityTexture() {
    return this.density.read.texture;
  }
}

class FluidEffect extends Effect {
  constructor(renderer, settings) {
    super("FluidEffect", fluidEffectShader, {
      uniforms: new Map([
        ["tDiffuse", new Uniform(null)],
        ["tFluid", new Uniform(null)],
        ["debug", new Uniform(Number(settings.debug))],
      ]),
    });
    this.simulation = FluidSimulation.getInstance(renderer);
    this.iterations = settings.iterations;
    this.densityDissipation = settings.densityDissipation;
    this.velocityDissipation = settings.velocityDissipation;
    this.pressureDissipation = settings.pressureDissipation;
    this.curlStrength = settings.curlStrength;
    this.radius = settings.radius;
    this.debug = settings.debug;
  }

  update(renderer, inputBuffer) {
    this.simulation.update(renderer);
    this.uniforms.get("tDiffuse").value = inputBuffer.texture;
    this.uniforms.get("tFluid").value = this.simulation.densityTexture;
    this.uniforms.get("debug").value = Number(this.debug);
  }

  set iterations(value) {
    this.simulation.iterations = value;
  }

  set densityDissipation(value) {
    this.simulation.densityDissipation = value;
  }

  set velocityDissipation(value) {
    this.simulation.velocityDissipation = value;
  }

  set pressureDissipation(value) {
    this.simulation.pressureDissipation = value;
  }

  set curlStrength(value) {
    this.simulation.curlStrength = value;
  }

  set radius(value) {
    this.simulation.radius = value;
  }

  set debug(value) {
    this.debugEnabled = value;
  }

  get debug() {
    return this.debugEnabled;
  }
}

const Fluid = React.forwardRef(function FluidEffectPrimitive(
  { settings },
  ref,
) {
  const renderer = useThree((state) => state.gl);
  const effect = React.useMemo(
    () => new FluidEffect(renderer, settings),
    [renderer, settings],
  );
  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default Fluid;
