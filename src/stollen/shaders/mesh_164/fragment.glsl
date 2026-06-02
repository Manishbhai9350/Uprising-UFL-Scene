#include <fog_pars_fragment>
uniform sampler2D map;
uniform sampler2D noiseMap;
uniform float noiseIntensity;
varying vec2 vUv;
varying vec3 vColor;
varying float vSpeed;
varying float vOpacity;
void main() {
    vec2 uv = vUv;
    vec2 nUv = vUv;
    nUv.x += cos(vSpeed * .5);
    nUv.y += sin(vSpeed * .5);
    vec2 n = texture2D(noiseMap, nUv * 2.).xy;

    uv += (-1.0 + n * 2.0) * noiseIntensity;
    vec4 texel = texture2D(map, uv);
    vec4 color = vec4(vColor, 1.);

    gl_FragColor = texel * color * vOpacity;
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
}
