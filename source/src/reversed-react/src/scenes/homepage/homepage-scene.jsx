import * as React from "react";
import { useFrame } from "@react-three/fiber";
import { Color } from "three";
import ReflectiveGround from "./ground";
import Portal from "./portal";
import Smoke from "./smoke";
import Sparkles from "./sparkles";
import HomepageFog from "./fog";

function requireAsset(assets, name) {
  const asset = assets.get(name);
  if (!asset) {
    throw new Error(`Homepage asset "${name}" was not loaded.`);
  }
  return asset;
}

export default function HomepageScene({ assets, intro }) {
  const configuration = requireAsset(assets, "config");
  const components = configuration.scene.components;
  
  const groundConfiguration = components.find((c) => c.name === "Ground");
  if (!groundConfiguration) {
    throw new Error('Homepage configuration is missing the "Ground" component.');
  }

  const modelConfiguration = components.find((c) => c.name === "BaseModel");
  if (!modelConfiguration) {
    throw new Error('Homepage configuration is missing the "BaseModel" component.');
  }

  const gltf = requireAsset(assets, modelConfiguration.geometry);
  const sourceMesh = gltf.scene?.children[0];
  if (!sourceMesh?.geometry) {
    throw new Error(`Homepage model "${modelConfiguration.geometry}" has no first-child mesh geometry.`);
  }

  const environment = requireAsset(assets, modelConfiguration.envMapRef);
  const modelMaterial = React.useRef(null);
  const modelStart = React.useMemo(() => new Color("#ffffff"), []);
  const modelEnd = new Color(modelConfiguration.emissive);

  const materialSettings = { ...modelConfiguration };
  delete materialSettings.uuid;
  delete materialSettings.name;
  delete materialSettings.geometry;
  delete materialSettings.envMapRef;

  useFrame(() => {
    if (!modelMaterial.current) return;
    const progress = intro?.progress ?? 1;
    modelMaterial.current.emissive.copy(modelStart).lerp(modelEnd, progress);
    modelMaterial.current.emissiveIntensity =
      3.35 + (modelConfiguration.emissiveIntensity - 3.35) * progress;
  });

  let fogElement = null;

  return (
    <group name="uprising-homepage">
      {components.map((component) => {
        switch (component.name) {
          case "Ground":
            return <ReflectiveGround key={component.name} assets={assets} settings={component} />;
          case "Portal":
            return <Portal key={component.name} assets={assets} settings={component} intro={intro} />;
          case "Smoke":
            return <Smoke key={component.name} assets={assets} settings={component} />;
          case "Sparkles":
            return <Sparkles key={component.name} assets={assets} settings={component} />;
          case "BaseModel":
            return (
              <mesh key={component.name} name="model" geometry={sourceMesh.geometry}>
                <meshStandardMaterial
                  ref={modelMaterial}
                  {...materialSettings}
                  emissive={modelStart}
                  emissiveIntensity={3.35}
                  envMap={environment}
                />
              </mesh>
            );
          case "Fog":
            fogElement = <HomepageFog key={component.name} settings={component} intro={intro} />;
            return null;
          default:
            return null;
        }
      })}
      {fogElement}
    </group>
  );
}