function instanceManager() {
    "use strict";
    /*jshint validthis:true */
    /*global Cesium, console, cesiumFunctions */

    /* Current input button ID map:
     * 0: New Cesium instance           8: Draw circle
     * 1: Remove Cesium instance        9: Draw polygon
     * 2: Clear the globe               10: Draw polyline
     * 3: Zoom on rectangle             11: Set a pin
     * 4: Zoom to fit globe             12: Display coords
     * 5: Bookmark camera pos
     * 6: Edit shapes
     * 7: Draw rectangle
     */

    //Holds each viewer instance, the index of the last added instance, and
    //the percentage of the display that each instance uses.
    var cesiumInstances = [];
    var instanceIndex = 0;
    var percentOfDisplay = 100;
    var operations = new cesiumFunctions();

    var activeInstance = 0;

    //holds an array of camera properties so the user can restore a particular view.
    var bookmarkedViews = [];

    //create a single Cesium instance upon initialization with an index of 0
    //and id of zero, taking up 100% of the display.
    var container = document.getElementById("cesiumInstances");
    var instance = document.createElement('div');
    instance.id = "0";
    instance.className = "cesiumContainer";
    instance.onclick = function() {
      activeInstance = this.id;
      //console.log(this.id);
    };
    container.appendChild(instance);

    Cesium.BingMapsApi.defaultKey = "Am-p7DPQRQdAQJhOI4yeuFnaNlgJkBjK3ZOJohluDm0Jr0sornY9zN-MQbB6jYeo";

    cesiumInstances[0] = new Cesium.Viewer(instance, {
        baseLayerPicker : false,
        geocoder : false,
        sceneModePicker : false,
        navigationHelpButton : false,
        homeButton : false
    });

    operations.setOptions(cesiumInstances[0]);

    //Manages inputs by the button id, one case for every button/clickable
    //element. Uses functions in cesiumFunctions.js to modify the viewer
    //instances stored in cesiumInstances[].
    this.inputHandler = function(id) {
        //console.log(id);
        switch(id) {
        case "0":
           console.log("Adding Cesium instance");
           instance = document.createElement('div');
           instanceIndex++;
           instance.id = instanceIndex;
           instance.className = "cesiumContainer";
           instance.onclick = function() {
               activeInstance = this.id;
               //console.log(this.id);
             };
           container.appendChild(instance);
           console.log(instanceIndex);
           cesiumInstances[instanceIndex] = new Cesium.Viewer(instance, {
               baseLayerPicker : false,
               geocoder : false,
               sceneModePicker : false,
               navigationHelpButton : false,
               homeButton : false
           });
           operations.setOptions(cesiumInstances[instanceIndex]);
           percentOfDisplay = (100 / container.children.length);
           for (var addIndex = 0; addIndex < container.children.length; addIndex++) {
               console.log("Modifying child " + addIndex);
               console.log(container.children[addIndex].style.width = percentOfDisplay + "%");
               console.log(container.children[addIndex].style.left = (container.children[addIndex].id * percentOfDisplay) + "%");
           }
        break;
        case "1":
            console.log("Removing Cesium instance");
            cesiumInstances[instanceIndex].destroy();
            container.removeChild(container.children[instanceIndex]);
            instanceIndex--;
            percentOfDisplay = (100 / container.children.length);
            for (var removeIndex = 0; removeIndex < container.children.length; removeIndex++) {
                console.log("Modifying child " + removeIndex);
                console.log(container.children[removeIndex].style.width = percentOfDisplay + "%");
                console.log(container.children[removeIndex].style.left = (container.children[removeIndex].id * percentOfDisplay) + "%");
            }
        break;
        case "2":
            console.log("Changing scene mode");
            operations.changeSceneMode(cesiumInstances[activeInstance]);
        break;
        case "3":
            console.log("Zooming on drawn rectangle.");
            operations.zoomOnRectangle(cesiumInstances[activeInstance]);
        break;
        case "4":
            console.log("Zooming to fit globe");
            operations.zoomFit(cesiumInstances[activeInstance]);
        break;
        case "5":
            //Either need to add a small drop down menu to display views, or add to
            //browser's capability.
            console.log("Bookmarking this view");
            bookmarkedViews.push(operations.saveCameraPos(cesiumInstances[activeInstance]));
        break;
        case "6":
            console.log("Selection tool");
            //TODO: Add features to the selection tool after all other drawing
            //features are complete.
            operations.selectionTool(cesiumInstances[activeInstance]);
        break;
        case "7":
            console.log("Draw rectangle");
            operations.drawRectangle(cesiumInstances[activeInstance], true);
        break;
        case "8":
            console.log("Draw circle");
            operations.drawCircle(cesiumInstances[activeInstance], true);
        break;
        case "9":
            console.log("Draw polygon");
            operations.drawPolyline(cesiumInstances[activeInstance], false, function(hiearchy){
                operations.drawPolygon(cesiumInstances[activeInstance], hiearchy);
            });
        break;
        case "10":
            console.log("Draw polyline");
            operations.drawPolyline(cesiumInstances[activeInstance], true);
        break;
        case "11":
            console.log("Place a pin");
            operations.addPlacemark(cesiumInstances[activeInstance], true);
        break;
        case "12":
            console.log("Adding coordinates grid");
            operations.displayCoords(cesiumInstances[activeInstance]);
        break;
        case "13":
            console.log("Clearing all data");
            operations.clear(cesiumInstances[activeInstance], true);
        }
    };

    //Manages the various overlays available. This includes both Tile Map Services as well as
    //kml based ground overlays.
    this.overlayManager = function(overlayId, value) {
        var myWindow;
        var filePath = "Resources/overlay/";
        //screen overlay
        if(overlayId.indexOf("Revisit") > -1) {
            if(value) {
                myWindow = window.open("", "", "width=300, height=700");
                myWindow.document.write("<img src=\"Resources/overlay/Revisit/revisit_overlay.png\" width=\"200\" height=\"600\">");
                myWindow.document.body.style.background = "gray";
            }
            filePath += "Revisit/" + overlayId + ".kmz";
            operations.manageOverlay(cesiumInstances[activeInstance], filePath, value);
        } else if(overlayId.indexOf("Cloud") > -1) {
            filePath += "Cloud/" + overlayId + ".kmz";
            operations.manageOverlay(cesiumInstances[activeInstance], filePath, value);
        } else if(overlayId.indexOf("Precipitation") > -1) {
            filePath += "Precipitation/" + overlayId + ".kmz";
            operations.manageOverlay(cesiumInstances[activeInstance], filePath, value);
        } else {
            switch(overlayId) {
            case "Black_Marble":
                filePath += "Other/Black_Marble";
                operations.manageOverlay(cesiumInstances[activeInstance], filePath, value);
                break;
            case "ASTER":
                filePath += "Other/ASTER.kml";
                operations.manageOverlay(cesiumInstances[activeInstance], filePath, value);
                break;
            case "ASTER_SMALL":
                filePath += "Other/ASTER_SMALL.kml";
                operations.manageOverlay(cesiumInstances[activeInstance], filePath, value);
                break;
             //superoverlay, need to gen tiles. + screenoverlay
            case "Globcover":
                if(value) {
                    myWindow = window.open("", "", "width=775, height=600");
                    myWindow.document.write("<img src=\"Resources/overlay/Other/GlobCover/globLegend.png\">");
                }
                break;
            //to large, causes browser crashing. Needs to be optimized.
            case "Landsat":
                break;
            //need to gen tiles + screenoverlay
            case "MODIS":
                if(value) {
                    myWindow = window.open("", "", "width=325, height=400");
                    myWindow.document.write("<img src=\"Resources/overlay/Other/modis/modis_overlay.png\">");
                }
                filePath += "Other/modis/modis";
                operations.manageOverlay(cesiumInstances[activeInstance], filePath, value);
                break;
            //Also pretty large, breaks under normal use.
            case "Sentinel-2":
                filePath += "Other/Sentinel-2.kmz";
                operations.manageOverlay(cesiumInstances[activeInstance], filePath, value);
                break;
            }
        }
    };

    //Handles the creation and management of 3D data from kml overlays such as cloud cover
    //and rainfall.
    this.toggle3D = function(overlayId, value) {

    };

    //Manages the different available sources. Receives an id, operation, and a true/false value
    //from the checkbox press and acts accordingly.
    this.sourceManager = function(satId, operation, value) {
        var filePath = "Resources/kml/" + satId + "_";
        if(operation === "ground" || operation ==="nadir" || operation === "actuals") {
            var extension = operation === "actuals" ? ".kml" : ".kmz";
            operations.manageSources(cesiumInstances[activeInstance], filePath+operation+extension, value);
        } else if(operation === "anim") {
            operations.generateAnimation(cesiumInstances[activeInstance], satId, value);
        }
    };

    //For debugging purposes only.
    this.returnAllData = function() {
        return {
            instances : cesiumInstances,
            bookmarkedViews : bookmarkedViews,
            operations : operations
        };
    };
}