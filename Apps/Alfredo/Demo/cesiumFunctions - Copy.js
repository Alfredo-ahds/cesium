(function() {
    "use strict";
	
	var viewer;
	var dataSources;
	var DayStyles = [0xBB0000FF, 0xBBFFFF00, 0xBB00FF00, 0xBB00FFFF, 0xBBFFFFFF];
	var NightStyles = [0xBB0000B4, 0xBBB4B400, 0xBB00B400, 0xBB00B4B4, 0xBBB4B4B4];
	var isLoaded = [false, false, false, false, false, false, false, false, false, false];
	var kmlsLoaded = [];
	var visible = [false, false, false, false, false, false, false, false, false, false];
	var overlayActive = false;
	var drawType = 'polygon';
	
	/*for(var i = 0; i < 10; i++) {
		var toLoad = "../Resources/coverage" + i + ".kmz";
		kmlSources[i] = Cesium.KmlDataSource.load(toLoad);
	}*/
	
	window.cesiumFunctions = {
		createInstance : function(id) {
			viewer = new Cesium.Viewer(id, {
				animation : false,
				baseLayerPicker : false,
				fullscreenButton : false,
				geocoder : false,
				homeButton : false,
				sceneModePicker : false,
				timeline : false,
				navigationHelpButton : false
			});
			dataSources = viewer.dataSources;
		}, 
		changeStyle : function(Source, Style) {
			console.log("Starting to change color.");
			if(!isLoaded[Source]) {
				console.log("This source has not been loaded.");
			} else {
				drawType = detectDrawType(Source);
				//console.log(drawType);
				//console.log(Style);
				changeColor(Source, DayStyles[Style]);
			}
		},
		toggleEnable : function(Source) {
			console.log("Toggle Enable");
			if(!isLoaded[Source]) {
				console.log("This source has not been loaded.");
			} else {
				var sourceIndex = dataSources.indexOf(kmlsLoaded[Source]);
				console.log(kmlsLoaded[Source]);
				visible[Source] = !visible[Source];
				for(var i = 0; i < dataSources.get(sourceIndex).entities.values.length; i++) {
					dataSources.get(sourceIndex).entities.getById(dataSources.get(sourceIndex).entities.values[i].id).show = visible[Source];
				}
			}
		}, 
		manageSources : function(Source) {
			if(!isLoaded[Source]) {
				console.log("Loading source: " + Source);
				dataSources.add(Cesium.KmlDataSource.load("../Resources/coverage" + Source + ".kmz")).then(function() {
					console.log("Done loading");
					kmlsLoaded[Source] = dataSources.get(dataSources.length - 1);
				});
			} else {
				dataSources.remove(kmlsLoaded[Source], true);
				console.log("Unloading source");
			}
			visible[Source] = !visible[Source];
			isLoaded[Source] = !isLoaded[Source];
		}, 
		flyToEntity : function(Source, Entity) {
			var sourceNumber = document.getElementById(Source).value;
			var entityNumber = document.getElementById(Entity).value;
			//console.log(sourceNumber);
			if(!isLoaded[sourceNumber]) {
				console.log("Entity not loaded");
			} else {
				viewer.flyTo(dataSources.get(sourceNumber).entities.values[entityNumber]);
			}
		},
		flyToPos : function(lat, lon, alt, head, pit, ro) {
			var latitude = document.getElementById(lat).value;
			var longitude = document.getElementById(lon).value;
			var altitude = document.getElementById(alt).value;
			var heading = document.getElementById(head).value;
			var pitch = document.getElementById(pit).value;
			var roll = document.getElementById(ro).value;
			
			viewer.camera.flyTo({
				destination : Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude), 
				orientation : {
					heading : Cesium.Math.toRadians(heading),
					pitch : Cesium.Math.toRadians(pitch),
					roll : roll
				},
				duration : 3.0});
			
		}, 
		toggleOverlays : function() {
			var layers = viewer.scene.imageryLayers;
			if(!overlayActive) {
				var testOverlay = layers.addImageryProvider(new Cesium.TileMapServiceImageryProvider({
					url : '../Resources/tiles2',
					maximumLevel : 5,
				}));

				var testLayer = layers.addImageryProvider(new Cesium.SingleTileImageryProvider({
					url : '../Resources/transparency.png',
					rectangle : Cesium.Rectangle.fromDegrees(-75.0, 28.0, -67.0, 29.75)
				}));
			} else {
				console.log(layers.remove(layers.get(2)));
				console.log(layers.remove(layers.get(1)));
			}
			overlayActive = !overlayActive;
		}
	}
	
	function detectDrawType(Source) {
		console.log("Detecting draw type");
		var sourceIndex = dataSources.indexOf(kmlsLoaded[Source]);
		for(var i = 0; i < 20; i++) {
			var value = dataSources.get(sourceIndex).entities.values[0].propertyNames[i];
			if(typeof dataSources.get(sourceIndex).entities.values[0][value] !== "undefined" && dataSources.get(sourceIndex).entities.values[0][value].hasOwnProperty('_material')) {
				console.log("Detected draw type: " + value);
				return value;
			}
		}
	}
	
	function changeColor(Source, Style) {
		console.log("Changing color of " + Source)
		var sourceIndex = dataSources.indexOf(kmlsLoaded[Source]);
		var length = dataSources.get(sourceIndex).entities.values.length;
		var entitiesList = dataSources.get(sourceIndex).entities;
		var color = Cesium.Color.fromRgba(Style);
		//console.log(Style);
		for(var i = 0; i < length; i++) {
			entitiesList.getById(entitiesList.values[i].id)[drawType].outlineColor = color;
			entitiesList.getById(entitiesList.values[i].id)[drawType].material = color;
		}
	};
	
}());