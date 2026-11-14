export const HOMEPAGE_SCENE_ID = "uprising";

function resolveReference(reference, settings) {
  if (!reference?.$ref) return reference ?? {};

  const resolved = reference.$ref
    .split(".")
    .reduce((value, key) => value[key], { settings });

  return { ...resolved, ...reference.extend };
}

export function prepareHomepageConfiguration(rawConfig) {
  const sourceScene = rawConfig.scenes.find(
    (scene) => scene.uuid === HOMEPAGE_SCENE_ID,
  );
  if (!sourceScene) {
    throw new Error(`Missing configured scene "${HOMEPAGE_SCENE_ID}".`);
  }

  return {
    settings: rawConfig.settings,
    locale: rawConfig.locale,
    scene: {
      uuid: sourceScene.uuid,
      contents: {
        ...sourceScene.contents,
        ...rawConfig.locale?.shared,
      },
      components: sourceScene.components.map(
        ({ settings: componentSettings, modifier, ...component }) => ({
          ...component,
          ...resolveReference(componentSettings, rawConfig.settings),
          ...resolveReference(modifier, rawConfig.settings),
        }),
      ),
    },
  };
}
