function cesiumFunctions() {
    "use strict";
    /*jshint validthis:true */
    /*global Cesium, console, instanceManager */

    console.log("created");
    //Holds objects containing source data. {path, datasource};
    var sourcesLoaded = [];
    //Holds overlays loaded. {path, source}. Source can be either a layer or a datasource,
    var overlaysLoaded = [];

    this.setOptions = function(viewer) {
        viewer.scene.primitives.destroyPrimitives = false;
    };

    //Deletes all data related to the viewer, including primitives,
    //entities, overlays, drawn objects, and loaded imagery layers.
    this.clear = function(viewer) {
        viewer.scene.primitives.removeAll();
        viewer.dataSources.removeAll();
        viewer.entities.removeAll();
        //for(var layersIndex = 1; layersIndex < viewer.imageryLayers.length; layersIndex++) {
        //    viewer.imageryLayers.remove(layersIndex);
        //}
    };

    //Changes the scene mode(2D, 3D, Columbus) to the next increment. Does nothing
    //if the scene is currently morphing.
    this.changeSceneMode = function(viewer) {
        var scene = viewer.scene;
        switch (scene.mode) {
        case 0:
            console.log("Currently morphing, return");
            break;
        case 1:
            scene.morphTo2D();
            break;
        case 2:
            scene.morphTo3D();
            break;
        case 3:
            scene.morphToColumbusView();
            break;
        default:
            scene.morphTo3D();
        }
    };

    //Permits the user to draw a rectangle with mouse input, then zooms in so that
    //the rectangle is the camera's view.
    this.zoomOnRectangle = function(viewer) {
        drawRectangle(viewer, false, function(rectangle) {
            viewer.camera.viewRectangle(rectangle);
        });
    };

    //Modifies the direction of the camera to facing the center of the globe, and zooms
    //out so that the entire globe is visible.
    this.zoomFit = function(viewer) {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        viewer.trackedEntity = undefined;
        viewer.selectedEntity = undefined;
        viewer.camera.direction = Cesium.Cartesian3.negate(viewer.camera.position, new Cesium.Cartesian3());
        var lastPosition = viewer.camera.position.clone();
        var cartographicPos = viewer.scene.globe.ellipsoid.cartesianToCartographic(lastPosition, new Cesium.Cartographic());
        cartographicPos.height = 20500000;
        viewer.camera.position = viewer.scene.globe.ellipsoid.cartographicToCartesian(cartographicPos, new Cesium.Cartesian3());
    };

    //Clones and returns the essential camera properties, including direction, position,
    //and the camera view Matrix4.
    this.saveCameraPos = function(viewer) {
        var properties = {
            position : viewer.camera.position.clone(),
            direction : viewer.camera.direction.clone(),
            frameOfReference : viewer.camera.transform.clone()
        };
        return properties;
    };

    //uses a hiearchy argument to draw a polygon. The easiest way to obtain a hiearchy is
    //to use the drawPolyline function, discard the outline, and use the callback to pass
    //the collection of points.
    var drawPolygon = this.drawPolygon = function(viewer, hiearchy, callback) {
        viewer.entities.add({
            polygon : {
                hierarchy : hiearchy,
                material : Cesium.Color.RED.withAlpha(0.5)
            }
        });
    };

    //draws a multi segment polyline. The callback function returns a hiearchy that is used
    //to draw polygons.
    var drawPolyline = this.drawPolyline = function(viewer, keepPolyline, callback) {
        var hierarchy = new Cesium.PolygonHierarchy();
        var points = [];
        var pointNumber = 0;
        var mousePos;
        var eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        var lineString = viewer.entities.add({
            polyline : {
                positions : new Cesium.CallbackProperty(function() {
                    return points;
                }, false)
            }
        });

        eventHandler.setInputAction(function(movement) {
            var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
            if (cartesian) {
                points[pointNumber] = cartesian;
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        eventHandler.setInputAction(function(movement) {
            mousePos = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
            if (mousePos) {
                pointNumber++;
                points[pointNumber - 1] = mousePos;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        eventHandler.setInputAction(function() {
            console.log("Finished");
            eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
            eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
            eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
            hierarchy.positions = points;
            if (!keepPolyline) {
                viewer.entities.remove(lineString);
            }
            if (Cesium.defined(callback)) {
                callback(hierarchy);
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    };

    var addPlacemark = this.addPlacemark = function(viewer, keepPlacemark, callback) {
        var i;
        var eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        eventHandler.setInputAction(function(movement) {
            var mousePos = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
            if (mousePos) {
                var pin = new Cesium.PinBuilder();
                viewer.entities.add({
                    position : mousePos,
                    billboard : {
                        image : pin.fromColor(Cesium.Color.fromRandom().withAlpha(0.5), 48).toDataURL(),
                        verticalOrigin : Cesium.VerticalOrigin.BOTTOM
                    }
                });
                eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    };

    //creates an array of entities representing a grid of the lat/long lines. labels are also generated
    //at significant points. If the grid exists, remove it.
    var displayCoords = this.displayCoords = function(viewer, callback) {

        var gridExists = false;
        for (var i = 0; i < viewer.entities.values.length; i++) {
            if (viewer.entities.values[i].name === "grid") {
                gridExists = true;
                i = viewer.entities.values.length;
            }
        }

        if (!gridExists) {
            var entityCollection = viewer.entities;
            var latLines = [];
            var longLines = [];
            var latitudeIndex;
            var longitudeIndex;
            var toDraw;
            var index = 0;

            //Generates points along the ellipsoid in the form of var[latIndex[points]]
            for (latitudeIndex = -90; latitudeIndex <= 90; latitudeIndex += 10) {
                latLines[index] = [];
                for (longitudeIndex = -180; longitudeIndex <= 180; longitudeIndex += 10) {
                    latLines[index].push(new Cesium.Cartographic(Cesium.Math.toRadians(longitudeIndex), Cesium.Math.toRadians(latitudeIndex), 10));
                }
                index++;
            }
            index = 0;
            for (longitudeIndex = -180; longitudeIndex <= 180; longitudeIndex += 10) {
                longLines[index] = [];
                for (latitudeIndex = -90; latitudeIndex <= 90; latitudeIndex += 10) {
                    longLines[index].push(new Cesium.Cartographic(Cesium.Math.toRadians(longitudeIndex), Cesium.Math.toRadians(latitudeIndex), 10));
                }
                index++;
            }
            //console.log(latLines);
            for (var latDrawIndex = 0; latDrawIndex < latLines.length; latDrawIndex++) {
                toDraw = viewer.scene.globe.ellipsoid.cartographicArrayToCartesianArray(latLines[latDrawIndex]);
                entityCollection.add({
                    name : "grid",
                    polyline : {
                        positions : toDraw
                    }
                });
            }
            for (var longDrawIndex = 0; longDrawIndex < longLines.length; longDrawIndex++) {
                toDraw = viewer.scene.globe.ellipsoid.cartographicArrayToCartesianArray(longLines[longDrawIndex]);
                entityCollection.add({
                    name : "grid",
                    polyline : {
                        positions : toDraw
                    }
                });
            }
            //create labels for each line, latitude/longitude
            for (var latLabelsIndex = -90; latLabelsIndex <= 90; latLabelsIndex += 10) {
                entityCollection.add({
                    name : "grid",
                    label : {
                        text : "" + latLabelsIndex,
                        scale : 0.5,
                        eyeOffset : new Cesium.Cartesian3(200000, 200000, 0)
                    },
                    position : new Cesium.Cartesian3.fromDegrees(0, latLabelsIndex)
                });
            }
            for (var longLabelsIndex = -180; longLabelsIndex <= 180; longLabelsIndex += 10) {
                entityCollection.add({
                    name : "grid",
                    label : {
                        text : "" + longLabelsIndex,
                        scale : 0.5,
                        eyeOffset : new Cesium.Cartesian3(200000, 200000, 0)
                    },
                    position : new Cesium.Cartesian3.fromDegrees(longLabelsIndex, 0)
                });
            }
        } else {
            var entities = viewer.entities.values;
            for (var entitiesIndex = entities.length - 1; entitiesIndex >= 0; entitiesIndex--) {
                if (entities[entitiesIndex].name === "grid") {
                    viewer.entities.remove(entities[entitiesIndex]);
                }
            }
        }

    };

    //Uses mouse input to draw a circle on the globe. Uses an ellipsoid with the major and
    //minor axis being equal, constantly updating with mouse movement after the first click.
    //Functions the same as drawRectangle/drawPolygon.
    var drawCircle = this.drawCircle = function(viewer, keepCircle, callback) {
        var center;
        var radius;
        var radiusProperty = new Cesium.CallbackProperty(function() {
            return radius;
        }, false);
        var pointNumber = 0;
        var eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        var ellipse;
        var firstPass = true;

        eventHandler.setInputAction(function(movement) {
            var mousePos = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
            if (pointNumber === 0) {
                center = mousePos;//viewer.scene.globe.ellipsoid.cartesianToCartographic(mousePos, new Cesium.Cartographic());
            } else if (pointNumber >= 1) {
                eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
                eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                if (!keepCircle) {
                    viewer.entities.remove(ellipse);
                }
                if (Cesium.defined(callback)) {
                    callback(new Cesium.EllipseGeometry({
                        center : center,
                        semiMajorAxis : radius,
                        semiMinorAxis : radius
                    }));
                }
            }
            pointNumber++;
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        eventHandler.setInputAction(function(movement) {
            var mousePos = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
            if (mousePos && pointNumber > 0) {
                //do math
                radius = Cesium.Cartesian3.distance(center, mousePos);
                if (firstPass) {
                    viewer.entities.add({
                        position : center,
                        ellipse : {
                            semiMajorAxis : radiusProperty,
                            semiMinorAxis : radiusProperty,
                            material : Cesium.Color.DARKGRAY.withAlpha(0.5)
                        }
                    });
                    firstPass = false;
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    };

    //Uses mouse input to draw a rectangle on the globe. Continuously draws the rectangle
    //after the initial click, and either saves or deletes it upon completion depending on
    //the value of keepRectangle.
    var drawRectangle = this.drawRectangle = function(viewer, keepRectangle, callback) {
        var cartographicPoints = [];
        var pointNumber = 0;
        var mousePos;
        var eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        var rectangle;
        var firstPass = true;

        eventHandler.setInputAction(function(movement) {
            var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
            if (cartesian && pointNumber > 0) {
                cartographicPoints[3] = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian, new Cesium.Cartographic());
                cartographicPoints[2] = new Cesium.Cartographic(cartographicPoints[3].longitude, cartographicPoints[0].latitude);
                cartographicPoints[1] = new Cesium.Cartographic(cartographicPoints[0].longitude, cartographicPoints[3].latitude);
                if (firstPass === true) {
                    rectangle = viewer.entities.add({
                        rectangle : {
                            coordinates : new Cesium.CallbackProperty(function() {
                                return Cesium.Rectangle.fromCartographicArray(cartographicPoints);
                            }, false),
                            material : Cesium.Color.DARKGRAY.withAlpha(0.5)
                        }
                    });
                    firstPass = false;
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        eventHandler.setInputAction(function(movement) {
            mousePos = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
            if (mousePos) {
                if (pointNumber === 0) {
                    cartographicPoints[0] = viewer.scene.globe.ellipsoid.cartesianToCartographic(mousePos);
                } else if (pointNumber >= 1) {
                    eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                    eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
                    if (!keepRectangle) {
                        viewer.entities.remove(rectangle);
                    }
                    if (Cesium.defined(callback)) {
                        callback(Cesium.Rectangle.fromCartographicArray(cartographicPoints, new Cesium.Rectangle()));
                    }
                }
                pointNumber++;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    };

    //This uses the nadir track of the sat Id to generate an animation of the relevant satellite.
    //The nadir track is used because it always contains the necessary points, when ground swaths
    //and actuals can have coverage gaps causing the satellite to fly through the earth.
    this.generateAnimation = function(viewer, satId, value) {
        if (value) {
            Cesium.KmlDataSource.load("Resources/kml/" + satId + "_nadir.kmz").then(function(dataSource) {
                var model = "Resources/3d/" + satId + ".gltf";

                var positionCollection = new Cesium.SampledPositionProperty();
                positionCollection.setInterpolationOptions({
                    interpolationDegree : 10,
                    interpolationAlgorithm : Cesium.HermitePolynomialApproximation
                });
                var groundPositionCollection = new Cesium.SampledPositionProperty();
                var drawType = "polyline";

                var timeStart = dateToString(dataSource.entities.values[0]);
                var timeEnd = dateToString(dataSource.entities.values[dataSource.entities.values.length - 1]);

                timeStart = Cesium.JulianDate.fromIso8601(timeStart);
                timeEnd = Cesium.JulianDate.fromIso8601(timeEnd);

                viewer.clock.startTime = timeStart.clone();
                viewer.clock.stopTime = timeEnd.clone();
                viewer.clock.currentTime = timeStart.clone();
                viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
                viewer.clock.multiplier = 10;

                var height = 2500000 + (2 * 1000000);
                var pos;
                for (var i = 0; i < dataSource.entities.values.length; i++) {
                    if (drawType === 'polygon') {
                        pos = dataSource.entities.values[i][drawType].hierarchy.getValue(viewer.clock.currentTime).positions;
                    } else {
                        pos = dataSource.entities.values[i][drawType].positions.getValue(viewer.clock.currentTime);
                    }

                    var positionsArray = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(pos);
                    var boundingRectangle = Cesium.Rectangle.fromCartographicArray(positionsArray);
                    var center = Cesium.Rectangle.center(boundingRectangle);
                    var groundPos = center.clone();
                    center.height = height;
                    var time = dateToString(dataSource.entities.values[i]);
                    if ((center.latitude < 85) && (center.latitude > -85)) {
                        positionCollection.addSample(time, Cesium.Ellipsoid.WGS84.cartographicToCartesian(center));
                        groundPositionCollection.addSample(time, Cesium.Ellipsoid.WGS84.cartographicToCartesian(groundPos));
                    }
                }

                viewer.entities.add({
                    id : satId,
                    availability : new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
                        start : timeStart,
                        stop : timeEnd
                    })]),
                    position : positionCollection,
                    model : {
                        uri : model,
                        minimumPixelSize : 32,
                        scale : 2
                    },
                    orientation : new Cesium.VelocityOrientationProperty(positionCollection),
                    path : {
                        resolution : 120,
                        material : new Cesium.PolylineGlowMaterialProperty({
                            glowPower : 0.1,
                            color : dataSource.entities.values[0][drawType].material.color._value
                        }),
                        width : 5,
                        leadTime : 0,
                        trailTime : 0
                    }
                });
                console.log("Done");
            });
        } else {
            viewer.entities.remove(viewer.entities.getById(satId));
        }
    };

    //Loads and unloads sources at a given file path based on the value argument. When loading,
    //The filepath and loaded source are saved in sourcesLoaded[] for easy removal when needed.
    this.manageSources = function(viewer, filePath, value) {
        console.log(filePath);
        if (value) {
            viewer.dataSources.add(Cesium.KmlDataSource.load(filePath)).then(function(dataSource) {
                sourcesLoaded.push({
                    path : filePath,
                    dataSource : dataSource
                });
                //console.log("done");
            });
        } else {
            console.log("removing");
            for (var sourcesIndex = 0; sourcesIndex < sourcesLoaded.length; sourcesIndex++) {
                if (sourcesLoaded[sourcesIndex].path === filePath) {
                    //console.log("found, removing");
                    //console.log(sourcesLoaded[sourcesIndex].dataSource);
                    viewer.dataSources.remove(sourcesLoaded[sourcesIndex].dataSource, true);
                    sourcesLoaded.splice(sourcesIndex, 1);
                }
            }
        }
    };

    //Loads and unloads sources at a given file path based on the value argument. Checks for a .kml
    //and .kmz format, and falls back on using a tilemap service if the .kml extension is not found.
    //Supports the use of a screen overlay for use with legends etc. Will place the screen overlay
    //on the bottom left hand corner of the screen.
    this.manageOverlay = function(viewer, filePath, value) {
        if(value) {
            if(filePath.indexOf(".kml") > -1 || filePath.indexOf(".kmz") > -1) {
                viewer.dataSources.add(Cesium.KmlDataSource.load(filePath)).then(function(dataSource) {
                    overlaysLoaded.push({
                        path : filePath,
                        source : dataSource
                    });
                });
            } else {
                var toAdd = new Cesium.TileMapServiceImageryProvider({
                    url : filePath,
                    maximumLevel : 3
                });
                var testOverlay = viewer.scene.imageryLayers.addImageryProvider(toAdd);
                overlaysLoaded.push({
                    path : filePath,
                    source : testOverlay
                });
            }

        } else {
            for(var overlaysIndex = 0; overlaysIndex < overlaysLoaded.length; overlaysIndex++) {
                if(filePath === overlaysLoaded[overlaysIndex].path) {
                    //remove, return;
                    if(filePath.indexOf(".kml") > -1 || filePath.indexOf(".kmz") > -1) {
                        viewer.dataSources.remove(overlaysLoaded[overlaysIndex].source);
                    } else {
                        viewer.scene.imageryLayers.remove(overlaysLoaded[overlaysIndex].source);
                    }
                    overlaysLoaded.splice(overlaysIndex, 1);
                }
            }
        }
    };

    //Editing existing objects on the globe, limited to simpel shapes such as rectangles, circles, lines
    //etc. Current idea is to do extrusion and moving points/editing position, colors and things like TBD.
    //Color editing can be done in the infobox of an entity when clicked on.
    this.selectionTool = function(viewer) {
        var pickedEntity;
        //cartesian coordinates array holding significant entity points.
        var points = [];
        var pointsEntities = [];
        var entityType;
        //pick an entity, first.
        //on mouse click.
        var eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        eventHandler.setInputAction(function(windowPosition) {
            //console.log(windowPosition.position);
            pickedEntity = viewer.scene.pick(windowPosition.position);
            if(Cesium.defined(pickedEntity)) {
                //console.log(pickedEntity.id);
                pickedEntity = pickedEntity.id;
                entityType = detectDrawType(pickedEntity);
                console.log(entityType);
                eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
                highlightPoints();
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);



        //highlight relevant points: one point in the middle of the object,
        //one on each vertex. in the case of a circle/ellipse, one in the center
        //one on the radius.
        function highlightPoints() {
            //console.log(pickedEntity);
            //only a single point.
            if(Cesium.defined(pickedEntity.position)){
                points.push(pickedEntity.position.getValue(viewer.clock.currentTime));
                if(entityType === "ellipse") {
                    points.push();
                }
            } else {
                //Multiple points. e.g. positions property.
                //polygons and rectangles are handled seperately.
                //polygon hierarchy, rectangle coordinates(rectangle)
                if(entityType === "polygon") {
                    var hierarchy = pickedEntity.polygon.hierarchy.getValue(viewer.clock.currentTime).positions;
                    for(var hierarchyIndex = 0; hierarchyIndex < hierarchy.length; hierarchyIndex++) {
                        points.push(hierarchy[hierarchyIndex]);
                    }
                    hierarchy = viewer.scene.globe.ellipsoid.cartesianArrayToCartographicArray(hierarchy);
                    var polygonCenter = Cesium.Rectangle.center(Cesium.Rectangle.fromCartographicArray(hierarchy));
                    points.push(viewer.scene.globe.ellipsoid.cartographicToCartesian(polygonCenter));
                } else if (entityType === "rectangle") {
                    var rectangle = pickedEntity.rectangle.coordinates.getValue(viewer.clock.currentTime);
                    points.push(viewer.scene.globe.ellipsoid.cartographicToCartesian(Cesium.Rectangle.northeast(rectangle)));
                    points.push(viewer.scene.globe.ellipsoid.cartographicToCartesian(Cesium.Rectangle.northwest(rectangle)));
                    points.push(viewer.scene.globe.ellipsoid.cartographicToCartesian(Cesium.Rectangle.southeast(rectangle)));
                    points.push(viewer.scene.globe.ellipsoid.cartographicToCartesian(Cesium.Rectangle.southwest(rectangle)));
                    points.push(viewer.scene.globe.ellipsoid.cartographicToCartesian(Cesium.Rectangle.center(rectangle)));
                } else {
                    var entityPoints = pickedEntity[entityType].positions.getValue(viewer.clock.currentTime);
                    for(var pointsIndex = 0; pointsIndex < entityPoints.length; pointsIndex++) {
                        points.push(entityPoints[pointsIndex]);
                    }
                }
            }
            //console.log(points);
            for(var pointsArrayIndex = 0; pointsArrayIndex < points.length; pointsArrayIndex++) {
                pointsEntities.push(viewer.entities.add({
                        name : "SelectionPoints",
                        point : {
                            pixelSize : 10
                        },
                        position : points[pointsArrayIndex]
                    })
                );
            }
            editProperties();

        }

        //edit properties
        function editProperties() {

            //right click ends selection.
            eventHandler.setInputAction(function() {
                for(var entitiesIndex = 0; entitiesIndex < pointsEntities.length; entitiesIndex++) {
                    console.log(viewer.entities.remove(pointsEntities[entitiesIndex]));
                }
                eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
            }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

            //left down starts the move, left up ends the move.
            eventHandler.setInputAction(function(mousePos) {
                var picked = viewer.scene.pick(mousePos.position);
                if(Cesium.defined(picked) && pointsEntities.indexOf(picked.id) > -1) {
                    viewer.scene.screenSpaceCameraController.enableRotate = false;
                    viewer.scene.screenSpaceCameraController.enableTranslate = false;
                    viewer.scene.screenSpaceCameraController.enableZoom = false;
                    viewer.scene.screenSpaceCameraController.enableTilt = false;
                    viewer.scene.screenSpaceCameraController.enableLook = false;
                    var pointNumber = pointsEntities.indexOf(picked.id);
                    eventHandler.setInputAction(function(movement) {
                        var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
                        //Handle movement.
                        //Use a callback property to modify the shape in real time. May need multiple cases
                        //for different graphics types.
                        switch(entityType) {
                        case "polygon":
                            break;
                        case "rectangle":
                            break;
                        case "polyline":
                            break;
                        case "ellipse":
                            //moving the center point.
                            //if(picked.id.position === pickedEntity.position) {
                                console.log("Center");
                                picked.id.position = cartesian;
                                pickedEntity.position = cartesian;
                            //} else {
                                //moving the radius.
                                //ellipsoid geodesic : interpolate using surface distance.
                                //the major/minor axis give distance, with the midpoint being the start.
                                //use a cartographic that is far away from the center, eg. just add
                                //50 or so degrees.
                            //}
                            break;
                        case "billboard":
                            picked.id.position = cartesian;
                            pickedEntity.position = cartesian;
                            break;
                        }

                    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                    eventHandler.setInputAction(function() {
                        viewer.scene.screenSpaceCameraController.enableRotate = true;
                        viewer.scene.screenSpaceCameraController.enableTranslate = true;
                        viewer.scene.screenSpaceCameraController.enableZoom = true;
                        viewer.scene.screenSpaceCameraController.enableTilt = true;
                        viewer.scene.screenSpaceCameraController.enableLook = true;
                        eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                        eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
                    }, Cesium.ScreenSpaceEventType.LEFT_UP);
                }
            }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        }

        //end on right click.

    };

    //Used to convert an entity's date data into a string for use with Cesium.JulianDate. Gets the
    //string formatted date/time from an entity's description and returns the properly formatted
    //string. This should be re done to be more general, as of now it requires an entity with
    //table formatted description information.
    function dateToString(entity) {
        var toParse = entity.description._value;
        var parser = document.createElement("html");
        parser.innerHTML = toParse;
        var elements = (parser.getElementsByTagName("td"));
        var timeString;
        for (var elementIndex = 0; elementIndex < elements.length; elementIndex++) {
            if (elements[elementIndex].textContent.indexOf("Time:") > -1) {
                timeString = elements[elementIndex + 1].textContent;
            }
        }
        //console.log(timeString);
        var months = {
            JAN : "01",
            FEB : "02",
            MAR : "03",
            APR : "04",
            MAY : "05",
            JUN : "06",
            JUL : "07",
            AUG : "08",
            SEP : "09",
            OCT : "10",
            NOV : "11",
            DEC : "12"
        };
        var year = timeString.slice(0, 4);
        var month;
        var day;
        var time;
        if (isNaN(timeString.slice(5, 7))) {
            month = months[timeString.slice(5, 8)];
            day = timeString.slice(9, 11);
            time = timeString.slice(12, 20);
        } else {
            month = timeString.slice(5, 7);
            day = timeString.slice(8, 10);
            time = timeString.slice(11, 19);
        }
        //console.log(year + " " + month + " " + day + " " + time);
        var date = year + "-" + month + "-" + day + "T" + time + "Z";
        //console.log(date);
        return date;
    }

    //Detects the property being used by an entity. Goes through the list of available graphics properties
    //and returns a string value of the one that is both undefined and relevant to display, leavin gout
    //things such as description etc.
    function detectDrawType(entity) {
        var entityTypes = ["billboard", "box", "corridor", "cylinder", "ellipse", "ellipsoid", "label",
                           "model", "point", "polygon", "polyline", "polylineVolume", "rectangle", "wall"];
        for(var entityTypesIndex = 0; entityTypesIndex < entityTypes.length; entityTypesIndex++) {
            if(Cesium.defined(entity[entityTypes[entityTypesIndex]])) {
                return entityTypes[entityTypesIndex];
            }
        }
    }

}