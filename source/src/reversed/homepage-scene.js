import { r as React } from "../react.js";
import { a as useFrame } from "../react-fiber.js";
import { j as Color } from "../three.js";
import ReflectiveGround from "./ground.js";
import Portal from "./portal.js";
import Smoke from "./smoke.js";
import Sparkles from "./sparkles.js";
import HomepageFog from "./fog.js";

const createElement = React.createElement;

function requireAsset(assets, name) {
  const asset = assets.get(name);
  if (!asset) {
    throw new Error(`Homepage asset "${name}" was not loaded.`);
  }
  return asset;
}

export default function HomepageScene({ assets, intro }) {
  const configuration = requireAsset(assets, "config");
  console.log(configuration)
  const components = configuration.scene.components;
  const groundConfiguration = configuration.scene.components.find(
    (component) => component.name === "Ground",
  );
  if (!groundConfiguration) {
    throw new Error('Homepage configuration is missing the "Ground" component.');
  }

  const modelConfiguration = configuration.scene.components.find(
    (component) => component.name === "BaseModel",
  );
  if (!modelConfiguration) {
    throw new Error('Homepage configuration is missing the "BaseModel" component.');
  }

  const gltf = requireAsset(assets, modelConfiguration.geometry);
  const sourceMesh = gltf.scene?.children[0];
  if (!sourceMesh?.geometry) {
    throw new Error(
      `Homepage model "${modelConfiguration.geometry}" has no first-child mesh geometry.`,
    );
  }

  const environment = requireAsset(assets, modelConfiguration.envMapRef);
  const modelMaterial = React.useRef(null);
  const modelStart = React.useMemo(() => new Color("#ffffff"), []);
  const modelEnd = React.useMemo(
    () => new Color(modelConfiguration.emissive),
    [modelConfiguration.emissive],
  );
  const {
    uuid: _uuid,
    name: _name,
    geometry: _geometry,
    envMapRef: _envMapRef,
    ...materialSettings
  } = modelConfiguration;

  useFrame(() => {
    if (!modelMaterial.current) return;
    const progress = intro?.progress ?? 1;
    modelMaterial.current.emissive.copy(modelStart).lerp(modelEnd, progress);
    modelMaterial.current.emissiveIntensity =
      3.35 + (modelConfiguration.emissiveIntensity - 3.35) * progress;
  });

  const sceneElements = [];
  let fogElement = null;
  for (const component of components) {
    switch (component.name) {
      case "Ground":
        sceneElements.push(
          createElement(ReflectiveGround, {
            key: component.name,
            assets,
            settings: component,
          }),
        );
        break;
      case "Portal":
        sceneElements.push(
          createElement(Portal, {
            key: component.name,
            assets,
            settings: component,
            intro,
          }),
        );
        break;
      case "Smoke":
        sceneElements.push(
          createElement(Smoke, {
            key: component.name,
            assets,
            settings: component,
          }),
        );
        break;
      case "Sparkles":
        sceneElements.push(
          createElement(Sparkles, {
            key: component.name,
            assets,
            settings: component,
          }),
        );
        break;
      case "BaseModel":
        sceneElements.push(
          createElement(
            "mesh",
            { key: component.name, name: "model", geometry: sourceMesh.geometry },
            createElement("meshStandardMaterial", {
              ref: modelMaterial,
              ...materialSettings,
              emissive: modelStart,
              emissiveIntensity: 3.35,
              envMap: environment,
            }),
          ),
        );
        break;
      case "Fog":
        fogElement = createElement(HomepageFog, {
          key: component.name,
          settings: component,
          intro,
        });
        break;
      default:
        break;
    }
  }

  return createElement(
    React.Fragment,
    null,
    createElement(
      "group",
      { name: "uprising-homepage" },
      ...sceneElements,
    ),
    fogElement,
  );
}
