# Isolated Uprising reconstruction

The preview keeps reconstructed scenes separate from the original site source.
Serve the `source/` directory and open `src/reversed/` for the homepage,
`src/reversed/?scene=watch` for the isolated Watch model, or
`src/reversed/?scene=about` for the About/Underground scene.

## Scope and status

| Area | Status | Implementation |
| --- | --- | --- |
| Homepage | Verified | Configured `uprising` scene and original assets. |
| Post-processing | Verified | Shared Fluid, RGB split, Bloom, Vignette, tone mapping, color correction, Noise, and LUT pipeline. |
| Watch | Verified | Isolated `WatchModel`, its particle simulation, environment, camera response, and shared effects; the full Doublepoint scene is not mounted. |
| About | Verified | Configured Underground model, textures, materials, reflector, area light, fog, Sparkles, four content blocks, CTA, and scroll-driven camera/fog motion. |

About configuration and scene assets are loaded from the original project
without changing them. The shared renderer selects only the requested preview
scene; no Doublepoint, Planet Farms, or other work scenes are implemented.

## Validation and known differences

- The homepage, Watch, and About previews were loaded in the browser. The
  required assets returned successfully, each scene mounted a WebGL canvas,
  and no local browser-console or network errors were observed.
- About scrolling was exercised and updated the 3D camera/fog while revealing
  all four configured text blocks and the original contact email.
- Original typography metrics, colors, content, and CTA link were compared
  against the source website and configuration. The source's line-by-line
  SplitText/ScrollTrigger animation is represented with CSS transitions and an
  IntersectionObserver rather than reusing its bundled animation plugin.
- This isolated preview does not include the website-wide navigation, footer,
  audio controls, or portfolio-scene transitions. The local Matter font files
  are absent, so the original `Matter` family falls back to the configured
  system sans-serif stack.
- Homepage device-orientation and scroll-driven camera responses remain
  outside this phase.
- No pixel-difference screenshot test has been performed. The original
  `src/main.js`, configuration, and assets remain read-only.
