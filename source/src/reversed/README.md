# Homepage scene reconstruction

This isolated preview reconstructs only the `uprising` homepage scene. It does
not implement the site's routes or any other work scene. The original
`src/main.js` and project configuration are read-only sources of truth.

## Progress

| Ordered stage | Status | Evidence |
| --- | --- | --- |
| Application initialization | Verified | `main.js` mounts the React application into the dedicated preview root. |
| R3F Canvas and renderer | Verified | `renderer.js` preserves the original black background, renderer options, and draw-buffer resizing. |
| Homepage asset loading | Verified | `asset-manifest.js` lists only the homepage model, ground plane, portal reference, environment, textures, LUT, and config. All listed file URLs returned HTTP 200 in the local preview. |
| Homepage scene and original model | In progress | The `BaseModel` configuration resolves to the original `uprising/uprising.glb`; the model mesh and configured environment map are mounted. |
| Camera, lighting, environment, ground, materials, animation, post-processing | Not implemented yet | These remain in the requested implementation order. |
| Visual comparison | Not performed | No fidelity claim is made. |

The loader uses the original asset paths and Draco decoder URL. It resolves only
the `uprising` scene from `data/config.json`; it does not register or mount
other scenes. Loading and configuration errors are surfaced in the preview.

## Known gaps

- The original camera rig and its intro, pointer, motion, and orientation updates
  are not reconstructed yet.
- The portal light, smoke, sparkles, fog, reflective ground, and post-processing
  are not mounted yet.
- Asset URL availability and model mounting have been checked, but rendered
  geometry, interactions, and image fidelity have not yet been visually
  compared with the original homepage.
