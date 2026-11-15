const ASSETS = "/assets";
const DATA = "/data";
const TEXTURES = `${ASSETS}/textures`;
const MODELS = `${ASSETS}/models`;

export const ASSET_TYPES = Object.freeze({
  JSON: "json",
  GLTF: "gltf",
  TEXTURE: "texture",
  CUBE: "cube",
  LUT: "lut",
});

export const HOMEPAGE_ASSETS = Object.freeze([
  { name: "config", type: ASSET_TYPES.JSON, src: `${DATA}/config.json` },
  { name: "plane.model", type: ASSET_TYPES.GLTF, src: `${MODELS}/surface-plane.glb` },
  { name: "uprising.model", type: ASSET_TYPES.GLTF, src: `${MODELS}/uprising/uprising.glb` },
  { name: "uprising.portal", type: ASSET_TYPES.GLTF, src: `${MODELS}/uprising/uprising-light-reference.gltf` },
  { name: "normal", type: ASSET_TYPES.TEXTURE, src: `${TEXTURES}/normal-map.jpg` },
  { name: "smoke", type: ASSET_TYPES.TEXTURE, src: `${TEXTURES}/smoke.jpg` },
  { name: "noise", type: ASSET_TYPES.TEXTURE, src: `${TEXTURES}/noise.png` },
  { name: "spark", type: ASSET_TYPES.TEXTURE, src: `${TEXTURES}/spark.jpg` },
  { name: "lut.cube", type: ASSET_TYPES.LUT, src: `${TEXTURES}/lut.cube` },
  {
    name: "cube",
    type: ASSET_TYPES.CUBE,
    src: ["px", "nx", "py", "ny", "pz", "nz"].map(
      (face) => `${TEXTURES}/cube160/${face}.png`,
    ),
  },
]);

export const WATCH_ASSETS = Object.freeze([
  { name: "config", type: ASSET_TYPES.JSON, src: `${DATA}/config.json` },
  { name: "doublepoint.model", type: ASSET_TYPES.GLTF, src: `${MODELS}/doublepoint/doublepoint.glb` },
  { name: "spark", type: ASSET_TYPES.TEXTURE, src: `${TEXTURES}/spark.jpg` },
  { name: "lut.cube", type: ASSET_TYPES.LUT, src: `${TEXTURES}/lut.cube` },
  {
    name: "cube",
    type: ASSET_TYPES.CUBE,
    src: ["px", "nx", "py", "ny", "pz", "nz"].map(
      (face) => `${TEXTURES}/cube160/${face}.png`,
    ),
  },
]);

export const ABOUT_ASSETS = Object.freeze([
  { name: "config", type: ASSET_TYPES.JSON, src: `${DATA}/config.json` },
  { name: "underground.model", type: ASSET_TYPES.GLTF, src: `${MODELS}/about/glb/about.glb` },
  { name: "underground-ao", type: ASSET_TYPES.TEXTURE, src: `${MODELS}/about/tex/cube-ao.png` },
  { name: "underground-bump", type: ASSET_TYPES.TEXTURE, src: `${MODELS}/about/tex/cube-height.png` },
  { name: "underground-roughness", type: ASSET_TYPES.TEXTURE, src: `${MODELS}/about/tex/cube-roughness.png` },
  { name: "normal", type: ASSET_TYPES.TEXTURE, src: `${TEXTURES}/normal-map.jpg` },
  { name: "spark", type: ASSET_TYPES.TEXTURE, src: `${TEXTURES}/spark.jpg` },
  { name: "lut.cube", type: ASSET_TYPES.LUT, src: `${TEXTURES}/lut.cube` },
  {
    name: "cube",
    type: ASSET_TYPES.CUBE,
    src: ["px", "nx", "py", "ny", "pz", "nz"].map(
      (face) => `${TEXTURES}/cube160/${face}.png`,
    ),
  },
]);

export const HOMEPAGE_COMPONENTS = Object.freeze([
  "Ground",
  "Portal",
  "Smoke",
  "Sparkles",
  "BaseModel",
  "Fog",
]);
