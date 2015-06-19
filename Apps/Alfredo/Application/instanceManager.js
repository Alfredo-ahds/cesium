function instanceManager() {
    "use strict";
    /*jshint validthis:true */
    /*global Cesium, console, cesiumFunctions */

    /* Current input button ID map:
     * 0: New Cesium instance           8: Draw circle
     * 1: Remove Cesium instance        9: Draw polygon
     * 2: Outut rectangular coords      10: Draw polyline
     * 3: Zoom on rectangle             11: Set a pin
     * 4: Zoom to fit globe             12: Display coords
     * 5: Bookmark camera pos
     * 6: Edit shapes
     * 7: Draw rectangle
     */

    var cesiumInstances = [];
    //create a single Cesium instance upon initialization
    cesiumInstances[0] = new Cesium.Viewer(document.getElementById("cesiumInstances"));

    this.inputHandler = function(id) {
        console.log(id);
        switch(id) {
        //handle inputs

        }
    };
}