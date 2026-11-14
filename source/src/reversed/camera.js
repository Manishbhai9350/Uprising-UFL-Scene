import { r as React } from "../react.js";
import { a as useFrame, u as useThree } from "../react-fiber.js";
import { calculateCameraFov } from "./render-pipeline.js";

const INTRO_DURATION = 3;
const INITIAL_POSITION = { x: -3, y: 0, z: 2 };

function getHomepageCameraPosition() {
  return {
    x: 0,
    y: window.innerWidth < 768 ? -0.25 : 0,
    z: 4.3,
  };
}

export default function SceneCamera({ settings }) {
  const camera = useThree((state) => state.camera);
  const pointer = React.useRef({ x: 0, y: 0 });
  const pointerOffset = React.useRef({ x: 0, y: 0 });
  const introStart = React.useRef(null);

  React.useLayoutEffect(() => {
    const position = getHomepageCameraPosition();
    camera.position.set(
      INITIAL_POSITION.x,
      INITIAL_POSITION.y,
      INITIAL_POSITION.z,
    );
    camera.near = settings.near;
    camera.far = settings.far;
    camera.fov = calculateCameraFov(window.innerWidth, settings.fov);
    camera.updateProjectionMatrix();

    function updateFov() {
      camera.fov = calculateCameraFov(window.innerWidth, settings.fov);
      camera.updateProjectionMatrix();
      position.y = window.innerWidth < 768 ? -0.25 : 0;
    }

    function updatePointer(event) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y =
        (-(event.clientY / window.innerHeight) * 2 + 1) * 0.2;
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
    const destination = getHomepageCameraPosition();
    const smoothing = Math.min(delta * 2, 1);

    pointerOffset.current.x +=
      (pointer.current.x - pointerOffset.current.x) * smoothing;
    pointerOffset.current.y +=
      (pointer.current.y - pointerOffset.current.y) * smoothing;

    state.camera.position.set(
      INITIAL_POSITION.x * (1 - easedProgress) +
        destination.x * easedProgress +
        pointerOffset.current.x,
      INITIAL_POSITION.y * (1 - easedProgress) +
        destination.y * easedProgress +
        pointerOffset.current.y,
      INITIAL_POSITION.z * (1 - easedProgress) +
        destination.z * easedProgress,
    );
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}
