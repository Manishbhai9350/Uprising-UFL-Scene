import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Panels } from "./components/Panels";
import Effects from "./components/Effects";

const App = () => {
  return (
    <main>
      <Canvas>
        <color attach={"background"} args={[0x000000]} />
        <OrbitControls makeDefault />
        {/* <mesh position={[0,1,0]}>
          <boxGeometry args={[1,2,1]} />
          <meshBasicMaterial color={"red"} />
        </mesh> */}
        <Panels scale={1.5} />
        <Effects />
      </Canvas>
    </main>
  );
};

export default App;
