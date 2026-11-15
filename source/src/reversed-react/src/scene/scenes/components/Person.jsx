import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { MeshStandardMaterial } from "three";

const Ufl = () => {
  const group = useRef();
  const { scene, animations } = useGLTF("/models/ufl/ufl.glb");
  const { actions, names } = useAnimations(animations, group);

  // Apply material directly to the original scene nodes on mount
  useEffect(() => {
    const Mat = new MeshStandardMaterial({
      roughness: 0.6,
      color: 0x000000,
    });

    scene.traverse((node) => {
      if (node.isMesh) {
        node.material = Mat;
      }
    });
  }, [scene]);

  // Play animation
  useEffect(() => {
    const targetName = names.find((n) => n.toLowerCase().includes("warm")) || names[0];
    const action = targetName ? actions[targetName] : null;

    if (action) {
      action.reset().fadeIn(0.5).play();
    }

    return () => {
      if (action) {
        action.fadeOut(0.5);
      }
    };
  }, [actions, names]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
};

export default Ufl;

useGLTF.preload("/models/ufl/ufl.glb");