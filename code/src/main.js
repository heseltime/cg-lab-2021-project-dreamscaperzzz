//the OpenGL context
var gl = null,
  program = null;

//Camera
var cameraAutostartEnabled = true;
var animationSpeedupFactor = 1.0;
var camera = null;
var cameraPos = vec3.create();
var cameraCenter = vec3.create();
var cameraAnimation = null;

// scenegraph root node
var root = null;

//mask circle
var maskCircleTM = mat4.create();
var maskCircleAnimation;

// time in last render step
var previousTime = 0;

//load the shader resources using a utility function
loadResources({
  vs: './src/shader/phong.vs.glsl',
  fs: './src/shader/phong.fs.glsl',
  vs_single: './src/shader/single.vs.glsl',
  fs_single: './src/shader/single.fs.glsl',
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
}

function createCameraAnimation(camera, doLooping, lastStepPos) {
  let steps = [];
  let maskAngleUp = -10;
  let maskAngleLeft = 15;
  let maskAngleRight = -15;
  let maskFocusDuration = 1500;
  let maskLookaroundDuration = 6000;

  let startMatrix = mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(0, 0, 0));

  steps.push({matrix: startMatrix, duration: 1});
  steps.push({matrix: mat4.rotateX(mat4.create(), mat4.rotateY(mat4.create(), mat4.identity(mat4.create()), glm.deg2rad(maskAngleLeft)), glm.deg2rad(maskAngleUp)), duration: maskFocusDuration});    
  steps.push({matrix: startMatrix, duration: maskFocusDuration});
  steps.push({matrix: mat4.rotateX(mat4.create(), mat4.rotateY(mat4.create(), mat4.identity(mat4.create()), glm.deg2rad(maskAngleRight)), glm.deg2rad(maskAngleUp)), duration: maskFocusDuration});
  steps.push({matrix: startMatrix, duration: maskFocusDuration});
  steps.push({matrix: p => mat4.rotateX(mat4.create(), mat4.rotateY(mat4.create(), mat4.identity(mat4.create()), glm.deg2rad(180*(1-Math.cos(p*Math.PI)))), glm.deg2rad(maskAngleUp*Math.sin(p*Math.PI))), duration: maskLookaroundDuration});
  steps.push({matrix: mat4.translate(mat4.create(), mat4.create(), vec3.fromValues(0, 10, -50)), duration: 2000});
  steps.push({matrix: p => mat4.translate(mat4.create(),  mat4.rotateY(mat4.create(), mat4.identity(mat4.create()), glm.deg2rad(360 * p)), vec3.fromValues(0, 10, -50)), duration: 2000});

  steps.push({matrix: mat4.translate(mat4.create(), mat4.create(), lastStepPos), duration: 1000});
  steps.forEach(p => p.duration *= animationSpeedupFactor);
  
  let cameraAnimation = new Animation(camera, steps, doLooping);
  return cameraAnimation;
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

  // create white light node
  let light = new LightSGNode();
  light.ambient = [.5, .5, .5, 1];
  light.diffuse = [1, 1, 1, 1];
  light.specular = [1, 1, 1, 1];
  light.position = [0, 10, 0];
  light.append(createLightSphere(resources));
  // add light to scenegraph
  root.append(light);


  let maskCircle = new SGNode();
  root.append(maskCircle);
  
  maskCircleTM = mat4.create();
  let maskCircleTransformation = new TransformationSGNode(maskCircleTM);
  maskCircle.append(maskCircleTransformation);
  
  let maskCircleAnimationMat = [
    { matrix: mat4.create(), duration: 13000 },
    { matrix: p => glm.transform({ translate: [0, 0.5 * Math.sin(p*40*Math.PI), 0], rotateY: 5*Math.sin(p*20*Math.PI) }), duration: 25000 }
  ];
  maskCircleAnimationMat.forEach(p => p.duration *= animationSpeedupFactor);
  maskCircleAnimation = new Animation(maskCircleTransformation, maskCircleAnimationMat, false);
  maskCircleAnimation.start();

  // create C3PO
  let c3po = new MaterialSGNode([
    new RenderSGNode(resources.model)
  ]);
  //gold
  c3po.ambient = [0.24725, 0.1995, 0.0745, 1];
  c3po.diffuse = [0.75164, 0.60648, 0.22648, 1];
  c3po.specular = [0.628281, 0.555802, 0.366065, 1];
  c3po.shininess = 50;
  //add c3pos in circle to act as dummy masks
  c3poNum = 15;
  for (i = 0; i < c3poNum; i++) {
    let angle = 2.0 * Math.PI * i / c3poNum;
    let distanceFromCenter = 15;
    let transformNode = new TransformationSGNode(glm.transform({ translate: [distanceFromCenter*Math.sin(angle), 2, distanceFromCenter*Math.cos(angle)], rotateY: 360/c3poNum*i+180 }), [
      c3po
    ]);
    // add C3PO to scenegraph
    maskCircleTransformation.append(transformNode);
  }
  
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

  //At the end of the automatic flight, switch to manual control
  if(!cameraAnimation.running && !camera.control.enabled) {
    camera.control.enabled = true;
  }

  //TODO use your own scene for rendering
  maskCircleAnimation.update(deltaTime);

  //Apply camera
  camera.render(context);

  //Render scene
  root.render(context);

  //request another call as soon as possible
  requestAnimationFrame(render);
}

