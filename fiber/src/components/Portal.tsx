import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Box3, Color, Mesh, Object3D } from "three";

const WHITE = "#ffffff";

interface PortalSettings {
  geometry: string;
  emissive: string;
  emissiveIntensity: number;
  color: string;
  intensity: number;
  toneMapped: boolean;
  visible: boolean;
}

interface IntroState {
  progress?: number;
}

interface PortalProps {
  assets: Map<string, any>;
  settings: PortalSettings;
  intro?: IntroState;
}

function requireAsset(assets: Map<string, any>, name: string): any {
  const asset = assets.get(name);
  if (!asset) {
    throw new Error(`Homepage asset "${name}" was not loaded.`);
  }
  return asset;
}

const settings = {
  color: "#42cdff",
  emissive: "#ace9ff",
  emissiveIntensity: 1.8,
  geometry: "uprising.portal",
  intensity: 10,
  name: "Portal",
  toneMapped: false,
  visible: true
};

const intro = {
  progress:0
}

export default function Portal() {


  const materialsRef = useRef<any[]>([]);
  const startColor = useMemo(() => new Color(WHITE), []);
  const endColor = useMemo(
    () => new Color(settings.emissive),
    [settings.emissive],
  );

  useFrame(() => {
    const progress = intro?.progress ?? 1;
    if (progress >= 1) return;

    for (const material of materialsRef.current) {
      if (!material) continue;
      material.emissive.copy(startColor).lerp(endColor, progress);
      material.emissiveIntensity =
        2.8 + (settings.emissiveIntensity - 2.8) * progress;
    }
  });

  return (
    <group visible={settings.visible}>
      <rectAreaLight
        color={settings.color}
        intensity={settings.intensity}
        rotation={[0, -Math.PI, 0]}
        position={[0,0,0]}
        width={1}
        height={3.2}
      />
      {/* {children.map((child, index) => (
        <mesh key={index} geometry={child.geometry} position={child.position}>
          <meshStandardMaterial
            ref={(material) => {
              materialsRef.current[index] = material;
            }}
            color={settings.color}
            emissive={settings.emissive}
            emissiveIntensity={settings.emissiveIntensity}
            toneMapped={settings.toneMapped}
          />
        </mesh>
      ))} */}
    </group>
  );
}
