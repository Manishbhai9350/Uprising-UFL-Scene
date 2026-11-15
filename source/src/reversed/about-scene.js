import { r as React } from "../react.js";
import { a as useFrame, u as useThree } from "../react-fiber.js";
import {
  af as Box3,
  r as Vector2,
  V as Vector3,
  y as RepeatWrapping,
} from "../three.js";
import { calculateCameraFov } from "./render-pipeline.js";
import { ReflectorMaterial } from "./ground.js";
import Sparkles from "./sparkles.js";

const createElement = React.createElement;
const CAMERA_MOTION_RANGE = 7.6;
const INTRO_DURATION = 3;

function requireAsset(assets, name) {
  const asset = assets.get(name);
  if (!asset) {
    throw new Error(`About asset "${name}" was not loaded.`);
  }
  return asset;
}

function requireMesh(scene, name) {
  const object = scene.getObjectByName(name);
  if (!object?.geometry) {
    throw new Error(`About model is missing the "${name}" mesh.`);
  }
  return object;
}

function cloneGeometryWithUv2(geometry, name) {
  const clone = geometry.clone();
  const uv = clone.getAttribute("uv");
  if (!uv) {
    throw new Error(`About model mesh "${name}" has no UV coordinates.`);
  }
  clone.setAttribute("uv2", uv.clone());
  return clone;
}

function AboutModel({ assets, settings, scrollProgress }) {
  const model = requireAsset(assets, "underground.model").scene;
  const surfaces = React.useMemo(() => {
    model.updateMatrixWorld(true);
    return {
      logo: requireMesh(model, "logo"),
      cubes: requireMesh(model, "cubes"),
      cables: requireMesh(model, "cables"),
      connectors: requireMesh(model, "connectors"),
      panels: requireMesh(model, "white-panels"),
    };
  }, [model]);
  const cubeGeometry = React.useMemo(
    () => cloneGeometryWithUv2(surfaces.cubes.geometry, "cubes"),
    [surfaces.cubes],
  );
  const connectorGeometry = React.useMemo(
    () => cloneGeometryWithUv2(surfaces.connectors.geometry, "connectors"),
    [surfaces.connectors],
  );
  const lightSettings = React.useMemo(() => {
    const bounds = new Box3().setFromObject(surfaces.panels);
    const height = bounds.max.y - bounds.min.y;
    return {
      position: new Vector3(
        0,
        -height / 2 + surfaces.panels.position.y,
        0,
      ),
      width: bounds.max.x - bounds.min.x,
      height,
    };
  }, [surfaces.panels]);

  const envMap = requireAsset(assets, settings.envMapRef);
  const aoMap = requireAsset(assets, settings.aoMapRef);
  const bumpMap = requireAsset(assets, settings.bumpMapRef);
  const normalMap = requireAsset(assets, settings.normalMapRef);
  const roughnessMap = requireAsset(assets, settings.roughnessMapRef);
  const reflector = React.useRef(null);
  const reflectorMaterial = React.useRef(null);
  const fog = React.useRef(null);
  const elapsed = React.useRef(0);
  const normalScale = React.useMemo(() => new Vector2(0.08, 0.08), []);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const progress = Math.max(0, Math.min(scrollProgress.current, 1));
    const cameraMotion = -1 - CAMERA_MOTION_RANGE * progress;
    if (fog.current) {
      fog.current.near = settings.fogNear - cameraMotion * 0.2;
      fog.current.far = settings.fogFar - cameraMotion * 0.2;
    }

    if (reflector.current?.userData.active && reflectorMaterial.current) {
      reflectorMaterial.current.normalMap.offset.x =
        0.2 * Math.cos(elapsed.current * 0.1);
      reflectorMaterial.current.normalMap.offset.y =
        0.1 * Math.sin(elapsed.current * 0.2);
    }
  });

  const sparkleSettings = assets
    .get("config")
    .scene.components.find((component) => component.name === "Sparkles");
  if (!sparkleSettings) {
    throw new Error("About scene has no configured Sparkles component.");
  }

  return createElement(
    React.Fragment,
    null,
    createElement("fog", {
      ref: fog,
      attach: "fog",
      color: settings.fogColor,
      near: settings.fogNear,
      far: settings.fogFar,
    }),
    createElement(
      "mesh",
      {
        ref: reflector,
        name: "Reflector",
        position: [0, -0.39, 0],
        rotation: [Math.PI / 2, 0, 0],
        userData: { active: true },
      },
      createElement("planeGeometry", { args: [10, 10] }),
      createElement(ReflectorMaterial, {
        materialRef: reflectorMaterial,
        mirror: 0.92,
        mixBlur: 0,
        blur: [0, 0],
        resolution: 512,
        normalMap,
        "normalMap-repeat": [8, 8],
        "normalMap-wrapS": RepeatWrapping,
        "normalMap-wrapT": RepeatWrapping,
        normalScale,
        color: "#ffffff",
        metalness: 0.98,
        roughness: 0.98,
        mixStrength: 18,
        mixContrast: 0.98,
      }),
    ),
    createElement(
      "group",
      null,
      createElement("rectAreaLight", {
        color: settings.lightColor,
        intensity: settings.lightIntensity,
        rotation: [0, -Math.PI, 0],
        ...lightSettings,
      }),
      createElement(
        "mesh",
        {
          geometry: surfaces.panels.geometry,
          position: surfaces.panels.position,
          rotation: surfaces.panels.rotation,
          scale: surfaces.panels.scale,
        },
        createElement("meshStandardMaterial", {
          color: settings.panelsColor,
          emissive: settings.panelsEmissive,
          emissiveIntensity: settings.panelsEmissiveIntensity,
          roughness: 1,
          metalness: 1,
          toneMapped: false,
        }),
      ),
    ),
    createElement(
      "mesh",
      {
        geometry: cubeGeometry,
        position: surfaces.cubes.position,
        rotation: surfaces.cubes.rotation,
        scale: surfaces.cubes.scale,
      },
      createElement("meshStandardMaterial", {
        color: settings.boxesColor,
        emissive: settings.boxesEmissive,
        roughness: settings.boxesRoughness,
        metalness: settings.boxesMetalness,
        aoMap,
        aoMapIntensity: settings.boxesAoMapIntensity,
        envMap,
        bumpMap,
        bumpScale: settings.boxesBumpMapScale,
        "bumpMap-repeat": [2, 2],
        "bumpMap-wrapS": RepeatWrapping,
        "bumpMap-wrapT": RepeatWrapping,
        roughnessMap,
        "roughnessMap-wrapS": RepeatWrapping,
        "roughnessMap-wrapT": RepeatWrapping,
        "roughnessMap-repeat": [2, 2],
      }),
    ),
    createElement(
      "mesh",
      {
        geometry: connectorGeometry,
        position: surfaces.connectors.position,
        rotation: surfaces.connectors.rotation,
        scale: surfaces.connectors.scale,
      },
      createElement("meshStandardMaterial", {
        color: settings.boxesColor,
        emissive: settings.boxesEmissive,
        roughness: settings.boxesRoughness,
        metalness: settings.boxesMetalness,
        aoMap,
        aoMapIntensity: settings.boxesAoMapIntensity,
        envMap,
        bumpMap,
        bumpScale: settings.boxesBumpMapScale,
        "bumpMap-repeat": [1, 1],
        "bumpMap-wrapS": RepeatWrapping,
        "bumpMap-wrapT": RepeatWrapping,
        roughnessMap,
        "roughnessMap-wrapS": RepeatWrapping,
        "roughnessMap-wrapT": RepeatWrapping,
        "roughnessMap-repeat": [1, 1],
      }),
    ),
    createElement(
      "mesh",
      {
        geometry: surfaces.cables.geometry,
        position: surfaces.cables.position,
        rotation: surfaces.cables.rotation,
        scale: surfaces.cables.scale,
      },
      createElement("meshStandardMaterial", {
        color: "#ffffff",
        emissive: "#000000",
        emissiveIntensity: 1,
        roughness: 0.5,
        metalness: 0,
      }),
    ),
    createElement(
      "mesh",
      {
        geometry: surfaces.logo.geometry,
        position: surfaces.logo.position,
        rotation: surfaces.logo.rotation,
        scale: surfaces.logo.scale,
      },
      createElement("meshStandardMaterial", {
        color: "#000000",
        emissive: "#000000",
        roughness: 1,
        metalness: 1,
      }),
    ),
    createElement(Sparkles, { assets, settings: sparkleSettings }),
  );
}

export function AboutCamera({ settings, scrollProgress }) {
  const camera = useThree((state) => state.camera);
  const pointer = React.useRef({ x: 0, y: 0 });
  const pointerOffset = React.useRef({ x: 0, y: 0 });
  const upTargetX = React.useRef(0);
  const introStart = React.useRef(null);

  React.useLayoutEffect(() => {
    camera.position.set(-3, 0, 2);
    camera.near = settings.near;
    camera.far = settings.far;
    camera.fov = calculateCameraFov(window.innerWidth, settings.fov);
    camera.updateProjectionMatrix();

    function updateFov() {
      camera.fov = calculateCameraFov(window.innerWidth, settings.fov);
      camera.updateProjectionMatrix();
    }

    function updatePointer(event) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y =
        (-(event.clientY / window.innerHeight) * 2 + 1) * 0.2;
      upTargetX.current = Math.max(
        -0.3 * .06,
        Math.min(pointer.current.x, 0.3 * .06),
      );
    }

    window.addEventListener("resize", updateFov);
    window.addEventListener("pointermove", updatePointer);

    return () => {
      window.removeEventListener("resize", updateFov);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, [camera, settings.far, settings.fov, settings.near]);

  useFrame((state, delta) => {
    if (introStart.current === null) {
      introStart.current = state.clock.elapsedTime;
    }
    const progress = Math.min(
      (state.clock.elapsedTime - introStart.current) / INTRO_DURATION,
      1,
    );
    const easedProgress = 1 - (1 - progress) ** 2;
    const scroll = Math.max(0, Math.min(scrollProgress.current, 1));
    const motion = -1 - CAMERA_MOTION_RANGE * scroll;
    const baseY = window.innerWidth < 768 ? -0.25 : 0;
    const smoothing = Math.min(delta * 2, 1);

    pointerOffset.current.x +=
      (pointer.current.x - pointerOffset.current.x) * smoothing;
    pointerOffset.current.y +=
      (pointer.current.y - pointerOffset.current.y) * smoothing;
    state.camera.position.set(
      -3 * (1 - easedProgress) +
        pointerOffset.current.x * easedProgress,
      baseY +
        motion * easedProgress +
        pointerOffset.current.y * easedProgress,
      2 * (1 - easedProgress) + 4.3 * easedProgress,
    );
    state.camera.up.x += (upTargetX.current - state.camera.up.x) * delta;
    state.camera.lookAt(0, baseY + motion * 0.9, 0);
  });

  return null;
}

export default function AboutScene({ assets, scrollProgress }) {
  const underground = assets
    .get("config")
    .scene.components.find((component) => component.name === "Underground");
  if (!underground) {
    throw new Error("About scene has no configured Underground component.");
  }

  return createElement(AboutModel, {
    assets,
    settings: underground,
    scrollProgress,
  });
}
