import { NoToneMapping } from "three";
import { RectAreaLightUniformsLib } from "three-stdlib";
import { Canvas } from "@react-three/fiber";
import Scene from "./components/Scene";
import { OrbitControls, Stats } from "@react-three/drei";

RectAreaLightUniformsLib.init();

const App = () => {
  return (
    <main>
      <Canvas
        gl={{
          // toneMapping: NoToneMapping, // let postprocessing handle it
          // antialias: false, // matches original
          // stencil: false, // matches original
          // depth: false, // matches original
        }}
        camera={{ position: [0, 0, 4.3], fov: 50, far: 1000 }}
        // camera={{ position: [0, 0, .1], fov: 50, far: 1000 }}
      >
        <Scene />
        <Stats />
        <OrbitControls />
      </Canvas>
    </main>
  );
};

export default App;
