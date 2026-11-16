import * as React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { calculateCameraFov } from "./render-pipeline";

const INTRO_DURATION = 3;
const INITIAL_POSITION = { x: -3, y: 0, z: 2 };

export default function SceneCamera({ settings, intro }) {
  const camera = useThree((state) => state.camera);
  const pointer = React.useRef({ x: 0, y: 0 });
  const pointerOffset = React.useRef({ x: 0, y: 0 });
  const upTargetX = React.useRef(0);
  const introStart = React.useRef(null);

  // React.useLayoutEffect(() => {
  //   function set() {
  //     camera.position.set(
  //       INITIAL_POSITION.x,
  //       INITIAL_POSITION.y,
  //       INITIAL_POSITION.z,
  //     );
  //     camera.near = settings.near;
  //     camera.far = settings.far;
  //     camera.fov = calculateCameraFov(window.innerWidth, settings.fov);
  //     camera.updateProjectionMatrix();
  //   }

  //   set();

  //   function updateFov() {
  //     camera.fov = calculateCameraFov(window.innerWidth, settings.fov);
  //     camera.updateProjectionMatrix();
  //   }

  //   function updatePointer(event) {
  //     pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
  //     pointer.current.y = (-(event.clientY / window.innerHeight) * 2 + 1) * 0.2;
  //     upTargetX.current = Math.max(
  //       -0.3 * 0.05,
  //       Math.min(pointer.current.x, 0.3 * 0.05),
  //     );
  //   }

  //   window.addEventListener("resize", updateFov);
  //   window.addEventListener("pointermove", updatePointer);

  //   return () => {
  //     window.removeEventListener("resize", updateFov);
  //     window.removeEventListener("pointermove", updatePointer);
  //   };
  // }, [camera, settings.far, settings.fov, settings.near]);

  // useFrame((state, delta) => {
  //   if (introStart.current === null) {
  //     introStart.current = state.clock.elapsedTime;
  //   }

  //   const progress = Math.min(
  //     (state.clock.elapsedTime - introStart.current) / INTRO_DURATION,
  //     1,
  //   );
  //   const easedProgress = 1 - (1 - progress) ** 2;
  //   if (intro) intro.progress = easedProgress;

  //   const destinationY = window.innerWidth < 768 ? -0.25 : 0;
  //   const smoothing = Math.min(delta * 2, 1);

  //   pointerOffset.current.x +=
  //     (pointer.current.x - pointerOffset.current.x) * smoothing;
  //   pointerOffset.current.y +=
  //     (pointer.current.y - pointerOffset.current.y) * smoothing;

  //   state.camera.position.set(
  //     INITIAL_POSITION.x * (1 - easedProgress) +
  //       pointerOffset.current.x * easedProgress,
  //     INITIAL_POSITION.y * (1 - easedProgress) +
  //       destinationY * easedProgress +
  //       pointerOffset.current.y * easedProgress,
  //     INITIAL_POSITION.z * (1 - easedProgress) + 4.3 * easedProgress,
  //   );
  //   state.camera.up.x += (upTargetX.current - state.camera.up.x) * delta;
  //   state.camera.lookAt(0, window.innerWidth < 768 ? -0.25 : 0, 0);
  // });

  return null;
}
