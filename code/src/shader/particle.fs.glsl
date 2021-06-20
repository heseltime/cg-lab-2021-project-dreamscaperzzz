/**
 * Created by Mathias Gartner on 17.06.2021.
 */

precision mediump float;

uniform float u_lifePercentage;

void main() {
	float c = 1. - min(u_lifePercentage, 1.);
	gl_FragColor = vec4(c,c,c,0.5);
}
