import Ground from "../components/Ground";
import Portal from "./components/Portal";
import Ufl from "./components/Person";

const Home = () => {
  return (
    <group>
      <Portal />
      <Ufl />
      <Ground />
      <ambientLight />
    </group>
  );
};

export default Home;
