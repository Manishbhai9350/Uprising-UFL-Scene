#include <common>
#include <packing>
#include <dithering_pars_fragment>

#define packFloatToRGBA(v) packDepthToRGBA(v)
#define unpackRGBAToFloat(v) unpackRGBAToDepth(v)

#ifdef FRAMEBUFFER_PRECISION_HIGH
uniform mediump sampler2D inputBuffer;
#else
uniform lowp sampler2D inputBuffer;
#endif 

#if DEPTH_PACKING == 3201
uniform lowp sampler2D depthBuffer;
#elif defined(GL_FRAGMENT_PRECISION_HIGH)
uniform highp sampler2D depthBuffer;
#else
uniform mediump sampler2D depthBuffer;
#endif

uniform vec2 resolution;
uniform vec2 texelSize;
uniform float cameraNear;
uniform float cameraFar;
uniform float aspect;
uniform float time;

varying vec2 vUv;

#if THREE_REVISION < 143
#define luminance(v) linearToRelativeLuminance(v)
#endif

#if THREE_REVISION >= 137
vec4 sRGBToLinear(const in vec4 value) {
    return vec4(mix(pow(value.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), value.rgb * 0.0773993808, vec3(lessThanEqual(value.rgb, vec3(0.04045)))), value.a);
}
#endif

float readDepth(const in vec2 uv) {
    #if DEPTH_PACKING == 3201
    return unpackRGBAToDepth(texture2D(depthBuffer, uv));
    #else
    return texture2D(depthBuffer, uv).r;
    #endif
}

float getViewZ(const in float depth) {
    #ifdef PERSPECTIVE_CAMERA
    return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
    #else
    return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
    #endif
}

vec3 RGBToHCV(const in vec3 RGB) {
    vec4 P = mix(vec4(RGB.bg, -1.0, 2.0 / 3.0), vec4(RGB.gb, 0.0, -1.0 / 3.0), step(RGB.b, RGB.g));
    vec4 Q = mix(vec4(P.xyw, RGB.r), vec4(RGB.r, P.yzx), step(P.x, RGB.r));
    float C = Q.x - min(Q.w, Q.y);
    float H = abs((Q.w - Q.y) / (6.0 * C + EPSILON) + Q.z);
    return vec3(H, C, Q.x);
}

vec3 RGBToHSL(const in vec3 RGB) {
    vec3 HCV = RGBToHCV(RGB);
    float L = HCV.z - HCV.y * 0.5;
    float S = HCV.y / (1.0 - abs(L * 2.0 - 1.0) + EPSILON);
    return vec3(HCV.x, S, L);
}

vec3 HueToRGB(const in float H) {
    float R = abs(H * 6.0 - 3.0) - 1.0;
    float G = 2.0 - abs(H * 6.0 - 2.0);
    float B = 2.0 - abs(H * 6.0 - 4.0);
    return clamp(vec3(R, G, B), 0.0, 1.0);
}

vec3 HSLToRGB(const in vec3 HSL) {
    vec3 RGB = HueToRGB(HSL.x);
    float C = (1.0 - abs(2.0 * HSL.z - 1.0)) * HSL.y;
    return (RGB - 0.5) * C + HSL.z;
}

uniform float e0BlendOpacity;
uniform vec3 e0Hue;
uniform float e0Saturation;

void e0MainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 color = vec3(dot(inputColor.rgb, e0Hue.xyz), dot(inputColor.rgb, e0Hue.zxy), dot(inputColor.rgb, e0Hue.yzx));
    float average = (color.r + color.g + color.b) / 3.0;
    vec3 diff = average - color;
    if (e0Saturation > 0.0) {
        color += diff * (1.0 - 1.0 / (1.001 - e0Saturation));
    } else {
        color += diff * -e0Saturation;
    }
    outputColor = vec4(min(color, 1.0), inputColor.a);
}

uniform float e1BlendOpacity;

void e1MainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 noise = vec3(rand(uv * (1.0 + time)));
    #ifdef e1PREMULTIPLY
    outputColor = vec4(min(inputColor.rgb * noise, vec3(1.0)), inputColor.a);
    #else
    outputColor = vec4(noise, inputColor.a);
    #endif
}

uniform float e2BlendOpacity;
uniform vec3 e2Scale;
uniform vec3 e2Offset;

#ifdef CUSTOM_INPUT_DOMAIN
uniform vec3 e2DomainMin;
uniform vec3 e2DomainMax;
#endif

#ifdef e2LUT_3D
#ifdef e2LUT_PRECISION_HIGH
#ifdef GL_FRAGMENT_PRECISION_HIGH
uniform highp sampler3D e2Lut;
#else
uniform mediump sampler3D e2Lut;
#endif
#else
uniform lowp sampler3D e2Lut;
#endif

vec4 e2ApplyLUT(const in vec3 rgb) {
    #ifdef TETRAHEDRAL_INTERPOLATION
    vec3 p = floor(rgb);
    vec3 f = rgb - p;
    vec3 v1 = (p + 0.5) * e2LUT_TEXEL_WIDTH;
    vec3 v4 = (p + 1.5) * e2LUT_TEXEL_WIDTH;
    vec3 v2, v3;
    vec3 frac;
    if (f.r >= f.g) {
        if (f.g > f.b) {
            frac = f.rgb;
            v2 = vec3(v4.x, v1.y, v1.z);
            v3 = vec3(v4.x, v4.y, v1.z);
        } else if (f.r >= f.b) {
            frac = f.rbg;
            v2 = vec3(v4.x, v1.y, v1.z);
            v3 = vec3(v4.x, v1.y, v4.z);
        } else {
            frac = f.brg;
            v2 = vec3(v1.x, v1.y, v4.z);
            v3 = vec3(v4.x, v1.y, v4.z);
        }
    } else {
        if (f.b > f.g) {
            frac = f.bgr;
            v2 = vec3(v1.x, v1.y, v4.z);
            v3 = vec3(v1.x, v4.y, v4.z);
        } else if (f.r >= f.b) {
            frac = f.grb;
            v2 = vec3(v1.x, v4.y, v1.z);
            v3 = vec3(v4.x, v4.y, v1.z);
        } else {
            frac = vec3(v1.x, v4.y, v1.z);
            v3 = vec3(v1.x, v4.y, v4.z);
        }
    }
    vec4 n1 = texture(e2Lut, v1);
    vec4 n2 = texture(e2Lut, v2);
    vec4 n3 = texture(e2Lut, v3);
    vec4 n4 = texture(e2Lut, v4);
    vec4 weights = vec4(1.0 - frac.x, frac.x - frac.y, frac.y - frac.z, frac.z);
    vec4 result = weights * mat4(vec4(n1.r, n2.r, n3.r, n4.r), vec4(n1.g, n2.g, n3.g, n4.g), vec4(n1.b, n2.b, n3.b, n4.b), vec4(1.0));
    return vec4(result.rgb, 1.0);
    #else
    return texture(e2Lut, rgb);
    #endif
}
#else
#ifdef e2LUT_PRECISION_HIGH
#ifdef GL_FRAGMENT_PRECISION_HIGH
uniform highp sampler2D e2Lut;
#else
uniform mediump sampler2D e2Lut;
#endif
#else
uniform lowp sampler2D e2Lut;
#endif

vec4 e2ApplyLUT(const in vec3 rgb) {
    float slice = rgb.b * e2LUT_SIZE;
    float slice0 = floor(slice);
    float interp = slice - slice0;
    float centeredInterp = interp - 0.5;
    float slice1 = slice0 + sign(centeredInterp);
    #ifdef LUT_STRIP_HORIZONTAL
    float xOffset = clamp(rgb.r * e2LUT_TEXEL_HEIGHT, e2LUT_TEXEL_WIDTH * 0.5, e2LUT_TEXEL_HEIGHT - e2LUT_TEXEL_WIDTH * 0.5);
    vec2 uv0 = vec2(slice0 * e2LUT_TEXEL_HEIGHT + xOffset, rgb.g);
    vec2 uv1 = vec2(slice1 * e2LUT_TEXEL_HEIGHT + xOffset, rgb.g);
    #else
    float yOffset = clamp(rgb.g * e2LUT_TEXEL_WIDTH, e2LUT_TEXEL_HEIGHT * 0.5, e2LUT_TEXEL_WIDTH - e2LUT_TEXEL_HEIGHT * 0.5);
    vec2 uv0 = vec2(rgb.r, slice0 * e2LUT_TEXEL_WIDTH + yOffset);
    vec2 uv1 = vec2(rgb.r, slice1 * e2LUT_TEXEL_WIDTH + yOffset);
    #endif
    vec4 sample0 = texture2D(e2Lut, uv0);
    vec4 sample1 = texture2D(e2Lut, uv1);
    return mix(sample0, sample1, abs(centeredInterp));
}
#endif

void e2MainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 c = inputColor.rgb;
    #ifdef CUSTOM_INPUT_DOMAIN
    if (c.r >= e2DomainMin.r && c.g >= e2DomainMin.g && c.b >= e2DomainMin.b && c.r <= e2DomainMax.r && c.g <= e2DomainMax.g && c.b <= e2DomainMax.b) {
        c = e2ApplyLUT(e2Scale * c + e2Offset).rgb;
    } else {
        c = inputColor.rgb;
    }
    #else
    #if !defined(e2LUT_3D) || defined(TETRAHEDRAL_INTERPOLATION)
    c = clamp(c, 0.0, 1.0);
    #endif
    c = e2ApplyLUT(e2Scale * c + e2Offset).rgb;
    #endif
    outputColor = vec4(c, inputColor.a);
}

vec4 blend23(const in vec4 x, const in vec4 y, const in float opacity) {
    return mix(x, y, opacity);
}

vec4 blend0(const in vec4 x, const in vec4 y, const in float opacity) {
    return mix(x, y, opacity);
}

void main() {
    vec4 inputColor = texture2D(inputBuffer, vUv);
    vec4 outputColor = inputColor;

    vec4 e0Color;
    e0MainImage(outputColor, vUv, e0Color);
    outputColor = blend0(outputColor, e0Color, e0BlendOpacity);

    vec4 e1Color;
    e1MainImage(outputColor, vUv, e1Color);
    outputColor = blend0(outputColor, e1Color, e1BlendOpacity);

    vec4 e2Color;
    e2MainImage(outputColor, vUv, e2Color);
    outputColor = blend0(outputColor, e2Color, e2BlendOpacity);

    #include <dithering_fragment>

    gl_FragColor = outputColor;
}