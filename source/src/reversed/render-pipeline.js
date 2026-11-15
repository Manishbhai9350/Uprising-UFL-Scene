export const MAX_DRAW_BUFFER_PIXELS = 1920 * 1080;

export const DEFAULT_CAMERA = Object.freeze({
  fov: Object.freeze({ mobile: Object.freeze([55, 375]), desktop: Object.freeze([40, 1440]) }),
  near: 0.01,
  far: 10,
});

export function getDeviceCapabilities({
  userAgent = navigator.userAgent,
  platform = navigator.platform,
  maxTouchPoints = navigator.maxTouchPoints,
  viewportWidth = window.innerWidth,
  webgl2Available = true,
  gpuTier = 1,
} = {}) {
  const normalizedUserAgent = userAgent.toLowerCase();
  const isAppleTouchMac = platform === "MacIntel" && maxTouchPoints > 1;
  const isIosDevice =
    /iphone|ipod/.test(normalizedUserAgent) || isAppleTouchMac;
  const isIosPhone = isIosDevice && viewportWidth < 768;

  return {
    isIosPhone,
    getDPR: () => (isIosPhone ? 1.5 : 1),
    getSamples: () => (!isIosPhone && webgl2Available && gpuTier > 1 ? 8 : 0),
  };
}

export function getRendererConfiguration({ isIosPhone, getDPR, getSamples }) {
  return {
    dpr: [1, isIosPhone ? 1.5 : getDPR()],
    renderer: isIosPhone
      ? {
          implementation: "WebGL1Renderer",
          powerPreference: "default",
          antialias: false,
          stencil: false,
          depth: false,
        }
      : {
          implementation: "R3F default WebGL renderer",
          powerPreference: "default",
          autoClear: false,
          antialias: false,
          stencil: false,
          depth: false,
        },
    composerSamples: getSamples(),
    background: "#000000",
  };
}

export function calculateEffectiveDpr(width, height, dpr = 1) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return dpr;
  }

  return Math.min(dpr, Math.sqrt(MAX_DRAW_BUFFER_PIXELS / (width * height)));
}

export function calculateCameraFov(viewportWidth, fov = DEFAULT_CAMERA.fov) {
  const [mobileFov, mobileWidth] = fov.mobile;
  const [desktopFov, desktopWidth] = fov.desktop;
  const clampedWidth = Math.min(Math.max(viewportWidth, mobileWidth), desktopWidth);
  const progress = (clampedWidth - mobileWidth) / (desktopWidth - mobileWidth);

  return Math.round(mobileFov + progress * (desktopFov - mobileFov));
}

