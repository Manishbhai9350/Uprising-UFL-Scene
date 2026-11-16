import * as React from "react";
import { useFrame } from "@react-three/fiber";

export default function HomepageFog({ settings, intro }) {
  const fog = React.useRef(null);

  useFrame(() => {
    if (!fog.current) return;
    const progress = intro?.progress ?? 1;
    fog.current.near = settings.near * progress;
    fog.current.far = settings.far * progress;
  });

  return (
    <fog
      ref={fog}
      attach="fog"
      args={[settings.color, settings.near, settings.far]}
    />
  );
}