import { r as React } from "../react.js";
import { a as useFrame } from "../react-fiber.js";

const createElement = React.createElement;

export default function HomepageFog({ settings, intro }) {
  const fog = React.useRef(null);

  useFrame(() => {
    if (!fog.current) return;
    const progress = intro?.progress ?? 1;
    fog.current.near = settings.near * progress;
    fog.current.far = settings.far * progress;
  });

  return createElement("fog", {
    ref: fog,
    attach: "fog",
    args: [settings.color, settings.near, settings.far],
  });
}
