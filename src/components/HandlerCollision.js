/**
 * This component checks for collisions between entities which typically have either a [CollisionTiles](platypus.components.CollisionTiles.html) component for tile maps or a [CollisionBasic](platypus.components.CollisionBasic.html) component for other entities. It uses `EntityContainer` component messages if triggered to add to its collision list and also listens for explicit add/remove messages (useful in the absence of an `EntityContainer` component).
 *
 * @namespace platypus.components
 * @class HandlerCollision
 * @uses platypus.Component
 */
/* global include, platypus */
(function () {
    'use strict';
    
    //set here to make them reusable objects
    
    /**
     * When an entity collides with an entity of a listed collision-type, this message is triggered on the entity. * is the other entity's collision-type.
     *
     * @event 'hit-by-*'
     * @param collision {Object}
     * @param collision.entity {Entity} The entity with which the collision occurred.
     * @param collision.type {String} The collision type of the other entity.
     * @param collision.shape {CollisionShape} This is the shape of the other entity that caused the collision.
     * @param collision.x {number} Returns -1, 0, or 1 indicating on which side of this entity the collision occurred: left, neither, or right respectively.
     * @param collision.y {number} Returns -1, 0, or 1 indicating on which side of this entity the collision occurred: top, neither, or bottom respectively.
     */
    var AABB = include('platypus.AABB'),
        CollisionData = include('platypus.CollisionData'),
        CollisionDataContainer = include('platypus.CollisionDataContainer'),
        Data = include('platypus.Data'),
        DataMap = include('platypus.DataMap'),
        Vector = include('platypus.Vector'),
        triggerMessage = {
            entity: null,
            type: null,
            x: 0,
            y: 0,
            hitType: null,
            myType: null
        },
        groupSortBySize = function (a, b) {
            return a.collisionGroup.getAllEntities() - b.collisionGroup.getAllEntities();
        };
    
    return platypus.createComponentClass({
        id: 'HandlerCollision',
        
        properties: {
            /**
             *
             */
            gridBits: 8
        },
        
        initialize: function () {
            this.againstGrid = Data.setUp();
            
            this.solidEntitiesLive = Array.setUp();
            this.softEntitiesLive = Array.setUp();
            this.allEntitiesLive = Array.setUp();
            this.groupsLive = Array.setUp();
            this.nonColliders = Array.setUp();
            
            this.terrain = null;
            this.owner.previousX = this.owner.previousX || this.owner.x;
            this.owner.previousY = this.owner.previousY || this.owner.y;
            
            this.relocationMessage = Data.setUp(
                "position", Vector.setUp(),
                "relative", false
            );
        },
        
        events: {
            /**
             * On receiving this message, the component checks the entity to determine whether it listens for collision messages. If so, the entity is added to the collision group.
             *
             * @method 'child-entity-added'
             * @param entity {Entity} The entity to be added.
             */
            "child-entity-added": function (entity) {
                if (!entity.collideOff) {
                    this.addCollisionEntity(entity);
                }
            },
            
            /**
             * On receiving this message, the component checks the entity to determine whether it listens for collision messages. If so, the entity is added to the collision group.
             *
             * @method 'add-collision-entity'
             * @param entity {Entity} The entity to be added.
             */
            "add-collision-entity": function (entity) {
                this.addCollisionEntity(entity);
            },
            
            /**
             * On receiving this message, the component looks for the entity in its collision group and removes it.
             *
             * @method 'child-entity-removed'
             * @param message {platypus.Entity} The entity to be removed.
             */
            "child-entity-removed": function (entity) {
                this.removeCollisionEntity(entity);
            },
            
            /**
             * On receiving this message, the component looks for the entity in its collision group and removes it.
             *
             * @method 'remove-collision-entity'
             * @param message {platypus.Entity} The entity to be removed.
             */
            "remove-collision-entity": function (entity) {
                this.removeCollisionEntity(entity);
            },
            
            /**
             * On receiving this message, the component looks for the entity in its collision group and updates it.
             *
             * @method 'child-entity-updated'
             * @param message {platypus.Entity} The entity to be updated.
             */
            "child-entity-updated": function (entity) {
                this.removeCollisionEntity(entity);
                this.addCollisionEntity(entity);
            },
            
            /**
             * This message causes the component to go through the entities and check for collisions.
             *
             * @method 'check-collision-group'
             * @param options {Object}
             * @param [options.camera] {Object} Specifies a region in which to check for collisions. Expects the camera object to contain the following properties: top, left, width, height, and buffer.
             */
            "check-collision-group": function (resp) {
                this.checkCamera(resp.camera, resp.entities);
                this.checkGroupCollisions();
                this.checkSolidCollisions();
                this.resolveNonCollisions();
                this.checkSoftCollisions(resp);
            }
        },
        
        methods: {
            mapDown: function (aabb2) {
                var aabb1 = AABB.setUp(),
                    gb = this.gridBits;
                
                return aabb1.setBounds(aabb2.left >> gb, aabb2.top >> gb, aabb2.right >> gb, aabb2.bottom >> gb);
            },
            
            getAgainstGrid: function (entity, sweep, types) {
                var aabb = this.mapDown(sweep),
                    arr = null,
                    data = Data.setUp(),
                    i = 0,
                    list = null,
                    thisAgainstGrid = this.againstGrid,
                    tList = null,
                    type = '',
                    x = 0,
                    y = 0;
                
                if (sweep.equals(entity.againstAABB)) {
                    return this.getEntityAgainstGrid(entity, types);
                }

                for (x = aabb.left; x <= aabb.right; x++) {
                    for (y = aabb.top; y <= aabb.bottom; y++) {
                        list = thisAgainstGrid[((y << 16) ^ x) >>> 0];
                        if (list) {
                            i = types.length;
                            while (i--) {
                                type = types[i];
                                arr = list.get(type);
                                if (arr && arr.length) {
                                    tList = data[type];
                                    if (!tList) {
                                        data[type] = Array.setUp.apply(null, arr);
                                    } else {
                                        tList.union(arr);
                                    }
                                }
                            }
                        }
                    }
                }
                
                aabb.recycle();
                return data;
            },
            
            getEntityAgainstGrid: function (entity, types) {
                var ag = entity.againstGrid,
                    arr = null,
                    data = Data.setUp(),
                    i = ag.length,
                    j = 0,
                    list = null,
                    tList = null,
                    type = '';

                while (i--) {
                    list = ag[i];
                    j = types.length;
                    while (j--) {
                        type = types[j];
                        arr = list.get(type);
                        if (arr && arr.length) {
                            tList = data[type];
                            if (!tList) {
                                data[type] = Array.setUp.apply(null, arr);
                            } else {
                                tList.union(arr);
                            }
                        }
                    }
                }
                
                return data;
            },
            
            removeAgainst: function (entity) {
                var ag = entity.againstGrid,
                    types = entity.collisionTypes,
                    arr = null,
                    i = ag.length,
                    j = 0,
                    id = 0,
                    len = types.length,
                    list = null;
                    
                while (i--) {
                    list = ag[i];
                    j = len;
                    while (j--) {
                        arr = list.get(types[j]);
                        if (arr) {
                            id = arr.indexOf(entity);
                            if (id >= 0) {
                                arr.greenSplice(id);
                            }
                        }
                    }
                }
                ag.length = 0;
            },
            
            updateAgainst: function (entity) {
                var arr = null,
                    i = 0,
                    type = '',
                    types = entity.collisionTypes,
                    aabb = this.mapDown(entity.getAABB()),
                    ag = entity.againstGrid,
                    id = 0,
                    list = null,
                    thisAgainstGrid = this.againstGrid,
                    x = 0,
                    y = 0;
                
                if (!aabb.equals(entity.againstAABB)) {
                    entity.againstAABB.set(aabb);
                    this.removeAgainst(entity);

                    for (x = aabb.left; x <= aabb.right; x++) {
                        for (y = aabb.top; y <= aabb.bottom; y++) {
                            id = ((y << 16) ^ x) >>> 0;
                            list = thisAgainstGrid[id];
                            if (!list) {
                                list = thisAgainstGrid[id] = DataMap.setUp();
                            }
                            i = types.length;
                            while (i--) {
                                type = types[i];
                                arr = list.get(type);
                                if (!arr) {
                                    arr = list.set(type, Array.setUp());
                                }
                                arr.push(entity);
                            }
                            ag.push(list);
                        }
                    }
                }
                
                aabb.recycle();
            },
            
            addCollisionEntity: function (entity) {
                if (entity.getTileShapes) { // Has a CollisionTiles component
                    this.terrain = entity;
                } else if (entity.collisionTypes) {
                    entity.againstGrid = Array.setUp();
                    entity.againstAABB = AABB.setUp();
                    this.updateAgainst(entity);
                }
            },

            removeCollisionEntity: function (entity) {
                if (entity.againstGrid) {
                    this.removeAgainst(entity);
                    entity.againstGrid.recycle();
                    entity.againstGrid = null;
                    entity.againstAABB.recycle();
                    entity.againstAABB = null;
                }
            },
            
            checkCamera: function (camera, all) {
                var i        = all.length,
                    j        = 0,
                    allLive  = this.allEntitiesLive,
                    softs    = this.softEntitiesLive,
                    solids   = this.solidEntitiesLive,
                    nons     = this.nonColliders,
                    groups   = this.groupsLive,
                    entity        = null,
                    types = null,
                    collides = false;
                
                allLive.length = 0;
                solids.length = 0;
                softs.length = 0;
                nons.length = 0;
                groups.length = 0;

                while (i--) {
                    collides = false;
                    entity = all[i];
                    types = entity.collisionTypes;
                    if (!entity.immobile && types && types.length) {
                        allLive.push(entity);

                        if (entity !== this.owner) {
                            j = types.length;
                            while (j--) {
                                if (entity.solidCollisionMap.get(types[j]).length) {
                                    solids.push(entity);
                                    collides = true;
                                    break;
                                }
                            }
                        }
                        j = types.length;
                        while (j--) {
                            if (entity.softCollisionMap.get(types[j]).length) {
                                softs.push(entity);
                                break;
                            }
                        }

                        if (!collides) {
                            nons.push(entity);
                        }

                        if (entity.collisionGroup) {
                            groups.push(entity);
                        }
                    }
                }
                
                groups.sort(groupSortBySize);
            },
            
            resolveNonCollisions: function () {
                var entity = null,
                    msg    = this.relocationMessage,
                    nons   = this.nonColliders,
                    i      = nons.length;
                
                msg.relative = false;
                while (i--) {
                    entity = nons[i];
                    if ((entity.position.x !== entity.previousPosition.x) || (entity.position.y !== entity.previousPosition.y)) {
                        msg.position.setVector(entity.position);

                        /**
                         * This message is triggered on an entity that has been repositioned due to a solid collision.
                         *
                         * @event 'relocate-entity'
                         * @param object {Object}
                         * @param object.position {Vector} The relocated position of the entity.
                         */
                        entity.triggerEvent('relocate-entity', msg);
                        this.updateAgainst(entity);
                    }
                }
            },
            
            checkGroupCollisions: (function () {
                var triggerCollisionMessages = function (entity, otherEntity, thisType, thatType, x, y, hitType, vector) {
                    var msg = triggerMessage;
                    
                    msg.entity    = otherEntity;
                    msg.myType    = thisType;
                    msg.type      = thatType;
                    msg.x         = x;
                    msg.y         = y;
                    msg.direction = vector;
                    msg.hitType   = hitType;
                    entity.triggerEvent('hit-by-' + thatType, msg);
                    
                    if (otherEntity) {
                        msg.entity    = entity;
                        msg.type      = thisType;
                        msg.myType    = thatType;
                        msg.x         = -x;
                        msg.y         = -y;
                        msg.direction = vector.getInverse();
                        msg.hitType   = hitType;
                        otherEntity.triggerEvent('hit-by-' + thisType, msg);
                        
                        msg.direction.recycle();
                    }
                };

                return function () {
                    var i           = 0,
                        entities    = this.groupsLive,
                        x           = entities.length,
                        entity      = null,
                        list        = null,
                        messageData = null,
                        entityCDC   = null;
                    
                    while (x--) {
                        entity = entities[x];
                        if (entity.collisionGroup.getSize() > 1) {
                            entityCDC = this.checkSolidEntityCollision(entity, entity.collisionGroup);
                            
                            list = entityCDC.xData;
                            i = list.length;
                            while (i--) {
                                messageData = list[i];
                                triggerCollisionMessages(messageData.thisShape.owner, messageData.thatShape.owner, messageData.thisShape.collisionType, messageData.thatShape.collisionType, messageData.direction, 0, 'solid', messageData.vector);
                            }
                            
                            list = entityCDC.yData;
                            i = list.length;
                            while (i--) {
                                messageData = list[i];
                                triggerCollisionMessages(messageData.thisShape.owner, messageData.thatShape.owner, messageData.thisShape.collisionType, messageData.thatShape.collisionType, 0, messageData.direction, 'solid', messageData.vector);
                            }
                            
                            entityCDC.recycle();
                        }
                    }
                };
            }()),
            
            checkSolidCollisions: (function () {
                var triggerCollisionMessages = function (entity, otherEntity, thisType, thatType, x, y, hitType, vector) {
                    var msg = triggerMessage;
                    
                    msg.entity    = otherEntity;
                    msg.myType    = thisType;
                    msg.type      = thatType;
                    msg.x         = x;
                    msg.y         = y;
                    msg.direction = vector;
                    msg.hitType   = hitType;
                    entity.triggerEvent('hit-by-' + thatType, msg);
                    
                    if (otherEntity) {
                        msg.entity    = entity;
                        msg.type      = thisType;
                        msg.myType    = thatType;
                        msg.x         = -x;
                        msg.y         = -y;
                        msg.direction = vector.getInverse();
                        msg.hitType   = hitType;
                        otherEntity.triggerEvent('hit-by-' + thisType, msg);
                        
                        msg.direction.recycle();
                    }
                };

                return function () {
                    var i           = 0,
                        entities    = this.solidEntitiesLive,
                        x           = entities.length,
                        entity      = null,
                        list        = null,
                        messageData = null,
                        entityCDC   = null,
                        trigger = triggerCollisionMessages;
                    
                    while (x--) {
                        entity = entities[x];
                        entityCDC = this.checkSolidEntityCollision(entity, entity);
                        
                        list = entityCDC.xData;
                        i = list.length;
                        while (i--) {
                            messageData = list[i];
                            trigger(messageData.thisShape.owner, messageData.thatShape.owner, messageData.thisShape.collisionType, messageData.thatShape.collisionType, messageData.direction, 0, 'solid', messageData.vector);
                        }
                        
                        list = entityCDC.yData;
                        i = list.length;
                        while (i--) {
                            messageData = list[i];
                            trigger(messageData.thisShape.owner, messageData.thatShape.owner, messageData.thisShape.collisionType, messageData.thatShape.collisionType, 0, messageData.direction, 'solid', messageData.vector);
                        }
                        
                        entityCDC.recycle();
                    }
                };
            }()),
            
            checkSolidEntityCollision: function (ent, entityOrGroup) {
                var collisionDataCollection = CollisionDataContainer.setUp(),
                    step              = 0,
                    finalMovementInfo = null,
                    aabb              = null,
                    pX                = ent.previousX,
                    pY                = ent.previousY,
                    dX                = ent.x - pX,
                    dY                = ent.y - pY,
                    sW                = Infinity,
                    sH                = Infinity,
                    collisionTypes    = entityOrGroup.getCollisionTypes(),
                    i                 = 0,
                    ignoredEntities   = false,
                    min               = null;
                
                if (entityOrGroup.getSolidEntities) {
                    ignoredEntities = entityOrGroup.getSolidEntities();
                }
                
                finalMovementInfo = Vector.setUp(ent.position);

                if (dX || dY) {
                    
                    if (ent.bullet) {
                        min = Math.min;
                        
                        i = collisionTypes.length;
                        while (i--) {
                            aabb = entityOrGroup.getAABB(collisionTypes[i]);
                            sW = min(sW, aabb.width);
                            sH = min(sH, aabb.height);
                        }

                        //Stepping to catch really fast entities - this is not perfect, but should prevent the majority of fallthrough cases.
                        step = Math.ceil(Math.max(Math.abs(dX) / sW, Math.abs(dY) / sH));
                        step = min(step, 100); //Prevent memory overflow if things move exponentially far.
                        dX   = dX / step;
                        dY   = dY / step;

                        while (step--) {
                            entityOrGroup.prepareCollision(ent.previousX + dX, ent.previousY + dY);

                            finalMovementInfo = this.processCollisionStep(ent, entityOrGroup, ignoredEntities, collisionDataCollection, finalMovementInfo.setVector(ent.position), dX, dY, collisionTypes);
                            
                            if ((finalMovementInfo.x === ent.previousX) && (finalMovementInfo.y === ent.previousY)) {
                                entityOrGroup.relocateEntity(finalMovementInfo, collisionDataCollection);
                                //No more movement so we bail!
                                break;
                            } else {
                                entityOrGroup.relocateEntity(finalMovementInfo, collisionDataCollection);
                            }
                        }
                    } else {
                        entityOrGroup.prepareCollision(ent.previousX + dX, ent.previousY + dY);
                        finalMovementInfo = this.processCollisionStep(ent, entityOrGroup, ignoredEntities, collisionDataCollection, finalMovementInfo, dX, dY, collisionTypes);
                        entityOrGroup.relocateEntity(finalMovementInfo, collisionDataCollection);
                    }

                    if ((finalMovementInfo.x !== pX) || (finalMovementInfo.y !== pY)) {
                        this.updateAgainst(ent);
                    }
                }
                
                finalMovementInfo.recycle();
                
                return collisionDataCollection;
            },
            
            processCollisionStep: (function () {
                var sweeper       = AABB.setUp(),
                    includeEntity = function (thisEntity, aabb, otherEntity, otherAABB, ignoredEntities, sweepAABB) {
                        var i = 0;
                        
                        //Chop out all the special case entities we don't want to check against.
                        if (otherEntity === thisEntity) {
                            return false;
                        } else if (otherEntity.jumpThrough && (aabb.bottom > otherAABB.top)) {
                            return false;
                        } else if (thisEntity.jumpThrough  && (otherAABB.bottom > aabb.top)) { // This will allow platforms to hit something solid sideways if it runs into them from the side even though originally they were above the top. - DDD
                            return false;
                        } else if (ignoredEntities) {
                            i = ignoredEntities.length;
                            while (i--) {
                                if (otherEntity === ignoredEntities[i]) {
                                    return false;
                                }
                            }
                        }
                        
                        return sweepAABB.collides(otherAABB);
                    };

                return function (ent, entityOrGroup, ignoredEntities, collisionDataCollection, finalMovementInfo, entityDeltaX, entityDeltaY, collisionTypes) {
                    var i = collisionTypes.length,
                        j = 0,
                        k = 0,
                        l = 0,
                        isIncluded = includeEntity,
                        potentialCollision       = false,
                        potentialCollidingShapes = Array.setUp(),
                        pcsGroup                 = null,
                        previousAABB             = null,
                        currentAABB              = null,
                        collisionType            = null,
                        otherEntity              = null,
                        otherCollisionType       = '',
                        otherAABB                = null,
                        otherShapes              = null,
                        otherEntities            = null,
                        terrain                  = this.terrain,
                        againstGrid          = null,
                        solidCollisionMap        = entityOrGroup.getSolidCollisions(),
                        collisionSubTypes        = null,
                        sweepAABB                = sweeper;
                    
//                    if (!entityOrGroup.jumpThrough || (entityDeltaY >= 0)) { //TODO: Need to extend jumpthrough to handle different directions and forward motion - DDD
    
                    while (i--) {
                        //Sweep the full movement of each collision type
                        potentialCollidingShapes[i] = pcsGroup = Array.setUp();
                        collisionType = collisionTypes[i];
                        previousAABB = entityOrGroup.getPreviousAABB(collisionType);
                        currentAABB = entityOrGroup.getAABB(collisionType);

                        sweepAABB.set(currentAABB);
                        sweepAABB.include(previousAABB);
                        
                        collisionSubTypes = solidCollisionMap.get(collisionType);
                        againstGrid = this.getAgainstGrid(ent, sweepAABB, collisionSubTypes);
                        j = collisionSubTypes.length;
                        while (j--) {
                            otherCollisionType = collisionSubTypes[j];
                            otherEntities = againstGrid[otherCollisionType];

                            if (otherEntities) {
                                k = otherEntities.length;
                                while (k--) {
                                    otherEntity = otherEntities[k];
                                    otherAABB = otherEntity.getAABB(otherCollisionType);

                                    //Do our sweep check against the AABB of the other object and add potentially colliding shapes to our list.
                                    if (isIncluded(ent, previousAABB, otherEntity, otherAABB, ignoredEntities, sweepAABB)) {
                                        otherShapes = otherEntity.getShapes(otherCollisionType);
                                        
                                        l = otherShapes.length;
                                        while (l--) {
                                            //Push the shapes on the end!
                                            pcsGroup.push(otherShapes[l]);
                                        }
                                        potentialCollision = true;
                                    }
                                }
                                otherEntities.recycle();
                            } else if (terrain) {
                                //Do our sweep check against the tiles and add potentially colliding shapes to our list.
                                otherShapes = terrain.getTileShapes(sweepAABB, previousAABB, otherCollisionType);
                                k = otherShapes.length;
                                while (k--) {
                                    //Push the shapes on the end!
                                    pcsGroup.push(otherShapes[k]);
                                    potentialCollision = true;
                                }
                            }
                        }
                        againstGrid.recycle();
                    }

                    if (potentialCollision) {
                        finalMovementInfo = this.resolveCollisionPosition(ent, entityOrGroup, finalMovementInfo, potentialCollidingShapes, collisionDataCollection, collisionTypes, entityDeltaX, entityDeltaY);
                    }
                    
                    // Array recycling
                    potentialCollidingShapes.recycle(2);
                    
                    return finalMovementInfo;
                };
            }()),
            
            resolveCollisionPosition: function (ent, entityOrGroup, finalMovementInfo, potentialCollidingShapes, collisionDataCollection, collisionTypes, entityDeltaX, entityDeltaY) {
                var j = 0,
                    cd = null;
                
                if (entityDeltaX !== 0) {
                    j = collisionTypes.length;
                    while (j--) {
                        //Move each collision type in X to find the min X movement
                        cd = this.findMinAxisMovement(ent, entityOrGroup, collisionTypes[j], 'x', potentialCollidingShapes[j]);
                        
                        if (!cd.occurred || !collisionDataCollection.tryToAddX(cd)) {
                            cd.recycle();
                        }
                    }
                }
                
                cd = collisionDataCollection.xData[0];
                if (cd) {
                    finalMovementInfo.x = ent.previousX + cd.deltaMovement * cd.direction;
                } else {
                    finalMovementInfo.x = ent.x;
                }
                
                // This moves the previous position of everything so that the check in Y can begin.
                entityOrGroup.movePreviousX(finalMovementInfo.x);
                
                if (entityDeltaY !== 0) {
                    j = collisionTypes.length;
                    while (j--) {
                        //Move each collision type in Y to find the min Y movement
                        cd = this.findMinAxisMovement(ent, entityOrGroup, collisionTypes[j], 'y', potentialCollidingShapes[j]);
                        
                        if (!cd.occurred || !collisionDataCollection.tryToAddY(cd)) {
                            cd.recycle();
                        }
                    }
                }
                
                cd = collisionDataCollection.yData[0];
                if (cd) {
                    finalMovementInfo.y = ent.previousY + cd.deltaMovement * cd.direction;
                } else {
                    finalMovementInfo.y = ent.y;
                }
                
                return finalMovementInfo;
            },
            
            findMinAxisMovement: function (ent, entityOrGroup, collisionType, axis, potentialCollidingShapes) {
                //Loop through my shapes of this type vs the colliding shapes and do precise collision returning the shortest movement in axis direction
                var bestCD     = CollisionData.setUp(),
                    shapes     = entityOrGroup.getShapes(collisionType),
                    prevShapes = entityOrGroup.getPrevShapes(collisionType),
                    cd         = null,
                    i          = shapes.length;
                
                while (i--) {
                    cd = this.findMinShapeMovementCollision(prevShapes[i], shapes[i], axis, potentialCollidingShapes);
                    
                    if (cd.occurred && (!bestCD.occurred //if a collision occurred and we haven't already had a collision.
                        || (cd.deltaMovement < bestCD.deltaMovement))) { //if a collision occurred and the diff is smaller than our best diff.
                        bestCD.recycle();
                        bestCD = cd;
                    } else {
                        cd.recycle();
                    }
                }
                
                return bestCD;
            },
            
            /**
             * Find the earliest point at which this shape collides with one of the potential colliding shapes along this axis.
             * For example, cycles through shapes a, b, and c to find the earliest position:
             *
             *    O---->   [b]  [a]     [c]
             *
             *    Returns collision location for:
             *
             *            O[b]
             *
             */
            findMinShapeMovementCollision: (function () {
                var returnInfo = {
                        position: 0,
                        contactVector: Vector.setUp()
                    },
                    getMovementDistance = function (currentDistance, minimumDistance) {
                        var pow = Math.pow;
                        
                        return Math.sqrt(pow(minimumDistance, 2) - pow(currentDistance, 2));
                    },
                    getCorner = function (circlePos, rectanglePos, half) {
                        var diff = circlePos - rectanglePos;
                        
                        return diff - (diff / Math.abs(diff)) * half;
                    },
                    getOffsetForCircleVsAABBX = function (circle, rect, moving, direction, v) {
                        var newAxisPosition = 0,
                            aabb = rect.aABB,
                            hw = aabb.halfWidth,
                            x = circle.x,
                            y = circle.y;

                        if (y >= aabb.top && y <= aabb.bottom) {
                            return hw + circle.radius;
                        } else {
                            y = getCorner(y, rect.y, aabb.halfHeight); // reusing y.
                            newAxisPosition = hw + getMovementDistance(y, circle.radius);
                            if (moving === circle) {
                                v.x = -getCorner(x - direction * newAxisPosition, rect.x, hw) / 2;
                                y = -y;
                            } else {
                                v.x = getCorner(x, rect.x - direction * newAxisPosition, hw) / 2;
                            }
                            v.y = y;
                            v.normalize();
                            return newAxisPosition;
                        }
                    },
                    getOffsetForCircleVsAABBY = function (circle, rect, moving, direction, v) {
                        var newAxisPosition = 0,
                            aabb = rect.aABB,
                            hh = aabb.halfHeight,
                            x = circle.x,
                            y = circle.y;

                        if (x >= aabb.left && x <= aabb.right) {
                            return hh + circle.radius;
                        } else {
                            x = getCorner(x, rect.x, aabb.halfWidth); // reusing x.
                            newAxisPosition = hh + getMovementDistance(x, circle.radius);
                            if (moving === circle) {
                                x = -x;
                                v.y = -getCorner(y - direction * newAxisPosition, rect.y, hh) / 2;
                            } else {
                                v.y = getCorner(y, rect.y - direction * newAxisPosition, hh) / 2;
                            }
                            v.x = x;
                            v.normalize();
                            return newAxisPosition;
                        }
                    },
                    findAxisCollisionPosition = { // Decision tree for quicker access, optimized for mobile devices.
                        x: {
                            rectangle: {
                                rectangle: function (direction, thisShape, thatShape) {
                                    var ri = returnInfo;

                                    ri.position = thatShape.x - direction * (thatShape.aABB.halfWidth + thisShape.aABB.halfWidth);
                                    ri.contactVector.setXYZ(direction, 0);

                                    return ri;
                                },
                                circle: function (direction, thisShape, thatShape) {
                                    var ri = returnInfo;

                                    ri.position = thatShape.x - direction * getOffsetForCircleVsAABBX(thatShape, thisShape, thisShape, direction, ri.contactVector.setXYZ(direction, 0));

                                    return ri;
                                }
                            },
                            circle: {
                                rectangle: function (direction, thisShape, thatShape) {
                                    var ri = returnInfo;

                                    ri.position = thatShape.x - direction * getOffsetForCircleVsAABBX(thisShape, thatShape, thisShape, direction, ri.contactVector.setXYZ(direction, 0));

                                    return ri;
                                },
                                circle: function (direction, thisShape, thatShape) {
                                    var y = thatShape.y - thisShape.y,
                                        position = thatShape.x - direction * getMovementDistance(y, thisShape.radius + thatShape.radius),
                                        ri = returnInfo;
                                        
                                    ri.contactVector.setXYZ(thatShape.x - position, y).normalize();
                                    ri.position = position;

                                    return ri;
                                }
                            }
                        },
                        y: {
                            rectangle: {
                                rectangle: function (direction, thisShape, thatShape) {
                                    var ri = returnInfo;

                                    ri.position = thatShape.y - direction * (thatShape.aABB.halfHeight + thisShape.aABB.halfHeight);
                                    ri.contactVector.setXYZ(0, direction);
                                    
                                    return ri;
                                },
                                circle: function (direction, thisShape, thatShape) {
                                    var ri = returnInfo;

                                    ri.position = thatShape.y - direction * getOffsetForCircleVsAABBY(thatShape, thisShape, thisShape, direction, ri.contactVector.setXYZ(0, direction));

                                    return ri;
                                }
                            },
                            circle: {
                                rectangle: function (direction, thisShape, thatShape) {
                                    var ri = returnInfo;

                                    ri.position = thatShape.y - direction * getOffsetForCircleVsAABBY(thisShape, thatShape, thisShape, direction, ri.contactVector.setXYZ(0, direction));

                                    return ri;
                                },
                                circle: function (direction, thisShape, thatShape) {
                                    var x = thatShape.x - thisShape.x,
                                        position = thatShape.y - direction * getMovementDistance(x, thisShape.radius + thatShape.radius),
                                        ri = returnInfo;
                                        
                                    ri.contactVector.setXYZ(x, thatShape.y - position).normalize();
                                    ri.position = position;

                                    return ri;
                                }
                            }
                        }
                    };
                
                return function (prevShape, currentShape, axis, potentialCollidingShapes) {
                    var i = 0,
                        initialPoint    = prevShape[axis],
                        goalPoint       = currentShape[axis],
                        translatedShape = prevShape,
                        direction       = ((initialPoint < goalPoint) ? 1 : -1),
                        position        = goalPoint,
                        pcShape         = null,
                        cd              = CollisionData.setUp(),
                        collisionInfo   = null,
                        finalPosition   = goalPoint,
                        findACP         = null;
                    
                    if (initialPoint !== goalPoint) {
                        findACP = findAxisCollisionPosition[axis][translatedShape.type];
                        
                        if (axis === 'x') {
                            translatedShape.moveX(goalPoint);
                        } else if (axis === 'y') {
                            translatedShape.moveY(goalPoint);
                        }
                        
                        i = potentialCollidingShapes.length;
                        while (i--) {
                            pcShape = potentialCollidingShapes[i];
                            position = goalPoint;
                            if (translatedShape.collides(pcShape)) {
                                collisionInfo = findACP[pcShape.type](direction, translatedShape, pcShape);
                                position = collisionInfo.position;
                                if (direction > 0) {
                                    if (position < finalPosition) {
                                        if (position < initialPoint) { // Reality check: I think this is necessary due to floating point inaccuracies. - DDD
                                            position = initialPoint;
                                        }
                                        finalPosition = position;
                                        cd.set(true, direction, finalPosition, Math.abs(finalPosition - initialPoint), pcShape.aABB, currentShape, pcShape, collisionInfo.contactVector, 0);
                                    }
                                } else if (position > finalPosition) {
                                    if (position > initialPoint) { // Reality check: I think this is necessary due to floating point inaccuracies. - DDD
                                        position = initialPoint;
                                    }
                                    finalPosition = position;
                                    cd.set(true, direction, finalPosition, Math.abs(finalPosition - initialPoint), pcShape.aABB, currentShape, pcShape, collisionInfo.contactVector, 0);
                                }
                            }
                        }
                    }
                    
                    return cd;
                };
            }()),
            
            checkSoftCollisions: (function () {
                var
                    trigger = function (collision) {
                        this.triggerEvent('hit-by-' + collision.type, collision);
                    };
                
                return function () {
                    var softs = this.softEntitiesLive,
                        entity = null,
                        i = softs.length,
                        t = trigger;
                        
                    while (i--) {
                        entity = softs[i];
                        this.checkEntityForSoftCollisions(entity, t.bind(entity));
                    }
                };
            }()),
            
            checkEntityForSoftCollisions: function (ent, callback) {
                var againstGrid = null,
                    otherEntity = null,
                    message = triggerMessage,
                    i   = ent.collisionTypes.length,
                    j   = 0,
                    k   = 0,
                    l   = 0,
                    m   = 0,
                    collisionType = null,
                    softCollisionMap = null,
                    otherEntities  = null,
                    otherCollisionType = null,
                    shapes = null,
                    otherShapes = null,
                    collisionFound = false;

                message.x = 0;
                message.y = 0;

                while (i--) {
                    collisionType = ent.collisionTypes[i];
                    softCollisionMap = ent.softCollisionMap.get(collisionType);
                    againstGrid = this.getEntityAgainstGrid(ent, softCollisionMap);
                    j = softCollisionMap.length;
                    while (j--) {
                        otherCollisionType = softCollisionMap[j];
                        otherEntities = againstGrid[otherCollisionType];
                        if (otherEntities) {
                            k = otherEntities.length;
                            while (k--) {
                                otherEntity = otherEntities[k];
                                if ((otherEntity !== ent) && (ent.getAABB(collisionType).collides(otherEntity.getAABB(otherCollisionType)))) {
                                    collisionFound = false;
                                    shapes = ent.getShapes(collisionType);
                                    otherShapes = otherEntity.getShapes(otherCollisionType);
                                    l = shapes.length;
                                    while (l--) {
                                        m = otherShapes.length;
                                        while (m--) {
                                            if (shapes[l].collides(otherShapes[m])) {
                                                //TML - We're only reporting the first shape we hit even though there may be multiple that we could be hitting.
                                                message.entity  = otherEntity;
                                                message.type    = otherCollisionType;
                                                message.myType  = collisionType;
                                                message.shape   = otherShapes[m];
                                                message.hitType = 'soft';
                                                
                                                callback(message);
                                                
                                                collisionFound = true;
                                                break;
                                            }
                                        }
                                        if (collisionFound) {
                                            break;
                                        }
                                    }
                                }
                            }
                            otherEntities.recycle();
                        }
                    }
                    againstGrid.recycle();
                }
            },
            
            destroy: function () {
                var ag = this.againstGrid,
                    data = null,
                    key = '',
                    keys = null,
                    i = 0;
                
                this.groupsLive.recycle();
                this.nonColliders.recycle();
                this.allEntitiesLive.recycle();
                this.softEntitiesLive.recycle();
                this.solidEntitiesLive.recycle();
                this.relocationMessage.position.recycle();
                this.relocationMessage.recycle();
                
                for (key in ag) {
                    if (ag.hasOwnProperty(key)) {
                        data = ag[key];
                        keys = data.keys;
                        i = keys.length;
                        while (i--) {
                            data.get(keys[i]).recycle();
                        }
                        data.recycle();
                    }
                }
                ag.recycle();
                this.againstGrid = null;
            }
        },
        
        publicMethods: {
            /**
             * This method returns an object containing world entities.
             *
             * @method getWorldEntities
             * @return {Array} A list of all world collision entities.
             */
            getWorldEntities: function () {
                return this.allEntitiesLive;
            },
            
            /**
             * This method returns an entity representing the collision map of the world.
             *
             * @method getWorldTerrain
             * @return {Entity} - An entity describing the collision map of the world. This entity typically includes a `CollisionTiles` component.
             */
            getWorldTerrain: function () {
                return this.terrain;
            },
            
            /**
             * This method returns a list of collision objects describing soft collisions between an entity and a list of other entities.
             *
             * @method getEntityCollisions
             * @param entity {Entity} The entity to test against the world.
             * @return collisions {Array} This is a list of collision objects describing the soft collisions.
             */
            getEntityCollisions: function (entity) {
                var collisions = Array.setUp();
                
                this.checkEntityForSoftCollisions(entity, function (collision) {
                    collisions.push(Data.setUp(collision));
                });
                
                return collisions;
            }
        }
    });
}());
