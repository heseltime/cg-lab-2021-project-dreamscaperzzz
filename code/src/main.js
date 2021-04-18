//the OpenGL context
var gl = null,
  program = null;


//Camera
var camera = null;
var cameraPos = vec3.create();
var cameraCenter = vec3.create();
var cameraAnimation = null;

// scenegraph root node
var root = null;

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
  cameraStartPos = vec3.fromValues(0, 0, 0);
  cameraEndAnimationPos = vec3.fromValues(0, 1, -20);
  camera = new UserControlledCamera(gl.canvas, cameraEndAnimationPos);
  //setup an animation for the camera, moving it into position
  defaultDuration = 1000;
  cameraMats = [];
  cameraMatStart = mat4.translate(mat4.create(), mat4.create(), cameraStartPos)
  maskAngleUp = -10;
  maskAngleLeft = 10;
  maskAngleRight = -10;
  cameraMats.push({matrix: cameraMatStart, duration: 1});
  cameraMats.push({matrix: mat4.rotateX(mat4.create(), mat4.rotateY(mat4.create(), cameraMatStart, glm.deg2rad(maskAngleLeft)), glm.deg2rad(maskAngleUp)), duration: defaultDuration});
  cameraMats.push({matrix: cameraMatStart, duration: defaultDuration});
  cameraMats.push({matrix: mat4.rotateX(mat4.create(), mat4.rotateY(mat4.create(), cameraMatStart, glm.deg2rad(maskAngleRight)), glm.deg2rad(maskAngleUp)), duration: defaultDuration});
  cameraMats.push({matrix: cameraMatStart, duration: defaultDuration});
  cameraMats.push({matrix: progress => mat4.rotateX(mat4.create(), mat4.rotateY(mat4.create(), cameraMatStart, glm.deg2rad(180*(1-Math.cos(progress*Math.PI)))), glm.deg2rad(maskAngleUp*Math.sin(progress*Math.PI))), duration: 10*defaultDuration});
  cameraMats.push({matrix: mat4.translate(mat4.create(), mat4.create(), cameraEndAnimationPos), duration: defaultDuration});
  cameraAnimation = new Animation(camera, cameraMats, false);
  cameraAnimation.start()
  //TODO create your own scenegraph
  root = createSceneGraph(gl, resources);
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
  light.position = [0, 2, 2];
  light.append(createLightSphere(resources));
  // add light to scenegraph
  root.append(light);

  // JH1 mask test
  let mask = new MaterialSGNode([
    new RenderSGNode(makeMask())
  ]);

  mask.ambient = [0.2, 0.2, 0.2, 1];
  mask.diffuse = [0.1, 0.1, 0.1, 1];
  mask.specular = [0.5, 0.5, 0.5, 1];
  mask.shininess = 3;

  root.append(new TransformationSGNode(glm.transform({ translate: [0, -1.5, 0], rotateX: -90, scale: 3 }), [
    mask
  ]));

  // create C3PO
  let c3po = new MaterialSGNode([
    new RenderSGNode(resources.model)
  ]);
  //gold
  c3po.ambient = [0.24725, 0.1995, 0.0745, 1];
  c3po.diffuse = [0.75164, 0.60648, 0.22648, 1];
  c3po.specular = [0.628281, 0.555802, 0.366065, 1];
  c3po.shininess = 50;
  let transformNode = new TransformationSGNode(glm.translate(0, -1.5, 0), [
    c3po
  ]);
  // add C3PO to scenegraph
  root.append(transformNode);

  //add c3pos in circle to act as dummy masks
  c3poNum = 20;
  for (i = 0; i < c3poNum; i++) {
    let transformNode = new TransformationSGNode(mat4.translate(mat4.create(), mat4.rotateY(mat4.create(), mat4.create(), glm.deg2rad(360/c3poNum*i+90)), vec3.fromValues(10, -0.5, 0)), [
      c3po 
    ]);
    // add C3PO to scenegraph
    root.append(transformNode);
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
  root.append(new TransformationSGNode(glm.transform({ translate: [0, -1.5, 0], rotateX: -90, scale: 3 }), [
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

  //Apply camera
  camera.render(context);

  //Render scene
  root.render(context);

  //request another call as soon as possible
  requestAnimationFrame(render);
}

/**
 * JH1: mask fn, low poly intermediate submission selfmade obj CUBE DRAFT!
 */

var maskVertices = new Float32Array(positions = [
  // Front face
  -1.0, -1.0,  1.0,
   1.0, -1.0,  1.0,
   1.0,  1.0,  1.0,
  -1.0,  1.0,  1.0,

  // Back face
  -1.0, -1.0, -1.0,
  -1.0,  1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0, -1.0, -1.0,

  // Top face
  -1.0,  1.0, -1.0,
  -1.0,  1.0,  1.0,
   1.0,  1.0,  1.0,
   1.0,  1.0, -1.0,

  // Bottom face
  -1.0, -1.0, -1.0,
   1.0, -1.0, -1.0,
   1.0, -1.0,  1.0,
  -1.0, -1.0,  1.0,

  // Right face
   1.0, -1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0,  1.0,  1.0,
   1.0, -1.0,  1.0,

  // Left face
  -1.0, -1.0, -1.0,
  -1.0, -1.0,  1.0,
  -1.0,  1.0,  1.0,
  -1.0,  1.0, -1.0,
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