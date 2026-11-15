import { r as React } from "../react.js";
import {
  a as useFrame,
  e as extend,
  f as BlurPass,
  M as MeshReflectorMaterialImpl,
  u as useThree,
} from "../react-fiber.js";
import {
  az as WebGLRenderTarget,
  w as LinearFilter,
  aw as HalfFloatType,
  aC as DepthTexture,
  b7 as DepthFormat,
  b8 as UnsignedIntType,
  V as Vector3,
  M as Matrix4,
  ap as Vector4,
  X as PerspectiveCamera,
  b6 as Plane,
  r as Vector2,
  y as RepeatWrapping,
} from "../three.js";

const createElement = React.createElement;

function requireAsset(assets, name) {
  const asset = assets.get(name);
  if (!asset) {
    throw new Error(`Homepage asset "${name}" was not loaded.`);
  }
  return asset;
}

export function ReflectorMaterial({
  materialRef,
  blur = [0, 0],
  resolution = 256,
  minDepthThreshold = 0.9,
  maxDepthThreshold = 1,
  depthScale = 0,
  depthToBlurRatioBias = 0.25,
  mixBlur = 0,
  mixStrength = 1,
  mirror = 0,
  distortion = 1,
  mixContrast = 1,
  distortionMap,
  reflectorOffset = 0,
  ...materialSettings
}) {
  React.useMemo(() => extend({ MeshReflectorMaterialImpl }), []);

  const renderer = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const blurWidth = Array.isArray(blur) ? blur[0] : blur;
  const blurHeight = Array.isArray(blur) ? blur[1] : blur;
  const hasBlur = blurWidth + blurHeight > 0;
  const material = React.useRef(null);
  const [reflectorPlane] = React.useState(() => new Plane());
  const [reflectorPosition] = React.useState(() => new Vector3());
  const [cameraPosition] = React.useState(() => new Vector3());
  const [rotationMatrix] = React.useState(() => new Matrix4());
  const [reflectorNormal] = React.useState(() => new Vector3(0, 0, -1));
  const [cameraForward] = React.useState(() => new Vector3());
  const [clipPlane] = React.useState(() => new Vector4());
  const [viewPosition] = React.useState(() => new Vector3());
  const [targetPosition] = React.useState(() => new Vector3());
  const [clipPosition] = React.useState(() => new Vector4());
  const [textureMatrix] = React.useState(() => new Matrix4());
  const [reflectionCamera] = React.useState(() => new PerspectiveCamera());

  const updateReflectionCamera = React.useCallback(() => {
    const reflector = material.current?.parent || material.current?.__r3f?.parent;
    if (!reflector) return;

    reflectorPosition.setFromMatrixPosition(reflector.matrixWorld);
    cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    rotationMatrix.extractRotation(reflector.matrixWorld);
    reflectorNormal.set(0, 0, 1).applyMatrix4(rotationMatrix);
    reflectorPosition.addScaledVector(reflectorNormal, reflectorOffset);
    viewPosition.subVectors(reflectorPosition, cameraPosition);
    if (viewPosition.dot(reflectorNormal) > 0) return;

    viewPosition.reflect(reflectorNormal).negate().add(reflectorPosition);
    rotationMatrix.extractRotation(camera.matrixWorld);
    cameraForward.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraPosition);
    targetPosition.subVectors(reflectorPosition, cameraForward);
    targetPosition.reflect(reflectorNormal).negate().add(reflectorPosition);

    reflectionCamera.position.copy(viewPosition);
    reflectionCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix);
    reflectionCamera.up.reflect(reflectorNormal);
    reflectionCamera.lookAt(targetPosition);
    reflectionCamera.far = camera.far;
    reflectionCamera.updateMatrixWorld();
    reflectionCamera.projectionMatrix.copy(camera.projectionMatrix);

    textureMatrix.set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1,
    );
    textureMatrix.multiply(reflectionCamera.projectionMatrix);
    textureMatrix.multiply(reflectionCamera.matrixWorldInverse);
    textureMatrix.multiply(reflector.matrixWorld);

    reflectorPlane.setFromNormalAndCoplanarPoint(
      reflectorNormal,
      reflectorPosition,
    );
    reflectorPlane.applyMatrix4(reflectionCamera.matrixWorldInverse);
    clipPlane.set(
      reflectorPlane.normal.x,
      reflectorPlane.normal.y,
      reflectorPlane.normal.z,
      reflectorPlane.constant,
    );

    const projectionElements = reflectionCamera.projectionMatrix.elements;
    clipPosition.set(
      (Math.sign(clipPlane.x) + projectionElements[8]) / projectionElements[0],
      (Math.sign(clipPlane.y) + projectionElements[9]) / projectionElements[5],
      -1,
      (1 + projectionElements[10]) / projectionElements[14],
    );
    clipPlane.multiplyScalar(2 / clipPlane.dot(clipPosition));
    projectionElements[2] = clipPlane.x;
    projectionElements[6] = clipPlane.y;
    projectionElements[10] = clipPlane.z + 1;
    projectionElements[14] = clipPlane.w;
  }, [
    camera,
    reflectorOffset,
    reflectorPlane,
    reflectorPosition,
    cameraPosition,
    rotationMatrix,
    reflectorNormal,
    cameraForward,
    viewPosition,
    targetPosition,
    reflectionCamera,
    textureMatrix,
    clipPlane,
    clipPosition,
  ]);

  const [reflectionTarget, blurTarget, blurPass, reflectorSettings] =
    React.useMemo(() => {
      const targetOptions = {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        type: HalfFloatType,
      };
      const reflection = new WebGLRenderTarget(
        resolution,
        resolution,
        targetOptions,
      );
      reflection.depthBuffer = true;
      reflection.depthTexture = new DepthTexture(resolution, resolution);
      reflection.depthTexture.format = DepthFormat;
      reflection.depthTexture.type = UnsignedIntType;

      const blurred = new WebGLRenderTarget(
        resolution,
        resolution,
        targetOptions,
      );
      const pass = new BlurPass({
        gl: renderer,
        resolution,
        width: blurWidth,
        height: blurHeight,
        minDepthThreshold,
        maxDepthThreshold,
        depthScale,
        depthToBlurRatioBias,
      });

      return [
        reflection,
        blurred,
        pass,
        {
          mirror,
          textureMatrix,
          mixBlur,
          tDiffuse: reflection.texture,
          tDepth: reflection.depthTexture,
          tDiffuseBlur: blurred.texture,
          hasBlur,
          mixStrength,
          minDepthThreshold,
          maxDepthThreshold,
          depthScale,
          depthToBlurRatioBias,
          distortion,
          distortionMap,
          mixContrast,
          "defines-USE_BLUR": hasBlur ? "" : undefined,
          "defines-USE_DEPTH": depthScale > 0 ? "" : undefined,
          "defines-USE_DISTORTION": distortionMap ? "" : undefined,
        },
      ];
    }, [
      renderer,
      blurWidth,
      blurHeight,
      textureMatrix,
      resolution,
      mirror,
      hasBlur,
      mixBlur,
      mixStrength,
      minDepthThreshold,
      maxDepthThreshold,
      depthScale,
      depthToBlurRatioBias,
      distortion,
      distortionMap,
      mixContrast,
    ]);

  useFrame(() => {
    const reflector = material.current?.parent || material.current?.__r3f?.parent;
    if (!reflector || !reflector.userData.active) return;

    const wasVisible = reflector.visible;
    const xrEnabled = renderer.xr.enabled;
    const shadowMapAutoUpdate = renderer.shadowMap.autoUpdate;
    reflector.visible = false;

    try {
      updateReflectionCamera();
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(reflectionTarget);
      renderer.state.buffers.depth.setMask(true);
      if (!renderer.autoClear) renderer.clear();
      renderer.render(scene, reflectionCamera);
      if (hasBlur) blurPass.render(renderer, reflectionTarget, blurTarget);
    } finally {
      renderer.xr.enabled = xrEnabled;
      renderer.shadowMap.autoUpdate = shadowMapAutoUpdate;
      reflector.visible = wasVisible;
      renderer.setRenderTarget(null);
    }
  });

  const setMaterialRef = React.useCallback(
    (instance) => {
      material.current = instance;
      materialRef.current = instance;
    },
    [materialRef],
  );

  const materialKey = [
    reflectorSettings["defines-USE_BLUR"],
    reflectorSettings["defines-USE_DEPTH"],
    reflectorSettings["defines-USE_DISTORTION"],
  ].join("");

  return createElement("meshReflectorMaterialImpl", {
    ref: setMaterialRef,
    attach: "material",
    ...reflectorSettings,
    ...materialSettings,
    key: `reflector-${materialKey}`,
  });
}

export default function ReflectiveGround({ assets, settings }) {
  const plane = requireAsset(assets, settings.geometry).scene?.children[0];
  console.log(plane)
  if (!plane?.geometry) {
    throw new Error(
      `Homepage ground "${settings.geometry}" has no first-child mesh geometry.`,
    );
  }

  const normalMap = requireAsset(assets, settings.normal);
  const ground = React.useRef(null);
  const material = React.useRef(null);
  const elapsed = React.useRef(0);
  const normalScale = React.useMemo(
    () => new Vector2().setScalar(settings.normalScale),
    [settings.normalScale],
  );

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (!ground.current?.userData.active || !material.current) return;

    material.current.normalMap.offset.x = 0.2 * Math.cos(elapsed.current * 0.1);
    material.current.normalMap.offset.y = 0.1 * Math.sin(elapsed.current * 0.2);
  });

  return createElement(
    "mesh",
    {
      ref: ground,
      name: "Reflector",
      position: plane.position,
      rotation: [-Math.PI / 2, 0, 0],
      visible: settings.visible,
      userData: { active: true },
    },
    createElement("planeGeometry", { args: [10, 10] }),
    createElement(ReflectorMaterial, {
      materialRef: material,
      blur: [0, 0],
      resolution: 512,
      mirror: settings.mirror,
      mixStrength: settings.mixStrength,
      mixContrast: settings.mixContrast,
      color: settings.color,
      metalness: settings.metalness,
      roughness: settings.roughness,
      normalMap,
      "normalMap-wrapS": RepeatWrapping,
      "normalMap-wrapT": RepeatWrapping,
      "normalMap-repeat": [settings.repeat, settings.repeat],
      normalScale,
    }),
  );
}
