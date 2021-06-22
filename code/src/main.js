//the OpenGL context
var gl = null,
  program = null;

//Camera
var cameraAutostartEnabled = true;
var animationSpeedupFactor = 1.0/2.0*3.0;
var camera = null;
var cameraPos = vec3.create();
var cameraCenter = vec3.create();
var cameraAnimation = null;
var maskFocusDuration = 1500;
var maskLookaroundDuration = 6000;

// scenegraph root node
var root = null;

//mask circle
var maskCircleTM = mat4.create();
var maskCircleAnimation;
var singleMaskAnimation = [];
var billboardAnimations = []; //a list of animation objects bound to each mask
var eyeAnimation;

var billboardAnimationsRunning = false;

//particles
var initialNumOfParticles = 100;
var maxNumOfParticles = 10000;

var particles = [];
var particleRoot;

// time in last render step
var previousTime = 0;

//load the shader resources using a utility function
loadResources({
  vs: './src/shader/phong.vs.glsl',
  fs: './src/shader/phong.fs.glsl',
  vs_single: './src/shader/single.vs.glsl',
  fs_single: './src/shader/single.fs.glsl',
  vs_particle: './src/shader/particle.vs.glsl',
  fs_particle: './src/shader/particle.fs.glsl',
  model: './src/models/C-3PO.obj'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
  init(resources);

  render(0);
});

/**
 * initializes OpenGL context, compile shader, and load buffers
 */
function init(resources) {
  //create a GL context
  gl = createContext();

  //setup camera
  let cameraDefaultPos = vec3.fromValues(0, 1, -50);
  camera = new UserControlledCamera(gl.canvas, cameraDefaultPos);
  //setup an animation for the camera, moving it into position
  cameraAnimation = createCameraAnimation(camera, false, cameraDefaultPos);  
  if (cameraAutostartEnabled) {
    cameraAnimation.start()
  }

  //TODO create your own scenegraph
  root = createSceneGraph(gl, resources);

  createSingleMaskAnimation();
  createBillboardAnimation();
}

function createCameraAnimation(camera, doLooping, lastStepPos) {
  let steps = [];
  let maskAngleUp = -10;
  let maskAngleLeft = 15;
  let maskAngleRight = -15;

  let startMatrix = mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(0, 0, 0));

  steps.push({matrix: startMatrix, duration: 1});
  steps.push({matrix: mat4.rotateX(mat4.create(), mat4.rotateY(mat4.create(), mat4.identity(mat4.create()), glm.deg2rad(maskAngleLeft)), glm.deg2rad(maskAngleUp)), duration: maskFocusDuration});    
  steps.push({matrix: startMatrix, duration: maskFocusDuration});
  steps.push({matrix: mat4.rotateX(mat4.create(), mat4.rotateY(mat4.create(), mat4.identity(mat4.create()), glm.deg2rad(maskAngleRight)), glm.deg2rad(maskAngleUp)), duration: maskFocusDuration});
  steps.push({matrix: startMatrix, duration: maskFocusDuration});
  steps.push({matrix: p => mat4.rotateX(mat4.create(), mat4.rotateY(mat4.create(), mat4.identity(mat4.create()), glm.deg2rad(180*(1-Math.cos(p*Math.PI)))), glm.deg2rad(maskAngleUp*Math.sin(p*Math.PI))), duration: maskLookaroundDuration});
  steps.push({matrix: mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(0, 10, -50)), duration: 3000});
  steps.push({matrix: p => mat4.translate(mat4.create(), mat4.rotateY(mat4.create(), mat4.identity(mat4.create()), glm.deg2rad(360 * p)), vec3.fromValues(0, 10, -50)), duration: 3000});
  steps.push({matrix: mat4.translate(mat4.create(), mat4.rotateY(mat4.create(), mat4.identity(mat4.create()), glm.deg2rad(360)), vec3.fromValues(0, 10, -50)), duration: 2000});

  steps.push({matrix: mat4.translate(mat4.create(), mat4.create(), lastStepPos), duration: 1000});
  steps.forEach(p => p.duration *= animationSpeedupFactor);
  
  let cameraAnimation = new Animation(camera, steps, doLooping);
  return cameraAnimation;
}

function random01() {
  return Math.random();
}

function random1() {
  return Math.random() * 2.0 - 1.0;
}

function randomFloat(max) {
  return (Math.random() * 2.0 - 1.0) * max;
}

function randomVelocity() {
  var max = 5.0;
  var x = randomFloat(max);
  var z = randomFloat(max);
  while(x*x + z*z < 0.3) {
    x = randomFloat(max);
    z = randomFloat(max);
  }
  return vec3.fromValues(x, random01()*3.0, z);
}

function randomStartPosition() {
  return vec3.fromValues(random1(), 0, random1());
}

function makeParticleSGNode(p) {
  return new ParticleSGNode(p, glm.transform({translate: p.position}), new RenderSGNode(makeSphere(p.size, 4, 4)))
}

function addParticles(n) {
  for (i = 0; i < n; i++) {
    particles.push(new Particle(
      randomStartPosition(),
      random01()*.05+0.01,
      randomVelocity(),
      random01()*10000)
    );
    if (particles.length > maxNumOfParticles) {
      return;
    }
  }
}

function updateParticles(dt) {  
  particles.forEach(p => {
    p.position = vec3.scaleAndAdd(vec3.create(), p.position, p.velocity, dt*0.001);
    p.timeAlive += dt;
  });
  var r = 0;
  while (i < particles.length) {
    if (particles[i].timeAlive > particles[i].lifetime) {
      particles[i].isDead = true;
      particles.splice(i, 1);
      particleRoot.children.splice(i, 1);
      r++;
    }
    else {
      i++;
    }
  }
  var numOfNewParticles = Math.ceil(r * random01() + 1);
  console.log(numOfNewParticles);
  addParticles(numOfNewParticles);
  for (i = 0; i < numOfNewParticles; i++) {
    particleRoot.append(makeParticleSGNode(particles[particles.length - i - 1]));
  }
}

function createSceneGraph(gl, resources) {
  //create scenegraph
  const root = new ShaderSGNode(createProgram(gl, resources.vs, resources.fs))

  // create node with different shaders
  function createLightSphere() {
    return new ShaderSGNode(createProgram(gl, resources.vs_single, resources.fs_single), [
      new RenderSGNode(makeSphere(.2, 10, 10))
    ]);
  }

  //Particle shaders
  particleRoot = new ShaderSGNode(createProgram(gl, resources.vs_particle, resources.fs_particle));
  addParticles(initialNumOfParticles);
  particles.forEach(p => particleRoot.append(makeParticleSGNode(p)));
  root.append(particleRoot);


  // create white light node
  let light = new LightSGNode();
  light.ambient = [.5, .5, .5, 1];
  light.diffuse = [1, 1, 1, 1];
  light.specular = [1, 1, 1, 1];
  light.position = [0, 10, 0];
  light.append(createLightSphere(resources));
  // add light to scenegraph
  root.append(light);

  //single mask
  let maskSurface = new MaterialSGNode([
    new RenderSGNode(makeMask())
  ]);
  let leftMaskSurface = new TransformationSGNode(glm.transform({translate: [0, 0, 0]}), maskSurface);
  let rightMaskSurface = new TransformationSGNode(glm.transform({translate: [0, 0, 0], scale: [-1, 1, 1]}), maskSurface);
  let mainMask = new TransformationSGNode(glm.transform({translate: [0, 1.5, 0], rotateY: 180}), [leftMaskSurface, rightMaskSurface]);
  
  let maskEye = new TransformationSGNode(mat4.create(), new MaterialSGNode([
    new RenderSGNode(makeSphere(0.1, 15, 15))
  ]));
  let leftEye = new TransformationSGNode(glm.transform({translate: [-0.5, 1.7, -0.7]}), maskEye);
  let rightEye = new TransformationSGNode(glm.transform({translate: [0.5, 1.7, -0.7]}), maskEye);
  let maskEyes = new TransformationSGNode(mat4.create(), [leftEye, rightEye]);

  let fullMask = new TransformationSGNode(mat4.create(), [mainMask, maskEyes]);

  maskSurface.ambient = [0.2, 0.2, 0.2, 1];
  maskSurface.diffuse = [0.5, 0.5, 0.5, 1];
  maskSurface.specular = [0.5, 0.5, 0.5, 1];
  maskSurface.shininess = 3;
  
  maskEye.ambient = [1.0, 0.2, 0.2, 1];
  maskEye.diffuse = [1.0, 0.2, 0.2, 1];
  maskEye.specular = [1.0, 0.2, 0.2, 1];
  maskEye.shininess = 50;

  root.append(new TransformationSGNode(mat4.create(), fullMask));

  //circle of masks
  maskNum = 15;
  maskCircleTM = mat4.create();
  let maskCircleTransformation = new TransformationSGNode(maskCircleTM);
  let maskCircle = new SGNode(maskCircleTransformation);

  for (i = 0; i < maskNum; i++) {
    let angle = 2.0 * Math.PI * i / maskNum;
    let distanceFromCenter = 15;
    let animationWrapperNode = new TransformationSGNode(mat4.create(mat4.identity), fullMask);
    let maskAnimation = new Animation(animationWrapperNode, [], false);

    let billboardAnimationOnMask = new Animation(animationWrapperNode, [], false);
    billboardAnimations.push(billboardAnimationOnMask);

    singleMaskAnimation.push(maskAnimation);
    let transformNode = new TransformationSGNode(glm.transform({ translate: [distanceFromCenter*Math.sin(angle), 2, distanceFromCenter*Math.cos(angle)], rotateY: 360/maskNum*i }), animationWrapperNode);
    maskCircleTransformation.append(transformNode);
  }


  //animations
  let maskCircleAnimationSteps = [
    { matrix: mat4.create(), duration: 13000 },
    { matrix: p => glm.transform({ translate: [0, 0.5 * Math.sin(p*40*Math.PI), 0], rotateY: 5*Math.sin(p*20*Math.PI) }), duration: 25000 }
  ];
  maskCircleAnimationSteps.forEach(p => p.duration *= animationSpeedupFactor);
  maskCircleAnimation = new Animation(maskCircleTransformation, maskCircleAnimationSteps, false);
  maskCircleAnimation.start();

  let eyeAnimationSteps = [
    { matrix: mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(-0.02, -0.2, 0)), duration: maskFocusDuration },
    { matrix: mat4.create(), duration: maskFocusDuration },
    { matrix: mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(0.02, -0.2, 0)), duration: maskFocusDuration },
    { matrix: mat4.create(), duration: maskFocusDuration },
    { matrix: mat4.create(), duration: maskLookaroundDuration },
    { matrix: p => glm.transform({scale: 0.6 * Math.sin(p * 20 * 2 * Math.PI) + 1.6}), duration: 25000 },
    { matrix: mat4.create(), duration: 1000 },
  ];
  eyeAnimationSteps.forEach(p => p.duration *= animationSpeedupFactor);
  eyeAnimation = new Animation(maskEye, eyeAnimationSteps, false);
  eyeAnimation.start();

  root.append(maskCircle);
    
  // create floor
  let floor = new MaterialSGNode([
    new RenderSGNode(makeRect(2, 2))
  ]);
  //dark
  floor.ambient = [0.2, 0.2, 0.2, 1];
  floor.diffuse = [0.1, 0.1, 0.1, 1];
  floor.specular = [0.5, 0.5, 0.5, 1];
  floor.shininess = 3;
  // add floor to scenegraph
  root.append(new TransformationSGNode(glm.transform({ translate: [0, -0.1, 0], rotateX: -90, scale: 10 }), [
    floor
  ]));

  return root;
}

/**
 * render one frame
 */
function render(timeInMilliseconds) {
  // check for resize of browser window and adjust canvas sizes
  checkForWindowResize(gl);

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  //clear the buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //enable depth test to let objects in front occluse objects further away
  gl.enable(gl.DEPTH_TEST);

  //Create projection Matrix and context for rendering.
  const context = createSGContext(gl);
  context.projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(30), gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);
  context.viewMatrix = mat4.lookAt(mat4.create(), [0, 1, -10], [0, 0, 0], [0, 1, 0]);

  var deltaTime = timeInMilliseconds - previousTime;
  previousTime = timeInMilliseconds;

  //update animation BEFORE camera
  cameraAnimation.update(deltaTime);
  camera.update(deltaTime);

  //update particles
  updateParticles(deltaTime);

  //At the end of the automatic flight, switch to manual control
  if(!cameraAnimation.running && !camera.control.enabled) {
    camera.control.enabled = true;
  }

  //TODO use your own scene for rendering
  maskCircleAnimation.update(deltaTime);
  singleMaskAnimation.forEach(p => p.update(deltaTime));
  eyeAnimation.update(deltaTime);
  if (billboardAnimationsRunning) {
    billboardAnimations.forEach(p => p.update(deltaTime));
  }

  //Billboarding Animation
  if (!maskCircleAnimation.running && !billboardAnimationsRunning) {
    billboardAnimations.forEach(p => p.start());
    billboardAnimationsRunning = true;
  }


  //Apply camera
  camera.render(context);

  //Render scene
  root.render(context);

  //request another call as soon as possible
  requestAnimationFrame(render);
}

function createSingleMaskAnimation() {  
  for (i = 0; i < singleMaskAnimation.length; i++) {
    let animation = singleMaskAnimation[i];
    let steps = [];
    steps.push({matrix: mat4.create(mat4.identity), duration: 15000});
    steps.push({matrix: (ii => p => mat4.rotateY(mat4.create(),
                                          mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(0, 3 * (p+1) * (1-Math.cos(p*10*Math.PI))/2.0, 0)),
                                          glm.deg2rad(p * 360 * 10 * (ii % 3 + 1))))(i)
                                          ,
                                          duration: 6000 });
    
    steps.forEach(p => p.duration *= animationSpeedupFactor);
    animation.segments = steps;
    animation.currentSegment = steps[0];
    animation.start();
  }
}

function createBillboardAnimation() {
  for (i = 0; i < billboardAnimations.length; i++) {
    let animation = billboardAnimations[i];
    let steps = [];
    steps.push({matrix: mat4.create(mat4.identity), duration: 3000});
    steps.push({matrix: (ii => p => mat4.rotateY(mat4.create(),
                                          mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(0, 3 * (p+1) * (1-Math.cos(p*10*Math.PI))/2.0, 0)),
                                          glm.deg2rad(p * 360 * 10 * (ii % 3 + 1))))(i)
                                          ,
                                          duration: 6000 });
    
    steps.forEach(p => p.duration *= animationSpeedupFactor);
    animation.segments = steps;
    animation.currentSegment = steps[0];
  }
}

/**
 * hand-crafted mask testing from cube example
 */

// half cube vars
var maskVertices = new Float32Array(positions = [
  // Front face
   0.0, -1.0,  1.0,
   1.0, -1.0,  1.0,
   1.0,  1.0,  1.0,
   0.0,  1.0,  1.0,

  // Back face
   0.0, -1.0, -1.0,
   0.0,  1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0, -1.0, -1.0,

  // Top face
   0.0,  1.0, -1.0,
   0.0,  1.0,  1.0,
   1.0,  1.0,  1.0,
   1.0,  1.0, -1.0,

  // Bottom face
   0.0, -1.0, -1.0,
   1.0, -1.0, -1.0,
   1.0, -1.0,  1.0,
   0.0, -1.0,  1.0,

  // Right face
   1.0, -1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0,  1.0,  1.0,
   1.0, -1.0,  1.0,

  // Left face
   0.0, -1.0, -1.0,
   0.0, -1.0,  1.0,
   0.0,  1.0,  1.0,
   0.0,  1.0, -1.0,
]);

var maskNormals = new Float32Array([
  // Front
   0.0,  0.0,  1.0,
   0.0,  0.0,  1.0,
   0.0,  0.0,  1.0,
   0.0,  0.0,  1.0,

  // Back
   0.0,  0.0, -1.0,
   0.0,  0.0, -1.0,
   0.0,  0.0, -1.0,
   0.0,  0.0, -1.0,

  // Top
   0.0,  1.0,  0.0,
   0.0,  1.0,  0.0,
   0.0,  1.0,  0.0,
   0.0,  1.0,  0.0,

  // Bottom
   0.0, -1.0,  0.0,
   0.0, -1.0,  0.0,
   0.0, -1.0,  0.0,
   0.0, -1.0,  0.0,

  // Right
   1.0,  0.0,  0.0,
   1.0,  0.0,  0.0,
   1.0,  0.0,  0.0,
   1.0,  0.0,  0.0,

  // Left
  -1.0,  0.0,  0.0,
  -1.0,  0.0,  0.0,
  -1.0,  0.0,  0.0,
  -1.0,  0.0,  0.0
]);

var maskTextures = new Float32Array([
  // Front
   0.0,  0.0,  0.0,
   0.0,  0.0,  0.0,
   0.0,  0.0,  0.0,
   0.0,  0.0,  0.0,

  // Back
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,

  // Top
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,

  // Bottom
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,

  // Right
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,

  // Left
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
  0.0,  0.0,  0.0,
]);

var maskIndices =  new Float32Array([
  0,  1,  2,      0,  2,  3,    // front
  4,  5,  6,      4,  6,  7,    // back
  8,  9,  10,     8,  10, 11,   // top
  12, 13, 14,     12, 14, 15,   // bottom
  16, 17, 18,     16, 18, 19,   // right
  20, 21, 22,     20, 22, 23,   // left
]);

// ------------------------------------------
// HANDCRAFTED OBJ, 60 V per Half-Mask
//
// mask in half cube (normalized) space
// vertices can be added free form
// IN SETS OF FOUR TO MAKE 1xFACE, i.e.
// 0x         0y        0z
// 1x         1y        1z
// 2x         2y        2z
// 3x         3y        3z
//
// indexes to 0(xyz), 1(xyz), 2(xyz), 0(xyz), 2(xyz), 3(xyz)
// with dynamic indexing function
// also norms and textures dynamically
//
// vertices still need to be mirrored on the z-Plane: do in SG

var maskVertices = new Float32Array(
  [
    -0.0330,  -0.7478,  -0.7938,
    0.5961,   -0.4700,  -0.7439,
    0.6198,   -0.7752,  -0.3154,
    -0.0094,  -1.0530,  -0.3652,

    0.6379,   0.7550,   -0.6566,
    -0.0221,  0.8320,   -0.6568,
    -0.0153,  1,        -0.3575,
    0.6447,   0.9229,   -0.3573,

    0.6447,   0.9229,   -0.3573,
    -0.0153,  1,        -0.3575,
    -0.0177,  0.9448,   0.2327,
    0.6423,   0.8677,   0.2329,

    -0.0039,  -1.0399,  0.1890,
    0.6252,   -0.7621,  0.2388,
    0.5581,   -0.6295,  0.6452,
    0,        -0.8818,  0.5976,

    0.8787,   0.3821,   0.2777,
    0.6423,   0.8677,   0.2329,
    0.6309,   0.6383,   0.6245,
    0.7127,   0.2992,   0.5722,

    -0.0249,  0.3719,   -0.8022,
    -0.0221,  0.8320,   -0.6568,
    0.6379,   0.7550,   -0.6566,
    0.6540,   0.4338,   -0.8011,

    0.8841,   0.4181,   -0.3573,
    0.6447,   0.9229,   -0.3573,
    0.6423,   0.8677,   0.2329,
    0.8787,   0.3821,   0.2777,

    0.6540,   0.4338,   -0.8011,
    0.6379,   0.7550,   -0.6566,
    0.6447,   0.9229,   -0.3573,
    0.8841,   0.4181,   -0.3573,

    0.7127,   0.2992,   0.5722,
    0.6309,   0.6383,   0.6245,
    0,        0.8095,   0.6766,
    -0.0214,  0.2708,   0.7517,

    0.6423,   0.8677,   0.2329,
    -0.0177,  0.9448,   0.2327,
    0,        0.8095,   0.6766,
    0.6309,   0.6383,   0.6245,
    
    -0.0094,  -1.0530,  -0.3652,
    0.6198,   -0.7752,  -0.3154,
    0.6252,   -0.7621,  0.2388,
    -0.0039,  -1.0399,  0.1890,
    
    0.5581,   -0.6295,  0.6452,
    0.7571,   -0.257,   0.6246,
    0,        -0.1872,  1.0728,
    0,        -0.8818,  0.5976,

    0.5961,   -0.4700,  -0.7439,
    0.6540,   -0.2282,  -0.8011,
    0.8841,   -0.2440,  -0.3573,
    0.6198,   -0.7752,  -0.3154,

    0.6198,   -0.7752,  -0.3154,
    0.8841,   -0.2440,  -0.3573,
    0.8841,   -0.2440,  0.3214,
    0.6252,   -0.7621,  0.2388,

    -0.0330,  -0.7478,  -0.7938,
    -0.0249,  -0.2902,  -0.8022,
    0.6540,   -0.2282,  -0.8011,
    0.5961,   -0.4700,  -0.7439,

    0.6252,   -0.7621,  0.2388,
    0.8841,   -0.2440,  0.3214,
    0.7571,   -0.257,   0.6246,
    0.5581,   -0.6295,  0.6452,

    0.7571,   -0.2570,  0.6246,
    0.7127,   0.2992,   0.5722,
    -0.021,   0.2708,   0.751,
    0,        -0.1872,  1.0728,

    0.6540,   -0.2282,  -0.8011,
    0.6540,   0.4338,   -0.8011,
    0.8841,   0.4181,   -0.3573,
    0.8841,   -0.2440,  -0.3573,

    0.8841,   -0.244,   -0.3573,
    0.8841,   0.4181,   -0.3573,
    0.8787,   0.3821,   0.2777,
    0.8841,   -0.2440,  0.3214,

    0.8841,   -0.2440,  0.3214,
    0.8787,   0.3821,   0.2777,
    0.7127,   0.2992,   0.5722,
    0.7571,   -0.257,   0.6246,

    -0.0249,  -0.2902,  -0.8022,
    -0.0249,  0.3719,   -0.8022,
    0.6540,   0.4338,   -0.8011,
    0.6540,   -0.2282,  -0.8011
    
]);

// vector class for cross prod calc (normals calc)
class Vector {
  constructor(...components) {
    this.components = components
  }
  
  // 3D vectors only
  crossProduct({ components }) {
    return new Vector(
      this.components[1] * components[2] - this.components[2] * components[1],
      this.components[2] * components[0] - this.components[0] * components[2],
      this.components[0] * components[1] - this.components[1] * components[0]
    )
  }
}

function normalsArrByVList(v) { 
  var verticeSum = v/3;

  var vertices = [];

  // collect vertices in array form for vertex calcs
  for (i = 0; i < verticeSum; i++) {
    vertices[i] = [maskVertices[i * 3], maskVertices[i * 3 + 1], maskVertices[i * 3 + 2]];  
  }

  //console.log(vertices);

  var neigboringVerticeA, neighboringVerticeB;
  var edge_a, edge_b;

  var cross;
  var crossToArr = [];

  for (i = 0; i < verticeSum; i++) { 

    if (i % 4 == 0) {
      neigboringVerticeA = vertices[i + 1];
      neigboringVerticeB = vertices[i + 2];
      
      edge_a = new Vector(neigboringVerticeA[0] - vertices[i][0], neigboringVerticeA[1] - vertices[i][1], neigboringVerticeA[2] - vertices[i][2]);
      edge_b = new Vector(neigboringVerticeB[0] - vertices[i][0], neigboringVerticeB[1] - vertices[i][1], neigboringVerticeB[2] - vertices[i][2]);

      cross = edge_a.crossProduct(edge_b);
      //console.log(cross);

      crossToArr.push(cross.components[0]);
      crossToArr.push(cross.components[1]);
      crossToArr.push(cross.components[2]);
    } else if (i % 4 == 1) {
      neigboringVerticeA = vertices[i - 1];
      neigboringVerticeB = vertices[i + 1];
      
      edge_a = new Vector(neigboringVerticeA[0] - vertices[i][0], neigboringVerticeA[1] - vertices[i][1], neigboringVerticeA[2] - vertices[i][2]);
      edge_b = new Vector(neigboringVerticeB[0] - vertices[i][0], neigboringVerticeB[1] - vertices[i][1], neigboringVerticeB[2] - vertices[i][2]);

      cross = edge_a.crossProduct(edge_b);
      //console.log(cross);

      crossToArr.push(cross.components[0]);
      crossToArr.push(cross.components[1]);
      crossToArr.push(cross.components[2]);
    } else if (i % 4 == 2) {
      neigboringVerticeA = vertices[i - 1];
      neigboringVerticeB = vertices[i - 2];
      
      edge_a = new Vector(neigboringVerticeA[0] - vertices[i][0], neigboringVerticeA[1] - vertices[i][1], neigboringVerticeA[2] - vertices[i][2]);
      edge_b = new Vector(neigboringVerticeB[0] - vertices[i][0], neigboringVerticeB[1] - vertices[i][1], neigboringVerticeB[2] - vertices[i][2]);

      cross = edge_a.crossProduct(edge_b);
      //console.log(cross);

      crossToArr.push(cross.components[0]);
      crossToArr.push(cross.components[1]);
      crossToArr.push(cross.components[2]);
    } else {
      neigboringVerticeA = vertices[i - 1];
      neigboringVerticeB = vertices[i - 3];
      
      edge_a = new Vector(neigboringVerticeA[0] - vertices[i][0], neigboringVerticeA[1] - vertices[i][1], neigboringVerticeA[2] - vertices[i][2]);
      edge_b = new Vector(neigboringVerticeB[0] - vertices[i][0], neigboringVerticeB[1] - vertices[i][1], neigboringVerticeB[2] - vertices[i][2]);

      cross = edge_a.crossProduct(edge_b);
      //console.log(cross);

      crossToArr.push(cross.components[0]);
      crossToArr.push(cross.components[1]);
      crossToArr.push(cross.components[2]);
    }

  }

  //console.log(crossToArr);
  return crossToArr;
}

var maskNormals =  new Float32Array(normalsArrByVList(maskVertices.length));

function texturesArrByVList(v) { 
  var textures = [];
  for (i = 0; i < v; i++) {
    textures[i] = 1; // ----------------------- simple texture
    // still needed: 2. Hand-crafted object / b) Apply a texture to your self-created complex object by setting proper texture coordinates.
  }

  console.log(textures);
  return textures;
}

var maskTextures =  new Float32Array(texturesArrByVList(maskVertices.length/2));

// 
// algorithmic solution to index calculation
// 

function indexArrByVList(v) { 
  var indexes = [];
  var sideCounter = 0; // keeps track of sides, or faces
  var vertexInnerCounter = 0; // counts face-vertices, 0 - 5
  for (i = 0; i < v; i++) {
    if (i % 6 == 0) {
      indexes[i] = sideCounter * 4;
      vertexInnerCounter++;
    } else if (i % 6 == 1) {
      indexes[i] = sideCounter * 4 + 1;
      vertexInnerCounter++;
    } else if (i % 6 == 2) {
      indexes[i] = sideCounter * 4 + 2;
      vertexInnerCounter++;
    } else if (i % 6 == 3) {
      indexes[i] = sideCounter * 4;
      vertexInnerCounter++;
    } else if (i % 6 == 4) {
      indexes[i] = sideCounter * 4 + 2;
      vertexInnerCounter++;
    } else if (i % 6 == 5) {
      indexes[i] = sideCounter * 4 + 3;
      vertexInnerCounter++;
    }

    if (vertexInnerCounter % 6 == 0) {
      sideCounter++;
      vertexInnerCounter = 0;
    }
  }

  console.log(indexes);
  return indexes;
}

var maskIndices =  new Float32Array(indexArrByVList(maskVertices.length/2));

// sample set to illustrate

/*var maskIndices =  new Float32Array([
  0, // 0
  1, // 1
  2, // 2
  0, // 3
  2, // 4
  3, // 5

  4, // 6
  5, // 7
  6, // 8
  4, // 9
  6, // 10
  7, // 11

  8, // 12
  9, // ...
  .
  .
  .

]);*/

// fn for mask
function makeMask() {
  var position = maskVertices;
  var normal = maskNormals;
  var texture = maskTextures;
  var index = maskIndices;
  return {
    position: position,
    normal: normal,
    texture: texture,
    index: index
  };
}
