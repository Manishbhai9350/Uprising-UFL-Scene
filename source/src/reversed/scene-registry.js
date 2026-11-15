export const HOMEPAGE_SCENE_ID = "uprising";

function resolveReference(reference, settings) {
  if (!reference?.$ref) return reference ?? {};

  const resolved = reference.$ref
    .split(".")
    .reduce((value, key) => value[key], { settings });

  return { ...resolved, ...reference.extend };
}

export function prepareSceneConfiguration(rawConfig, sceneId) {
  const sourceScene = rawConfig.scenes.find(
    (scene) => scene.uuid === sceneId,
  );
  if (!sourceScene) {
    throw new Error(`Missing configured scene "${sceneId}".`);
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

export function prepareHomepageConfiguration(rawConfig) {
  return prepareSceneConfiguration(rawConfig, HOMEPAGE_SCENE_ID);
}
