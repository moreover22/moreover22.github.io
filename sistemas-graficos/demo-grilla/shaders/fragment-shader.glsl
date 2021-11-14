precision mediump float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vTime;

uniform vec3 uAmbientColor;         // color de luz ambiente
uniform vec3 uDirectionalColor;	    // color de luz direccional
uniform vec3 uLightPosition;        // posición de la luz

uniform bool uUseLighting;          // usar iluminacion si/no

uniform sampler2D uSampler;

void main(void) {

    vec3 lightDirection = normalize(uLightPosition - vWorldPosition);

    vec3 color = (uAmbientColor + vTime * uDirectionalColor * max(dot(vNormal, lightDirection), 0.0));

    color.r += 0.4 * vUv.x * (sin(vTime) + 1.0) / 2.0;
    color.g += 0.4 * vUv.y * (cos(vTime) + 1.0) / 2.0;
    color.b += 0.4 *  vUv.x * vUv.y * (cos(vTime) + 1.0) / 2.0;

    if(uUseLighting)
        gl_FragColor = vec4(color, 1.0);
    else
        gl_FragColor = vec4(0.7, 0.4, 0.8, 0.7);

}