import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Scene from "./scene/scene";

function App() {
  return (
    <main>
      <Canvas
        camera={{
          fov: 40,
          position:[0,4,10]
        }}
      >
        {/* <OrbitControls /> */}
        <Scene />
        <color attach="background" args={["#000000"]} />
      </Canvas>
    </main>
  );
}

export default App;
