#include <fog_pars_vertex>
attribute vec3 translate;
attribute vec3 rotation;
attribute float opacity;
attribute float direction;
attribute float speed;
attribute float scale;
attribute vec3 noise;
attribute vec3 color;
uniform float time;
varying vec2 vUv;
varying vec3 vColor;
varying float vSpeed;
varying float vOpacity;
mat4 translateMatrix(vec3 v) {
    return mat4(vec4(1.0, 0.0, 0.0, 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(v.x, v.y, v.z, 1.0));
}
mat4 rotateMatrix(vec3 v) {
    mat4 rx = mat4(vec4(1.0, 0.0, 0.0, 0.0), vec4(0.0, cos(v.x), -sin(v.x), 0.0), vec4(0.0, sin(v.x), cos(v.x), 0.0), vec4(0.0, 0.0, 0.0, 1.0));
    mat4 ry = mat4(vec4(cos(v.y), 0.0, sin(v.y), 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(-sin(v.y), 0.0, cos(v.y), 0.0), vec4(0.0, 0.0, 0.0, 1.0));
    mat4 rz = mat4(vec4(cos(v.z), -sin(v.z), 0.0, 0.0), vec4(sin(v.z), cos(v.z), 0.0, 0.0), vec4(0.0, 0.0, 1.0, 0.0), vec4(0.0, 0.0, 0.0, 1.0));
    return rx * rz * ry;
}
mat4 scaleMatrix(vec3 v) {
    return mat4(vec4(v.x, 0.0, 0.0, 0.0), vec4(0.0, v.y, 0.0, 0.0), vec4(0.0, 0.0, v.z, 0.0), vec4(0.0, 0.0, 0.0, 1.0));
}
mat4 transformMatrix(vec3 t, vec3 r, vec3 s) {
    mat4 ms = scaleMatrix(s);
    mat4 mt = translateMatrix(t);
    mat4 mr = rotateMatrix(r);
    return mt * mr * ms;
}
void main() {
    float s = time * speed * 2.;
    vec3 transformPosition = translate + noise;
    vec3 transformRotation = rotation + vec3(0., 0., noise.z + s * direction);
    vec3 transformScale = vec3(scale);
    mat4 transform = transformMatrix(transformPosition, transformRotation, transformScale);
    vec3 transformed = vec4(transform * vec4(position, 1.)).xyz;
    #include <project_vertex>
    #include <fog_vertex>
    vUv = uv;
    vSpeed = s;
    vColor = color;
    vOpacity = opacity;
}
