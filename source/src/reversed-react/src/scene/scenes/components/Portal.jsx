import { useGLTF } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import { Box3, Mesh, MeshStandardMaterial } from "three";

const Portal = () => {
  const { scene } = useGLTF("/models/ufl/ufl-panels.glb");
  
  // Clone the scene to avoid mutating the cached version
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Analyze the bounding box to calculate width, height, and center position
  const bounds = useMemo(() => {
    const box = new Box3().setFromObject(clonedScene);
    const width = box.max.x - box.min.x;
    const height = box.max.y - box.min.y;
    
    // Calculate the center point for light placement
    const x = (box.min.x + box.max.x) / 2;
    const y = (box.min.y + box.max.y) / 2;
    const z = (box.min.z + box.max.z) / 2 + .01;

    return {
      position: [x, y, z],
      width,
      height,
    };
  }, [clonedScene]);

  // Apply your green material to all meshes inside the GLTF
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof Mesh) {
        child.material = new MeshStandardMaterial({ 
            color: "#42cdff",
            emissive:"#ace9ff",
            emissiveIntensity:1.8,
            toneMapped:false,
         });
      }
    });
  }, [clonedScene]);

  return (
    <group>
      <rectAreaLight
        color="white"
        intensity={4}
        position={bounds.position}
        width={bounds.width}
        height={bounds.height}
      />
      <primitive object={clonedScene} />
    </group>
  );
};

export default Portal;

useGLTF.preload("/models/ufl/ufl-panels.glb");