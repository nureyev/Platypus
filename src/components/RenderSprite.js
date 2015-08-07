/**
# COMPONENT **RenderSprite**
This component is attached to entities that will appear in the game world. It renders a static or animated image. It listens for messages triggered on the entity or changes in the logical state of the entity to play a corresponding animation.

## Dependencies:
- [createjs.EaselJS][link1] - This component requires the EaselJS library to be included for canvas animation functionality.
- [[HandlerRenderCreateJS]] (on entity's parent) - This component listens for a render "handle-render" and "handle-render-load" message to setup and display the content.

## Messages

### Listens for:
- **handle-render-load** - This event is triggered when the entity is added to the render handler before 'handle-render' is called. It adds the sprite to the Stage and sets up the mouse input if necessary.
  - @param message.stage ([createjs.Stage][link2]) - Required. Provides the render component with the CreateJS drawing [Stage][link2].
- **handle-render** - On each `handle-render` message, this component checks to see if there has been a change in the state of the entity. If so, it updates its animation play-back accordingly.
- **logical-state** - This component listens for logical state changes and tests the current state of the entity against the animation map. If a match is found, the matching animation is played. Has some reserved values used for special functionality.
  - @param message (object) - Required. Lists various states of the entity as boolean values. For example: {jumping: false, walking: true}. This component retains its own list of states and updates them as `logical-state` messages are received, allowing multiple logical components to broadcast state messages. Reserved values: 'orientation' and 'hidden'. Orientation is used to set the angle value in the object, the angle value will be interpreted differently based on what the 'rotate', 'mirror', and 'flip' properties are set to. Hidden determines whether the sprite is rendered.
- **pin-me** - If this component has a matching pin location, it will trigger "attach-pin" on the entity with the matching pin location.
  - @param pinId (string) - Required. A string identifying the id of a pin location that the RenderSprite wants to be pinned to.
- **attach-pin** - On receiving this message, the component checks whether it wants to be pinned, and if so, adds itself to the provided container.
  - @param pinId (string) - Pin Id of the received pin location.
  - @param container ([createjs.Container][link3]) - Container that RenderSprite should be added to.
- **remove-pin** - On receiving this message, the component checks whether it is pinned, and if so, removes itself from the container.
  - @param pinId (string) - Pin Id of the pin location to remove itself from.
- **hide-sprite** - Makes the sprite invisible.
- **show-sprite** - Makes the sprite visible.
- **[Messages specified in definition]** - Listens for additional messages and on receiving them, begins playing the corresponding animations.

### Local Broadcasts:
- **mousedown** - This component captures this event from CreateJS and triggers it on the entity.
  - @param event (event object) - The event from Javascript.
  - @param over (boolean) - Whether the mouse is over the object or not.
  - @param x (number) - The x-location of the mouse in stage coordinates.
  - @param y (number) - The y-location of the mouse in stage coordinates.
  - @param entity ([[Entity]]) - The entity clicked on.  
- **mouseup** - This component captures this event from CreateJS and triggers it on the entity.
  - @param event (event object) - The event from Javascript.
  - @param over (boolean) - Whether the mouse is over the object or not.
  - @param x (number) - The x-location of the mouse in stage coordinates.
  - @param y (number) - The y-location of the mouse in stage coordinates.
  - @param entity ([[Entity]]) - The entity clicked on.  
- **mousemove** - This component captures this event from CreateJS and triggers it on the entity.
  - @param event (event object) - The event from Javascript.
  - @param over (boolean) - Whether the mouse is over the object or not.
  - @param x (number) - The x-location of the mouse in stage coordinates.
  - @param y (number) - The y-location of the mouse in stage coordinates.
  - @param entity ([[Entity]]) - The entity clicked on.  
- **pressmove** - This component captures this event from CreateJS and triggers it on the entity.
  - @param event (event object) - The event from Javascript.
  - @param over (boolean) - Whether the mouse is over the object or not.
  - @param x (number) - The x-location of the mouse in stage coordinates.
  - @param y (number) - The y-location of the mouse in stage coordinates.
  - @param entity ([[Entity]]) - The entity clicked on.  
- **pin-me** - If this component should be pinned to another sprite, it will trigger this event in an attempt to initiate the pinning.
  - @param pinId (string) - Required. A string identifying the id of a pin location that this RenderSprite wants to be pinned to.
- **attach-pin** - This component broadcasts this message if it has a list of pins available for other sprites on the entity to attach to.
  - @param pinId (string) - Pin Id of an available pin location.
  - @param container ([createjs.Container][link3]) - Container that the RenderSprite should be added to.
- **remove-pin** - When preparing to remove itself from an entity, RenderSprite broadcasts this to all attached sprites.
  - @param pinId (string) - Pin Id of the pin location to be removed.

## JSON Definition
    {
      "type": "RenderSprite",

      "animationMap":{
      //Optional. This defines a mapping from either triggered messages or one or more states for which to choose a new animation to play. The list is processed from top to bottom, so the most important actions should be listed first (for example, a jumping animation might take precedence over an idle animation). If not specified, an 1-to-1 animation map is created from the list of animations in the sprite sheet definition.
      
          "standing": "default-animation"
          // On receiving a "standing" message, or a "logical-state" where message.standing == true, the "default" animation will begin playing.
          
          "ground,moving": "walking",
          // Comma separated values have a special meaning when evaluating "logical-state" messages. The above example will cause the "walking" animation to play ONLY if the entity's state includes both "moving" and "ground" equal to true.
          
          "ground,striking": "swing!",
          // Putting an exclamation after an animation name causes this animation to complete before going to the next animation. This is useful for animations that would look poorly if interrupted.

          "default": "default-animation",
          // Optional. "default" is a special property that matches all states. If none of the above states are valid for the entity, it will use the default animation listed here.
      }  

      "spriteSheet": {
      //Required for animations but optional for static sprites (where only a single frame is necessary). Defines an EaselJS sprite sheet to use for rendering. See http://www.createjs.com/Docs/EaselJS/SpriteSheet.html for the full specification.

          "images": ["example0", "example1"],
          //Required: An array of ids of the images from the asset list in config.js.
          
          "frames": {
          //Required: The dimensions of the frames on the image and how to offset them around the entity position. The image is automatically cut up into pieces based on the dimensions. 
              "width":  100,
            "height": 100,
            "regY":   100,
            "regX":   50
          },
          
          "animations":{
          //Required: The list of animation ids and the frames that make up that animation. The speed determines how long each frame plays. There are other possible parameters. Additional parameters and formatting info can be found in createJS.
            "default-animation":[2],
            "walking": {"frames": [0, 1, 2], "speed": 4},
            "swing": {"frames": [3, 4, 5], "speed": 4}
          }
      },
      
      // If a sprite sheet definition is not set like shown above, this component will assume that the sprite is a static image and will use the following properties to set the source image and source size information. 
      "image": "example0", //An image id from the asset list in config.js.
      "x": 10,              //These set the source rectangle in the dimensions of the above image source. 
      "y": 10,
      "width":  100,
      "height": 100,
      "regY":   100,        //These specify the sprite offset from the entity's location.
      "regX":   50,
      
      "mask": {
      // Optional. A mask definition that determines where the image should clip. A string can also be used to create more complex shapes via the CreateJS graphics API like: "mask": "r(10,20,40,40).dc(30,10,12)". Defaults to no mask or, if simply set to true, a rectangle using the entity's dimensions.
          "x": 10,
          "y": 10,
          "width": 40,
          "height": 40
      },

      "acceptInput": {
      //Optional - What types of input the object should take. This component defaults to not accept any input.
      
          "hover": false,
          "click": false,
          
          "hitArea": {
          // Optional. A hitArea definition that determines where the image should be clickable. Defines the shape of the hitArea. A string can also be used to create more complex shapes via the CreateJS graphics API like: "hitArea": "r(10,20,40,40).dc(30,10,12)". Defaults to this component's image if not specified or, if simply set to `true`, a rectangle using the entity's dimensions.
              "x": 10,
              "y": 10,
              "width": 40,
              "height": 40
          }
      },
      
      "pins": [{
      //Optional. Specifies whether other sprites can pin themselves to this sprite. This is useful for puppet-like dynamics
      
        "pinId": "head",
        //Required. How this pin location should be referred to by other sprites in order to link up.
        
        "x": 15,
        "y": -30,
        //These two values are required unless "frames" is provided below. Defines where the other sprite's regX and regY should be pinned to this sprite.
        
        "frames": [{"x": 12, "y": -32}, null, {"x": 12}]
        //Alternatively, pin locations can be specified for every frame in the sprite animation by providing an array. If a given index is null or a parameter is undefined, the x/y/z values above are used. If they're not specified, the pinned sprite is hidden.
      }],

      "pinTo": "body",
      //Optional. Pin id of another sprite on this entity to pin this sprite to.
      
      "scaleX": 1,
      //Optional - The X scaling factor for the image. Will default to 1.
      
      "scaleY": 1,
      //Optional - The Y scaling factor for the image. Will default to 1.

      "offsetZ": -1,
      //Optional - How much the z-index of the sprite should be relative to the entity's z-index. Will default to 0.

      "rotate": false,
      //Optional - Whether this object can be rotated. It's rotational angle is set by setting an orientation value on the entity.
      
      "mirror": true,
      //Optional - Whether this object can be mirrored over X. To mirror it over X set the orientation value in the logical state to be great than 90 but less than 270.
      
      "flip": false,
      //Optional - Whether this object can be flipped over Y. To flip it over Y set the orientation value in the logical state to be great than 180.
      
      "hidden": false,
      //Optional - Whether this object is visible or not. To change the hidden value dynamically add a 'hidden' property to the logical state object and set it to true or false.
      
      "eventBased": true,
      // Optional - Specifies whether this component should listen to events matching the animationMap to animate. Set this to false if the component should animate for state changes only. Default is true.
      
      "stateBased": true,
      // Optional - Specifies whether this component should listen to changes in the entity's state that match the animationMap to animate. Set this to false if the component should animate for events only. Default is true.
      
      "cache": false
      //Optional - Whether this sprite should be cached into an entity with a `RenderTiles` component (like "render-layer"). The `RenderTiles` component must have its "entityCache" property set to `true`. Warning! This is a one-direction setting and will remove this component from the entity once the current frame has been cached.
    }
    
[link1]: http://www.createjs.com/Docs/EaselJS/module_EaselJS.html
[link2]: http://createjs.com/Docs/EaselJS/Stage.html
[link3]: http://createjs.com/Docs/EaselJS/Container.html
*/
/*global console, createjs, platypus */
/*jslint plusplus:true */
(function () {
    "use strict";
    
    var dpr = window.devicePixelRatio || 1,
        ssCache = {},
        changeState = function (state) {
            return function (value) {
                //9-23-13 TML - Commenting this line out to allow animation events to take precedence over the currently playing animation even if it's the same animation. This is useful for animations that should restart on key events.
                //                We may eventually want to add more complexity that would allow some animations to be overridden by messages and some not.
                //if (this.currentAnimation !== state) {
                if (this.animationFinished || (this.lastState >= -1)) {
                    this.currentAnimation = state;
                    this.lastState = -1;
                    this.animationFinished = false;
                    this.sprite.gotoAndPlay(state);
                } else {
                    this.waitingAnimation = state;
                    this.waitingState = -1;
                }
                //}
            };
        },
        createTest = function (testStates, animation) {
            var i = 0,
                states = testStates.replace(/ /g, '').split(',');
            
            if (testStates === 'default') {
                return function (state) {
                    return animation;
                };
            } else {
                return function (state) {
                    for (i = 0; i < states.length; i++) {
                        if (!state[states[i]]) {
                            return false;
                        }
                    }
                    return animation;
                };
            }
        },
        processGraphics = (function () {
            var process = function (gfx, value) {
                var paren  = value.indexOf('('),
                    func   = value.substring(0, paren),
                    values = value.substring(paren + 1, value.indexOf(')'));

                if (values.length) {
                    gfx[func].apply(gfx, values.split(','));
                } else {
                    gfx[func]();
                }
            };

            return function (gfx, value) {
                var i = 0,
                    arr = value.split('.');

                for (i = 0; i < arr.length; i++) {
                    process(gfx, arr[i]);
                }
            };
        }());
    
    return platypus.createComponentClass({
        
        id: 'RenderSprite',
        
        publicProperties: {
            x: 0,
            
            y: 0,
            
            z: 0
        },
        
        constructor: (function () {
            var defaultAnimations = {"default": 0},
                createSpriteSheet = function (def, entity) {
                    var i  = 0,
                        arr    = null,
                        image  = null,
                        scaleX = 1,
                        scaleY = 1,
                        scaled = false,
                        srcSS  = def.spritesheet || def.spriteSheet, // To prevent silly bugs.
                        ss     = {
                            framerate:     0,
                            images:     null,
                            frames:     null,
                            animations: null
                        },
                        cache  = {
                            definition: ss,
                            spritesheet: null
                        };

                    // Find SS definition in image data if it has not otherwise been provided.
                    if (!srcSS && (typeof def.image === 'string')) {
                        //check cache and bail if it's available
                        if (ssCache[def.image]) {
                            return ssCache[def.image];
                        } else if (platypus.assets[def.image] && platypus.assets[def.image].data && platypus.assets[def.image].data.spritesheet) {
                            ssCache[def.image] = cache;
                            srcSS = platypus.assets[def.image].data.spritesheet;
                            srcSS.images = [platypus.assets[def.image].asset];
                        }
                    }

                    // Set framerate.
                    if (srcSS && !isNaN(srcSS.framerate)) {
                        ss.framerate = srcSS.framerate;
                    } else if (!isNaN(def.framerate)) {
                        ss.framerate = def.framerate;
                    } else if (!isNaN(entity.framerate)) {
                        ss.framerate = entity.framerate;
                    }

                    // Set source image(s)
                    if (srcSS && Array.isArray(srcSS.images)) {
                        ss.images = srcSS.images.slice();
                    } else if (srcSS && srcSS.image) {
                        ss.images = [srcSS.image];
                    } else if (def.images) {
                        ss.images = def.images.slice();
                    } else if (def.image) {
                        ss.images = [def.image];
                    } else if (entity.images) {
                        ss.images = entity.images.slice();
                    } else if (entity.image) {
                        ss.images = [entity.image];
                    } else {
                        console.warn('"' + entity.type + '" render component: No source image defined.');
                    }

                    // Convert image names into Image resources
                    for (i = 0; i < ss.images.length; i++) {
                        if (typeof ss.images[i] === 'string') {
                            if (platypus.assets[ss.images[i]] && platypus.assets[ss.images[i]].asset) {
                                ss.images[i] = platypus.assets[ss.images[i]].asset;

                                // Check here whether to scale coordinates in the frame setup section.
                                if (!scaled && ((ss.images[i].scaleX && (ss.images[i].scaleX !== 1)) || (ss.images[i].scaleY && (ss.images[i].scaleY !== 1)))) {
                                    scaled = true;
                                }
                            } else {
                                if (platypus.supports.iOS) {
                                    console.warn('"' + entity.type + '" render component: "' + ss.images[i] + '" is not a loaded asset. Make sure the image is not too large for iOS Safari.'); //Convenient check here: http://www.williammalone.com/articles/html5-javascript-ios-maximum-image-size/
                                } else {
                                    console.warn('"' + entity.type + '" render component: "' + ss.images[i] + '" is not a loaded asset.');
                                }
                            }
                        }
                    }

                    // Set frames.
                    if (srcSS && srcSS.frames) {
                        ss.frames = srcSS.frames;
                    } else if (def.frames) {
                        ss.frames = def.frames;
                    } else if (entity.frames) {
                        ss.frames = entity.frames;
                    } else if (def.source) {
                        //TODO: Remove this option at some point once "render-image" notation is no longer in common use. - DDD 5/1/2014
                        ss.frames = [[
                            def.source.x      || def.x      || 0,
                            def.source.y      || def.y      || 0,
                            def.source.width  || def.width  || ss.images[0].width  || entity.width,
                            def.source.height || def.height || ss.images[0].height || entity.height,
                            0,
                            def.regX          || entity.regX         || 0,
                            def.regY          || entity.regY         || 0
                        ]];
                        console.warn('"' + entity.type + '" render component: The original render-image "source" parameter will soon be deprecated in favor of placing source information as individual parameters directly on the render component.');
                    } else {
                        // assume this is a single frame image and define accordingly.
                        image = ss.images[0];
                        if (image) {
                            ss.frames = [[
                                def.x      || 0,
                                def.y      || 0,
                                def.width  || ss.images[0].width  || entity.width,
                                def.height || ss.images[0].height || entity.height,
                                0,
                                def.regX   || entity.regX         || 0,
                                def.regY   || entity.regY         || 0
                            ]];
                        }
                    }

                    // Process frames if the image size has been scaled from the original definition image. (This is sent as data on the image itself, usually due to dynamically reducing the size of source images for smaller devices.)
                    if (scaled) {
                        if (Array.isArray(ss.frames)) { //frames are an array
                            arr = ss.frames;
                            ss.frames = [];
                            for (i = 0; i < arr.length; i++) {
                                scaleX = ss.images[arr[i][4]].scaleX || 1;
                                scaleY = ss.images[arr[i][4]].scaleY || 1;

                                ss.frames.push([
                                    arr[i][0] * scaleX,
                                    arr[i][1] * scaleY,
                                    arr[i][2] * scaleX,
                                    arr[i][3] * scaleY,
                                    arr[i][4],
                                    arr[i][5] * scaleX,
                                    arr[i][6] * scaleY
                                ]);
                            }
                        } else {
                            scaleX = ss.images[0].scaleX || 1;
                            scaleY = ss.images[0].scaleY || 1;
                            ss.frames = {
                                width: ss.frames.width * scaleX,
                                height: ss.frames.height * scaleY,
                                regX: ss.frames.regX * scaleX,
                                regY: ss.frames.regY * scaleY
                            };
                        }
                    }

                    // Set animations.
                    if (srcSS && srcSS.animations) {
                        ss.animations = srcSS.animations;
                    } else if (def.animations) {
                        ss.animations = def.animations;
                    } else if (entity.animations) {
                        ss.animations = entity.animations;
                    } else {
                        // assume this is a single frame image and define accordingly.
                        ss.animations = defaultAnimations;
                    }

                    cache.spritesheet = new createjs.SpriteSheet(cache.definition);

                    return cache;
                },
                createAnimationMap = function (def, ss) {
                    var map  = null,
                        anim = '';

                    if (def.animationMap) {
                        return def.animationMap;
                    } else if (Array.isArray(ss.frames) && (ss.frames.length === 1)) {
                        // This is a single frame animation, so no mapping is necessary
                        return null;
                    } else { // create 1-to-1 animation map since none was defined
                        map = {};
                        for (anim in ss.animations) {
                            if (ss.animations.hasOwnProperty(anim)) {
                                map[anim] = anim;
                            }
                        }
                        return map;
                    }
                },
                setupEventsAndStates = function (component, map) {
                    var anim      = '',
                        animation = '';

                    component.followThroughs = {};
                    component.checkStates = [];

                    for (anim in map) {
                        if (map.hasOwnProperty(anim)) {
                            animation = map[anim];

                            //TODO: Should probably find a cleaner way to accomplish this. Maybe in the animationMap definition? - DDD
                            if (animation[animation.length - 1] === '!') {
                                animation = animation.substring(0, animation.length - 1);
                                component.followThroughs[animation] = true;
                            } else {
                                component.followThroughs[animation] = false;
                            }

                            if (component.eventBased) {
                                component.addEventListener(anim, changeState(animation));
                            }
                            if (component.stateBased) {
                                component.checkStates.push(createTest(anim, animation));
                            }
                        }
                    }
                };
            
            return function (definition) {
                var self = this,
                    ss       = createSpriteSheet(definition, this.owner),
                    map      = createAnimationMap(definition, ss.definition),
                    initialScaleX   = definition.scaleX   || 1,
                    initialScaleY   = definition.scaleY   || 1,
                    initialRotation = definition.rotation || 0,
                    initialSkewX    = definition.skewX    || 0,
                    initialSkewY    = definition.skewY    || 0;
                
                this.sprite     = null;
                
                this.parentContainer      = null;
                this.rotate     = definition.rotate || false;
                this.mirror     = definition.mirror || false;
                this.flip       = definition.flip   || false;
                this.scale      = (definition.scale !== false);
                this.stateBased = map && (definition.stateBased !== false);
                this.eventBased = map && (definition.eventBased !== false);
                this.hover      = false;
                this.click      = false;
                this.touch      = false;

                this.forcePlaythrough = this.owner.forcePlaythrough || definition.forcePlaythrough || false;
                
                if (definition.facing === 'left') {
                    initialScaleX = -initialScaleX;
                }
                this.imageScaleX     = ss.definition.images[0].scaleX || 1;
                this.imageScaleY     = ss.definition.images[0].scaleY || 1;
                
                if (definition.acceptInput) {
                    this.hover = definition.acceptInput.hover || false;
                    this.click = definition.acceptInput.click || false;
                    this.touch = definition.acceptInput.touch || false;
                    
                    this.camera = {
                        x: 0,
                        y: 0
                    };
                    this.addEventListener('camera-update', function (camera) {
                        self.camera.x = camera.viewportLeft;
                        self.camera.y = camera.viewportTop;
                    });
                }
                
                if (this.eventBased || this.stateBased) {
                    setupEventsAndStates(this, map);
                    this.currentAnimation = map['default'] || '';
                }
                
                /*
                 * CreateJS Sprite created here:
                 */
                this.sprite = new createjs.Sprite(ss.spritesheet, this.currentAnimation || 0);
                this.sprite.addEventListener('animationend', function (animationInstance) {
                    self.owner.trigger('animation-ended', animationInstance);
                    if (self.waitingAnimation) {
                        self.currentAnimation = self.waitingAnimation;
                        self.waitingAnimation = false;
                        self.lastState = self.waitingState;
                        
                        self.animationFinished = false;
                        self.sprite.gotoAndPlay(self.currentAnimation);
                    } else {
                        self.animationFinished = true;
                    }
                });
                
                this.affine = new createjs.Matrix2D(1, 0, 0, 1).appendTransform(0, 0, initialScaleX, initialScaleY, initialRotation, initialSkewX, initialSkewY);

                this.owner.scaleX   = this.owner.scaleX || this.owner.scale || 1;
                this.owner.scaleY   = this.owner.scaleY || this.owner.scale || 1;
                this.owner.rotation = this.owner.rotation || 0;
                this.owner.skewX    = this.owner.skewX  || this.owner.skew  || 0;
                this.owner.skewY    = this.owner.skewY  || this.owner.skew  || 0;
                
                // add pins to sprite and setup this.container if needed.
                if (definition.pins) {
                    this.container = new createjs.Container();
                    this.container.transformMatrix = new createjs.Matrix2D(1, 0, 0, 1);
                    this.container.addChild(this.sprite);
                    this.sprite.z = 0;

                    this.addPins(definition.pins, ss.definition.frames);
                    this.sprite.transformMatrix = new createjs.Matrix2D(1, 0, 0, 1).appendTransform(0, 0, 1 / this.imageScaleX, 1 / this.imageScaleY, 0);
                } else {
                    this.container = this.sprite;
                    this.container.transformMatrix = new createjs.Matrix2D(1, 0, 0, 1);
                    this.affine.appendTransform(0, 0, 1 / this.imageScaleX, 1 / this.imageScaleY, 0);
                }
    
                
                /* These next few need this.container set up */
                
                //handle hitArea
                if (definition.acceptInput && definition.acceptInput.hitArea) {
                    if (typeof definition.acceptInput.hitArea === 'string') {
                        this.container.hitArea = this.setHitArea(definition.acceptInput.hitArea);
                    } else {
                        this.container.hitArea = this.setHitArea('r(' + (this.owner.x || 0) + ',' + (this.owner.y || 0) + ',' + (this.owner.width || 0) + ',' + (this.owner.height || 0) + ')');
                    }
                }
                
                //handle mask
                if (definition.mask || this.owner.mask) {
                    this.container.mask = this.setMask(definition.mask || this.owner.mask);
                }
    
                // pin to another RenderSprite
                this.pinTo = definition.pinTo || false;
                if (this.pinTo) {
                    this.owner.triggerEvent('pin-me', this.pinTo);
                }
                
                this.offsetZ = definition.offsetZ || 0;

                this.container.hidden = definition.hidden || false;
                this.ignoreOpacity = definition.ignoreOpacity || false;
                this.state = this.owner.state;
                this.stateChange = false;
                this.lastState = -1;
    
                this.waitingAnimation = false;
                this.waitingState = 0;
                this.playWaiting = false;
                this.animationFinished = false;
    
                //Check state against entity's prior state to update animation if necessary on instantiation.
                this.stateChange = true;
                
                if (definition.cache) {
                    this.updateSprite();
                    this.owner.cacheRender = this.container;
                }
            };
        }()),
        
        events: {
            "handle-render-load": function (resp) {
                if (!this.parentContainer && resp && resp.container) {
                    this.addStage(resp.container);
                }
            },
            
            "handle-render": function (resp) {
                if (!this.parentContainer) {
                    if (!this.pinTo) { //In case this component was added after handler-render is initiated
                        if (!this.addStage(resp.container)) {
                            console.warn('No CreateJS Stage, removing render component from "' + this.owner.type + '".');
                            this.owner.removeComponent(this);
                            return;
                        }
                    } else {
                        return;
                    }
                }
                
                this.updateSprite();
            },
            
            "logical-state": function (state) {
                this.stateChange = true;
            },
            
            "hide-sprite": function () {
                this.container.hidden = true;
            },

            "show-sprite": function () {
                this.container.hidden = false;
            },
            
            "pin-me": function (pinId) {
                if (this.pins && this.pins[pinId]) {
                    this.owner.trigger("attach-pin", this.pins[pinId]);
                }
            },
            
            "attach-pin": function (pinInfo) {
                if (pinInfo.pinId === this.pinTo) {
                    this.parentContainer = pinInfo.container;
                    this.parentContainer.addChild(this.container);
                    this.addInputs();
                    this.pinnedTo = pinInfo;
                }
            },
            
            "remove-pin": function (pinInfo) {
                if (pinInfo.pinId === this.pinTo) {
                    this.parentContainer.removeChild(this.container);
                    this.parentContainer = null;
                    this.pinnedTo = null;
                }
            },
            
            "dispatch-event": function (event) {
                this.sprite.dispatchEvent(event);
            },
            
            "input-on": function () {
                if (!this.removeInputListeners) {
                    this.addInputs();
                }
            },
            
            "input-off": function () {
                if (this.removeInputListeners) {
                    this.removeInputListeners();
                }
            },
            
            "set-mask": function (mask) {
                if (mask) {
                    this.container.mask = this.setMask(mask);
                } else {
                    this.container.mask = null;
                }
            }
        },
        
        methods: {
            addStage: function (stage) {
                if (stage && !this.pinTo) {
                    this.parentContainer = stage;
                    this.parentContainer.addChild(this.container);
//                    if (this.container.mask) this.parentContainer.addChild(this.container.mask);
                    this.addInputs();
                    return stage;
                } else {
                    return null;
                }
            },
            
            updateSprite: (function () {
                var sort = function (a, b) {
                    return a.z - b.z;
                };
                
                return function (resp) {
                    var i = 0,
                        x = 0,
                        y = 0,
                        o = null,
                        rotation = 0,
                        testCase = false,
                        mirrored = 1,
                        flipped  = 1,
                        angle    = null,
                        matrix   = this.container.transformMatrix,
                        m        = matrix.copy(this.affine);
                    
                    if (this.pinnedTo) {
                        if (this.pinnedTo.frames && this.pinnedTo.frames[this.pinnedTo.sprite.currentFrame]) {
                            x = this.pinnedTo.frames[this.pinnedTo.sprite.currentFrame].x;
                            y = this.pinnedTo.frames[this.pinnedTo.sprite.currentFrame].y;
                            if (this.container.z !== this.pinnedTo.frames[this.pinnedTo.sprite.currentFrame].z) {
                                if (this.parentContainer) {
                                    this.parentContainer.reorder = true;
                                }
                                this.container.z = this.pinnedTo.frames[this.pinnedTo.sprite.currentFrame].z;
                            }
                            rotation = this.pinnedTo.frames[this.pinnedTo.sprite.currentFrame].angle || 0;
                            this.container.visible = true;
                        } else if (this.pinnedTo.defaultPin) {
                            x = this.pinnedTo.defaultPin.x;
                            y = this.pinnedTo.defaultPin.y;
                            if (this.container.z !== this.pinnedTo.defaultPin.z) {
                                if (this.parentContainer) {
                                    this.parentContainer.reorder = true;
                                }
                                this.container.z = this.pinnedTo.defaultPin.z;
                            }
                            rotation = this.pinnedTo.defaultPin.angle || 0;
                            this.container.visible = true;
                        } else {
                            this.container.visible = false;
                        }
                    } else {
                        x = this.owner.x;
                        y = this.owner.y;
                        if (this.rotate) {
                            rotation = this.owner.rotation;
                        }
                        if (this.container.z !== (this.owner.z + this.offsetZ)) {
                            if (this.parentContainer) {
                                this.parentContainer.reorder = true;
                            }
                            this.container.z = (this.owner.z + this.offsetZ);
                        }
    
                        if (!this.ignoreOpacity && (this.owner.opacity || (this.owner.opacity === 0))) {
                            this.container.alpha = this.owner.opacity;
                        }
                    }
                    
                    if (this.container.reorder) {
                        this.container.reorder = false;
                        this.container.sortChildren(sort);
                    }
                    
                    if (this.mirror || this.flip) {
                        angle = ((this.owner.orientation * 180) / Math.PI + 360) % 360;
                        
                        if (this.mirror && (angle > 90) && (angle < 270)) {
                            mirrored = -1;
                        }
                        
                        if (this.flip && (angle < 180)) {
                            flipped = -1;
                        }
                    }
                    
                    if (this.stateBased && this.stateChange) {
                        if (this.state.hidden !== undefined) {
                            this.container.hidden = this.state.hidden;
                        }

                        if (this.checkStates) {
                            for (i = 0; i < this.checkStates.length; i++) {
                                testCase = this.checkStates[i](this.state);
                                if (testCase) {
                                    if (this.currentAnimation !== testCase) {
                                        if (!this.followThroughs[this.currentAnimation] && (!this.forcePlaythrough || (this.animationFinished || (this.lastState >= +i)))) {
                                            this.currentAnimation = testCase;
                                            this.lastState = +i;
                                            this.animationFinished = false;
                                            this.sprite.gotoAndPlay(testCase);
                                        } else {
                                            this.waitingAnimation = testCase;
                                            this.waitingState = +i;
                                        }
                                    } else if (this.waitingAnimation && !this.followThroughs[this.currentAnimation]) {// keep animating this animation since this animation has already overlapped the waiting animation.
                                        this.waitingAnimation = false;
                                    }
                                    break;
                                }
                            }
                        }
                        this.stateChange = false;
                    }
                    
                    if (this.owner.orientationMatrix) { // This is a 3x3 2D matrix describing an affine transformation.
                        o = this.owner.orientationMatrix;
                        m.prepend(o[0][0], o[1][0], o[0][1], o[1][1], o[0][2], o[1][2]);
                    }
                    
                    m.prependTransform(x, y, this.owner.scaleX * mirrored, this.owner.scaleY * flipped, 0, this.owner.skewX, this.owner.skewY);
                    
                    // Handle rotation
                    if (rotation) {
                        m.appendTransform(0, 0, 1, 1, rotation);
                    }
                };
            }()),
            
            addInputs: (function () {
                var createHandler = function (self, eventName) {
                    return function (event) {
                        self.owner.trigger(eventName, {
                            event: event.nativeEvent,
                            cjsEvent: event,
                            x: (event.stageX * dpr) / self.parentContainer.scaleX + self.camera.x,
                            y: (event.stageY * dpr) / self.parentContainer.scaleY + self.camera.y,
                            entity: self.owner
                        });
                    };
                };
                
                return function () {
                    var mousedown = null,
                        mouseover = null,
                        mouseout  = null,
                        rollover  = null,
                        rollout   = null,
                        pressmove = null,
                        pressup   = null,
                        click     = null,
                        dblclick  = null;
                    
                    // The following appends necessary information to displayed objects to allow them to receive touches and clicks
                    if (this.click || this.touch) {
                        mousedown = createHandler(this, 'mousedown');
                        pressmove = createHandler(this, 'pressmove');
                        pressup   = createHandler(this, 'pressup');
                        click     = createHandler(this, 'click');
                        dblclick  = createHandler(this, 'dblclick');
                        
                        this.sprite.addEventListener('mousedown', mousedown);
                        this.sprite.addEventListener('pressmove', pressmove);
                        this.sprite.addEventListener('pressup',   pressup);
                        this.sprite.addEventListener('click',     click);
                        this.sprite.addEventListener('dblclick',  dblclick);
                    }
                    if (this.hover) {
//                        this.stage.enableMouseOver();
                        mouseover = createHandler(this, 'mouseover');
                        mouseout  = createHandler(this, 'mouseout');
                        rollover  = createHandler(this, 'rollover');
                        rollout   = createHandler(this, 'rollout');

                        this.sprite.addEventListener('mouseover', mouseover);
                        this.sprite.addEventListener('mouseout',  mouseout);
                        this.container.addEventListener('rollover',  rollover);
                        this.container.addEventListener('rollout',   rollout);
                    }

                    this.removeInputListeners = function () {
                        if (this.click || this.touch) {
                            this.sprite.removeEventListener('mousedown', mousedown);
                            this.sprite.removeEventListener('pressmove', pressmove);
                            this.sprite.removeEventListener('pressup',   pressup);
                            this.sprite.removeEventListener('click',     click);
                            this.sprite.removeEventListener('dblclick',  dblclick);
                        }
                        if (this.hover) {
                            this.sprite.removeEventListener('mouseover', mouseover);
                            this.sprite.removeEventListener('mouseout',  mouseout);
                            this.container.removeEventListener('rollover',  rollover);
                            this.container.removeEventListener('rollout',   rollout);
                        }
                        this.removeInputListeners = null;
                    };
                };
            }()),
            
            addPins: function (pins, frames) {
                var i = 0,
                    j = 0,
                    pin   = null,
                    regX  = frames.regX || 0,
                    regY  = frames.regY || 0,
                    isArray = Array.isArray(frames);
                
                this.pinsToRemove = this.pinsToRemove || [];
                
                this.pins = {};
                
                for (i = 0; i < pins.length; i++) {
                    this.pinsToRemove.push(pins[i].pinId);

                    if (isArray) {
                        regX = (frames[0][5] || 0) / this.imageScaleX;
                        regY = (frames[0][6] || 0) / this.imageScaleY;
                    }
                    
                    this.pins[pins[i].pinId] = pin = {
                        pinId: pins[i].pinId,
                        sprite: this.sprite,
                        container: this.container
                    };
                    if ((typeof pins[i].x === 'number') && (typeof pins[i].y === 'number')) {
                        pin.defaultPin = {
                            x: (pins[i].x - regX),
                            y: (pins[i].y - regY),
                            z: pins[i].z || 0.00000001, //force z to prevent flickering z-order issues.
                            angle: (pins[i].angle || 0)
                        };
                    }
                    
                    if (pins[i].frames) {
                        pin.frames = [];
                        for (j = 0; j < pins[i].frames.length; j++) {
                            if (pins[i].frames[j]) {
                                if (isArray) {
                                    regX = (frames[j][5] || 0) / this.imageScaleX;
                                    regY = (frames[j][6] || 0) / this.imageScaleY;
                                }
                                if ((typeof pins[i].frames[j].x === 'number') && (typeof pins[i].frames[j].y === 'number')) {
                                    pin.frames.push({
                                        x: (pins[i].frames[j].x - regX),
                                        y: (pins[i].frames[j].y - regY),
                                        z: pins[i].frames[j].z || (pin.defaultPin ? pin.defaultPin.z : 0.00000001),
                                        angle: pins[i].frames[j].angle || (pin.defaultPin ? pin.defaultPin.angle : 0)
                                    });
                                } else if (pin.defaultPin) {
                                    if (typeof pins[i].frames[j].x === 'number') {
                                        pin.frames.push({
                                            x: (pins[i].frames[j].x - regX),
                                            y: pin.defaultPin.y,
                                            z: pins[i].frames[j].z || pin.defaultPin.z,
                                            angle: pins[i].frames[j].angle || pin.defaultPin.angle
                                        });
                                    } else if (typeof pins[i].frames[j].y === 'number') {
                                        pin.frames.push({
                                            x: pin.defaultPin.x,
                                            y: (pins[i].frames[j].y - regY),
                                            z: pins[i].frames[j].z || pin.defaultPin.z,
                                            angle: pins[i].frames[j].angle || pin.defaultPin.angle
                                        });
                                    } else {
                                        pin.frames.push(null);
                                    }
                                } else {
                                    pin.frames.push(null);
                                }
                            } else {
                                pin.frames.push(null);
                            }
                        }
                    }
                    this.owner.trigger('attach-pin', pin);
                }
            },

            removePins: function () {
                var i = 0;
                
                if (this.pins && this.pinsToRemove) {
                    for (i = 0; i < this.pinsToRemove.length; i++) {
                        this.owner.trigger('remove-pin', this.pins[this.pinsToRemove[i]].pinId);
                        delete this.pins[this.pinsToRemove[i]];
                    }
                    this.pinsToRemove.length = 0;
                }
            },
            
            setMask: function (shape) {
                var mask = new createjs.Shape(),
                    gfx  = mask.graphics;
                
                mask.x   = 0;
                mask.y   = 0;
                
                if (typeof shape === 'string') {
                    processGraphics(gfx, shape);
                } else {
                    if (shape.radius) {
                        gfx.dc(shape.x || 0, shape.y || 0, shape.radius);
                    } else {
                        gfx.r(shape.x || 0, shape.y || 0, shape.width || this.owner.width || 0, shape.height || this.owner.height || 0);
                    }
                }

                return mask;
            },
            
            setHitArea: (function () {
                var savedHitAreas = {}; //So generated hitAreas are reused across identical entities.
                
                return function (shape) {
                    var ha  = null,
                        gfx = null,
                        sav = '';
                    
                    if (typeof shape === 'string') {
                        sav = shape;
                    } else {
                        sav = JSON.stringify(shape);
                    }
                    
                    ha = savedHitAreas[sav];

                    if (!ha) {
                        ha   = new createjs.Shape();
                        gfx  = ha.graphics;
                        ha.x = 0;
                        ha.y = 0;

                        gfx.beginFill("#000"); // Force the fill.

                        if (typeof shape === 'string') {
                            processGraphics(gfx, shape);
                        } else if (shape.radius) {
                            gfx.dc(shape.x || 0, shape.y || 0, shape.radius);
                        } else {
                            gfx.r(shape.x || 0, shape.y || 0, shape.width || this.owner.width || 0, shape.height || this.owner.height || 0);
                        }
                        
                        savedHitAreas[sav] = ha;
                    }
                    
                    return ha;
                };
            }()),
            
            destroy: function () {
                if (this.removeInputListeners) {
                    this.removeInputListeners();
                }
                if (this.parentContainer) {
                    this.parentContainer.removeChild(this.container);
                    this.parentContainer = null;
                }
                this.removePins();
                this.followThroughs = null;
                this.sprite = null;
                this.container = null;
            }
        }
    });
}());
