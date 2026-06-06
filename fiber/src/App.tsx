import {
  Environment,
  MeshReflectorMaterial,
  OrbitControls,
  Stats,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Panels } from "./components/Panels";
import Effects from "./components/Effects";
import { Ufl } from "./components/Ufl";
import { Floor } from "./components/Reflector";
import { ACESFilmicToneMapping } from "three";

const App = () => {
  return (
    <main>
      <Canvas gl={{toneMapping:ACESFilmicToneMapping,toneMappingExposure:1}} camera={{ position: [0, 0, 4.3], fov: 50, far: 1000 }}>
        <color attach={"background"} args={[0x000000]} />
        <OrbitControls makeDefault />
        <Panels position={[0,0,0]} />
        <Ufl />
        <Floor />
        {/* <Environment
          files={[
            "/textures/cube160/px.png",
            "/textures/cube160/nx.png",
            "/textures/cube160/py.png",
            "/textures/cube160/ny.png",
            "/textures/cube160/pz.png",
            "/textures/cube160/nz.png",
          ]}
          environmentIntensity={1}
          ground
          background={false}
        /> */}
        {/* <Effects /> */}
        <Stats />
      </Canvas>
    </main>
  );
};

export default App;
