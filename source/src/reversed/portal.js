import { r as React } from "../react.js";
import { a as useFrame } from "../react-fiber.js";
import { af as Box3, j as Color } from "../three.js";

const createElement = React.createElement;
const WHITE = "#ffffff";

function requireAsset(assets, name) {
  const asset = assets.get(name);
  if (!asset) {
    throw new Error(`Homepage asset "${name}" was not loaded.`);
  }
  return asset;
}

export default function Portal({ assets, settings, intro }) {
  const root = requireAsset(assets, settings.geometry).scene?.children[0];
  if (!root) {
    throw new Error(
      `Homepage portal "${settings.geometry}" has no scene root.`,
    );
  }

  console.log(assets)
  

  const children = root.isMesh ? [root] : root.children;
  const bounds = React.useMemo(() => {
    const box = new Box3().setFromObject(root);
    const width = box.max.x - box.min.x;
    const height = box.max.y - box.min.y;
    const x = Math.max(
      Math.min(...children.map((child) => child.position.x)),
      0,
    ) || 0;
    const y = height / 2 + (children[0]?.position.y ?? 0);

    return { position: [x, y, 0], width, height };
  }, [root, children]);

  const materials = React.useRef([]);
  const startColor = React.useMemo(() => new Color(WHITE), []);
  const endColor = React.useMemo(() => new Color(settings.emissive), [settings.emissive]);

  useFrame(() => {
    const progress = intro?.progress ?? 1;
    if (progress >= 1) return;

    for (const material of materials.current) {
      if (!material) continue;
      material.emissive.copy(startColor).lerp(endColor, progress);
      material.emissiveIntensity =
        2.8 + (settings.emissiveIntensity - 2.8) * progress;
    }
  });

  return createElement(
    "group",
    { visible: settings.visible },
    createElement("rectAreaLight", {
      color: settings.color,
      intensity: settings.intensity,
      rotation: [0, -Math.PI, 0],
      ...bounds,
    }),
    ...children.map((child, index) =>
      createElement(
        "mesh",
        {
          key: `${index}`,
          geometry: child.geometry,
          position: child.position,
        },
        createElement("meshStandardMaterial", {
          ref: (material) => {
            materials.current[index] = material;
          },
          color: settings.color,
          emissive: settings.emissive,
          emissiveIntensity: settings.emissiveIntensity,
          toneMapped: settings.toneMapped,
        }),
      ),
    ),
  );
}
