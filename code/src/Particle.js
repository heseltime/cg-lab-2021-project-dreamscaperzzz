
class Particle {
    constructor(position, size, velocity, lifetime) {
        this.position = position;
        this.size = size;
        this.velocity = velocity;
        this.lifetime = lifetime;
        this.timeAlive = 0;
    }

    getLifePercentage() {
        return this.timeAlive / this.lifetime;
    }
}

class ParticleSGNode extends TransformationSGNode {    
  constructor(particle, matrix, children) {
    super(matrix, children);
    this.particle = particle;
    this.position = particle.position;
  }

  setParticleUniforms(context) {
    const gl = context.gl;    
    if (!context.shader || !isValidUniformLocation(gl.getUniformLocation(context.shader, 'u_lifePercentage'))) {
      return;
    }
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_lifePercentage'), this.particle.getLifePercentage());
  }

  computePosition(context) {
    //transform with the current model view matrix
    const modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    this.position = this.particle.position;
    const original = this.position;
    const position =  vec4.transformMat4(vec4.create(), vec4.fromValues(original[0], original[1],original[2], 1), modelViewMatrix);

    this._worldPosition = position;
  }

  render(context) {  
    this.computePosition(context);
    this.setParticleUniforms(context);

    //since this a transformation node update the matrix according to my position
    this.matrix = glm.translate(this.position[0], this.position[1], this.position[2]);
    //render children
    super.render(context);
  }
}