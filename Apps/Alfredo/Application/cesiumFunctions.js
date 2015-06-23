function cesiumFunctions() {
    "use strict";
    /*jshint validthis:true */
    /*global Cesium, console, instanceManager */

    console.log("created");

    //Deletes all data related to the viewer, including primitives,
    //entities, overlays, drawn objects, and loaded imagery layers.
    this.clear = function(viewer) {
        viewer.scene.primitives.removeAll();
        viewer.dataSources.removeAll(true);
        viewer.entities.removeAll();
        for(var layersIndex = 1; layersIndex < viewer.imageryLayers.length; layersIndex++) {
            viewer.imageryLayers.remove(layersIndex);
        }
    };

    //Changes the scene mode(2D, 3D, Columbus) to the next increment. Does nothing
    //if the scene is currently morphing.
    this.changeSceneMode = function(viewer) {
        var scene = viewer.scene;
        switch(scene.mode) {
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

        eventHandler.setInputAction(function (movement) {
            var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
            if (cartesian) {
                points[pointNumber] = cartesian;
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        eventHandler.setInputAction(function (movement) {
            mousePos = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
            if (mousePos) {
                pointNumber++;
                points[pointNumber - 1] = mousePos;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        eventHandler.setInputAction(function () {
            console.log("Finished");
            eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
            eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
            eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
            hierarchy.positions = points;
            if(!keepPolyline) {
                viewer.entities.remove(lineString);
            }
            if(Cesium.defined(callback)) {
                callback(hierarchy);
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    };

    var addPlacemark = this.addPlacemark = function(viewer, keepPlacemark, callback) {
        var eventHandler = new Cesium.ScreenSpaceEventHandler();
        eventHandler.setInputAction(function(movement) {
            var mousePos = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
            if(mousePos) {
                var pin = new Cesium.PinBuilder();
                viewer.entities.add({
                    name: "Pin",
                    position : mousePos,
                    billboard : {
                        image: pin.fromColor(Cesium.Color.DARKGRAY.withAlpha(0.5), 48).toDataURL(),
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
        for(var i = 0; i < viewer.entities.values.length; i++) {
            if(viewer.entities.values[i].name === "grid") {
                gridExists = true;
                i = viewer.entities.values.length;
            }
        }

        if(!gridExists) {
            var entityCollection = viewer.entities;
            var latLines = [];
            var longLines = [];
            var latitudeIndex;
            var longitudeIndex;
            var toDraw;
            var index = 0;

            //Generates points along the ellipsoid in the form of var[latIndex[points]]
            for(latitudeIndex = -90; latitudeIndex <= 90; latitudeIndex+=10) {
                latLines[index] = [];
                for(longitudeIndex = -180; longitudeIndex <= 180; longitudeIndex+=10) {
                    latLines[index].push(new Cesium.Cartographic(Cesium.Math.toRadians(longitudeIndex), Cesium.Math.toRadians(latitudeIndex), 10));
                }
                index++;
            }
            index = 0;
            for(longitudeIndex = -180; longitudeIndex <= 180; longitudeIndex+=10) {
                longLines[index] = [];
                for(latitudeIndex = -90; latitudeIndex <= 90; latitudeIndex+=10) {
                    longLines[index].push(new Cesium.Cartographic(Cesium.Math.toRadians(longitudeIndex), Cesium.Math.toRadians(latitudeIndex), 10));
                }
                index++;
            }
            //console.log(latLines);
            for(var latDrawIndex = 0; latDrawIndex < latLines.length; latDrawIndex++) {
                toDraw = viewer.scene.globe.ellipsoid.cartographicArrayToCartesianArray(latLines[latDrawIndex]);
                entityCollection.add({
                    name : "grid",
                    polyline: {
                        positions : toDraw
                    }
                });
            }
            for(var longDrawIndex = 0; longDrawIndex < longLines.length; longDrawIndex++) {
                toDraw = viewer.scene.globe.ellipsoid.cartographicArrayToCartesianArray(longLines[longDrawIndex]);
                entityCollection.add({
                    name : "grid",
                    polyline: {
                        positions : toDraw
                    }
                });
            }
            //create labels for each line, latitude/longitude
            for(var latLabelsIndex = -90; latLabelsIndex <= 90; latLabelsIndex+=10) {
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
            for(var longLabelsIndex = -180; longLabelsIndex <= 180; longLabelsIndex+=10) {
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
            for(var entitiesIndex = entities.length - 1; entitiesIndex >= 0; entitiesIndex--) {
                if(entities[entitiesIndex].name === "grid") {
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
            if(pointNumber === 0) {
                center = mousePos;//viewer.scene.globe.ellipsoid.cartesianToCartographic(mousePos, new Cesium.Cartographic());
            } else if(pointNumber >= 1) {
                eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
                eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                if(!keepCircle) {
                    viewer.entities.remove(ellipse);
                }
                if(Cesium.defined(callback)) {
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
            if(mousePos && pointNumber > 0) {
                //do math
                radius = Cesium.Cartesian3.distance(center, mousePos);
                if(firstPass) {
                    viewer.entities.add({
                        position : center,
                        ellipse : {
                            semiMajorAxis : radiusProperty,
                            semiMinorAxis : radiusProperty,
                            material : Cesium.Color.DARKGRAY.withAlpha(0.5)
                        }
                    });
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

        eventHandler.setInputAction(function (movement) {
            var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
            if (cartesian && pointNumber > 0) {
                cartographicPoints[3] = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian, new Cesium.Cartographic());
                cartographicPoints[2] = new Cesium.Cartographic(cartographicPoints[3].longitude, cartographicPoints[0].latitude);
                cartographicPoints[1] = new Cesium.Cartographic(cartographicPoints[0].longitude, cartographicPoints[3].latitude);
                if(firstPass === true) {
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

        eventHandler.setInputAction(function (movement) {
            mousePos = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
            if (mousePos) {
                if(pointNumber === 0) {
                    cartographicPoints[0] = viewer.scene.globe.ellipsoid.cartesianToCartographic(mousePos);
                } else if(pointNumber >= 1) {
                    eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
                    eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
                    if(!keepRectangle) {
                        viewer.entities.remove(rectangle);
                    }
                    if(Cesium.defined(callback)) {
                        callback(Cesium.Rectangle.fromCartographicArray(cartographicPoints, new Cesium.Rectangle()));
                    }
                }
                pointNumber++;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    };

}