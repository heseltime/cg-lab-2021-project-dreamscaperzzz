# CG Lab Project

Submission template for the CG lab project at the Johannes Kepler University Linz.

### Explanation

This `README.md` needs to be pushed to Github for each of the 3 delivery dates.
For every submission change/extend the corresponding sections by replacing the *TODO* markers. Make sure that you push everything to your Github repository before the respective deadlines. For more details, see the Moodle page

## Concept submission due on 26.03.2021

### Movie Name

Dreamscape(rzzz)

### Group Members

|                  | Student ID    | First Name  | Last Name      | E-Mail                    |
|------------------|---------------|-------------|----------------|---------------------------|
| Gartner, Mathias | 1156113       | Mathias     | Gartner        | mathiasgartner@gmx.at     |
| Heseltine, Jack  | 1409574       | Jack        | Heseltine      | k01409574@students.jku.at |

### Concept Submission due on 26.03.2021

The Dreamscape is a world filled with about 5 - 10 disembodied, floating masks, that haunt you, or the scene's camera, by staring after you. The masks are moving and will encircle the camera. At some time in the movie, new masks will fly in from far away and join the already moving masks in their dance.

Technical Effect Proposal 1 = CUSTOM EFFECT SUGGESTION: The masks that follow the camera with their eyeline is conceptually linked to  the Billboarding effect, EXCEPT that the floating surface is replaced by a semi-flat, low-poly "face" with an orthogonal vector originating from the midpoint between the mask's eyes and pointing at the camera. There is a back and a front side of the mask, which may be displayed during the camera rotation or when the masks are rotating around their own axis. The basic implementation, perhaps within a certain radius, is the effect of orientation towards the camera, much like in the Billboarding effect, but with the described differences. Suggestion: 10 Points, as per the Billboarding effect's points distribution, because the implementation method is similar and of similar scope.

The story is an inspection of these various masks, revealing the Billboarding effect dramatically, via clever camera routing through the space. The final plot point is a reveal that the masks themselves are moving, in fact converging in parallel, towards the camera.

After the 30 second camera flight, the user is free to move the camera and escape the masks or take another look at the masks that interested him. The faces in the masks are a collection of bland, generic faces, public figures (Madame-Toussaud's-style), and even animal and totem masks (without wishing to delve into stereotypical/racist representations). These are execution-dependent and the minimum number we would like to agree on now is 5 masks, with the goal to create more for a more detailed and interesting scene, if time allows.

Technical Effect Proposal 2: One other dramatic element we will add, or periodically switch off and on, is a particle system for a weather phenomenon. This will most likely be rain, but as it is a dream sequence, we would like to experiment with the actual precipitation - the type and amount of particles - and also try to create a rain of fireballs or similar objects. If we manage to do so, the amount of particles should also depend on the movements of the masks, to give the impression that they are performing some kind of rain dance. (20P.)

(Explain the basic story of your movie, i.e., planned scenes, what happens, which objects are used, etc.)

### Special Effects

Selected special effects must add up to exactly 30 points. Replace yes/no with either yes or no.

| Selected   | ID | Name                                  | Points |
|------------|----|---------------------------------------|--------|
|     no     | S1 | Multi texturing                       | 10     |  
|     no     | S2 | Level of detail                       | 10     |
| yes/CUSTOM!| S3 | Billboarding                          | 10     |
|     no     | S4 | Terrain from heightmap                | 20     |
|     no     | S5 | Postprocessing shader                 | 20     |
|     no     | S6 | Animated water surface                | 20     |
|     no     | S7 | Minimap                               | 20     |
| yes        | S8 | Particle system (rain, smoke, fire)   | 20     |
|     no     | S9 | Motion blur                           | 30     |
|     no     | SO | Own suggestion (preapproved by email) | TODO   |

## Intermediate Submission due on 23.04.2021

Prepare a first version of your movie that:
 * is 30 seconds long,
 * contains animated objects, and
 * has an animated camera movement. 

Push your code on the day of the submission deadline. 
The repository needs to contain:
  * code/ Intermediate code + resources + libs
  * video/ A screen recording of the intermediate result

Nothing to change here in `README` file.

**Note:** You don’t need to use any lighting, materials, or textures yet. This will be discussed in later labs and can be added to the project afterwards!

## Final Submission due on 22.06.2021

The repository needs to contain:
  * code/ Documented code + resources + libs
  * video/ A screen recording of the movie
  * README.md


### Workload

| Student ID     | Workload (in %) |
| ---------------|-----------------|
| 1156113        | 50              |
| 1409574        | 50              |

Workload has to sum up to 100%.

### Effects

Select which effects you have implemented in the table below. Replace yes/no/partial with one of the options.
Mention in the comments column of the table where you have implemented the code and where it is visible (e.g., spotlight is the lamp post shining on the street). 

| Implemented    | ID | Name                                                                                                   | Max. Points | Issues/Comments |
|----------------|----|--------------------------------------------------------------------------------------------------------|-------------|-----------------|
| yes            | 1a | Add at least one manually composed object that consists of multiple scene graph nodes.                 | 6           |                 |
| yes            | 1b | Animate separate parts of the composed object and also move the composed object itself in the scene.   | 4           |                 |
| partial        | 1c | Use at least two clearly different materials for the composed object.                                  | 3           |                 |
| yes            | 2a | Create one scene graph node that renders a complex 3D shape. Fully specify properties for this object. | 7           |                 |
| no             | 2b | Apply a texture to your self-created complex object by setting proper texture coordinates.             | 3           |                 |
| yes            | 3a | Use multiple light sources.                                                                            | 5           |                 |
| yes            | 3b | One light source should be moving in the scene.                                                        | 3           |                 |
| yes            | 3c | Implement at least one spot-light.                                                                     | 8           |                 |
| yes            | 3d | Apply Phong shading to all objects in the scene.                                                       | 4           |                 |
| yes            | 4  | The camera is animated 30 seconds without user intervention. Animation quality and complexity of the camera and the objects influence the judgement.                                                                                                                     | 7           |                 |
| partial        | Sx | BILLBOARDING *SPECIAL: PLEASE SEE CONCEPT*                                                             | 10          |                 |
| yes            | Sy | PARTICLE SYSTEM                                                                                        | 20          |                 |
| yes            | SE | Special effects are nicely integrated and well documented                                              | 20          |                 |

### Special Effect Description

UNFORTUANTELY we had last minute troubles with the billboarding. Maybe you can help us with it? The specific fn is 

function createBillboardAnimationX() {
  for (i = 0; i < billboardAnimations.length; i++) {
    // horizontal angle is dot from lastCameraPos and current control pos, normalized
    //let angle = 
    let angleBase = i * 360 / maskNum;

    var normalA = vec3.normalize(vec3.fromValues(0,0,0), mainCameraPos); 
    var normalB = vec3.normalize(vec3.fromValues(0,0,0), camera.control.position);
    let angle = angleBase + vec3.dot(normalA, normalB);
    console.log(angle);

    let animation = billboardAnimations[i];
    let steps = [];

    steps.push({matrix: mat4.rotateY(mat4.create(), mat4.create(), angle), duration: 0});
    console.log('rotating');

    animation.segments = steps;
    animation.currentSegment = steps[0];
  }
}

This is called from the render function after an intiital positioning. We just don't see why, when setting the duration to 0, we don't get good animation from the Y rotate framework functionality.

The idea was to implement this (tied to to key strokes in render), which would be horizontal "billboarding," together with a vertical x-rotate function. The idea was to use animate function to get a kind of lag, for better effect. We show the partial implementation in the video after the 30 s camera flight --> the masks do not follow the camera, unfortunately.

Thanks! J + M

