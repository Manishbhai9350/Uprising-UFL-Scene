import { r as React } from "../react.js";
import { k as ReactDOMClient } from "../react-fiber.js";
import Application from "./app.js";

export function mountApplication(container, ApplicationComponent = Application) {
  if (!container) {
    throw new Error("Cannot start the Uprising scene: root element was not found.");
  }

  const reactRoot = ReactDOMClient.createRoot(container);
  reactRoot.render(React.createElement(ApplicationComponent));
  return reactRoot;
}

if (typeof document !== "undefined") {
  mountApplication(document.getElementById("root"));
}
