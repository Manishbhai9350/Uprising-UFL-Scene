import { r as React } from "../react.js";

const createElement = React.createElement;

function requireAsset(assets, name) {
  const asset = assets.get(name);
  if (!asset) {
    throw new Error(`Homepage asset "${name}" was not loaded.`);
  }
  return asset;
}

export default function HomepageScene({ assets }) {
  const configuration = requireAsset(assets, "config");
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
  const {
    uuid: _uuid,
    name: _name,
    geometry: _geometry,
    envMapRef: _envMapRef,
    ...materialSettings
  } = modelConfiguration;

  return createElement(
    "group",
    { name: "uprising-homepage" },
    createElement(
      "mesh",
      { name: "model", geometry: sourceMesh.geometry },
      createElement("meshStandardMaterial", {
        ...materialSettings,
        envMap: environment,
      }),
    ),
  );
}
