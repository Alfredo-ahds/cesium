function cesiumFunctions(id) {

	var DayStyles = [0xBB0000FF, 0xBBFFFF00, 0xBB00FF00, 0xBB00FFFF, 0xBBFFFFFF];
	var NightStyles = [0xBB0000B4, 0xBBB4B400, 0xBB00B400, 0xBB00B4B4, 0xBBB4B4B4];
	var isLoaded = [false, false, false, false, false, false, false, false, false, false];
	var kmlsLoaded = [];
	var visible = [false, false, false, false, false, false, false, false, false, false];
	var overlayActive = false;
	var tracking = false;
	var drawType = 'polygon';
	var mode = 0;
	var objectsLoaded = 0;
	var screenOverlayShown = false;

	Cesium.BingMapsApi.defaultKey = "Am-p7DPQRQdAQJhOI4yeuFnaNlgJkBjK3ZOJohluDm0Jr0sornY9zN-MQbB6jYeo";
	var viewer = new Cesium.Viewer(id, {
			baseLayerPicker : false,
			fullscreenButton : false,
			geocoder : false,
			homeButton : false,
			sceneModePicker : false,
			navigationHelpButton : false,
			selectionIndicator : false,
			targetFrameRate : 60
		});

	viewer.scene.globe.tileCacheSize = 1000;
	viewer.scene.debugShowFramesPerSecond = true;
	var dataSources = viewer.dataSources;

	//viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

	setTimeout(function () {
		viewer.container.getElementsByClassName("cesium-performanceDisplay")[0].style.top = '90%';
	}, 2000);

	var handler = viewer.screenSpaceEventHandler;
	/*handler.setInputAction(function(pos) {
	console.log("Left double click");
	console.log(pos.position);
	if(Cesium.defined(viewer.scene.pick(pos.position))) {
	viewEntity({entity : viewer.scene.pick(pos.position).id}, 8, "view", function() {console.log("Done")});
	} else {
	tracking = false;
	}
	}, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
	 */
	handler.setInputAction(function (pos) {
		console.log("Middle click");
		console.log(pos.position);
		if (Cesium.defined(viewer.scene.pick(pos.position))) {
			viewEntity({
				entity : viewer.scene.pick(pos.position).id
			}, 8, "track");
			handler.setInputAction(function () {
				console.log(viewer.camera.position);
			}, Cesium.ScreenSpaceEventType.LEFT_CLICK)
		} else {
			tracking = false;
		}
	}, Cesium.ScreenSpaceEventType.MIDDLE_CLICK);

	handler.setInputAction(function (pos) {
		console.log(viewer.camera.position);
		console.log(viewer.camera.positionWC)
	}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

	this.changeStyle = function (Source, Style) {
		console.log("Starting to change color.");
		if (!isLoaded[Source]) {
			console.log("This source has not been loaded.");
		} else {
			drawType = detectDrawType(kmlsLoaded[Source]);
			//console.log(drawType);
			//console.log(Style);
			changeColor(kmlsLoaded[Source], Style);
		}
	}

	this.toggleEnable = function (Source) {
		console.log("Toggle Enable");
		if (!isLoaded[Source]) {
			console.log("This source has not been loaded.");
		} else {
			visible[Source] = !visible[Source];
			toggleShow(kmlsLoaded[Source], visible[Source]);
		}
	}

	this.manageSources = function (Source, callback) {
		if (!isLoaded[Source]) {
			isLoaded[Source] = !isLoaded[Source];
			console.log("Loading source: " + Source);
			dataSources.add(Cesium.KmlDataSource.load("../Resources/coverage" + Source + ".kmz")).then(function () {
				console.log("Done loading");
				kmlsLoaded[Source] = dataSources.get(dataSources.length - 1);
				objectsLoaded += dataSources.get(dataSources.length - 1).entities.values.length;
				console.log(objectsLoaded);
				callback();
				if (screenOverlayShown)
					updateOverlay();
			});
		} else {
			isLoaded[Source] = !isLoaded[Source];
			dataSources.remove(kmlsLoaded[Source], true);
			kmlsLoaded[Source] = undefined;
			console.log("Unloading source");
			if (screenOverlayShown)
				updateOverlay();
		}
		visible[Source] = !visible[Source];
	}

	this.flyToEntity = function (Source, Entity) {
		var sourceNumber = document.getElementById(Source).value;
		var entityNumber = document.getElementById(Entity).value;
		//console.log(sourceNumber);
		if (!isLoaded[sourceNumber]) {
			console.log("Entity not loaded");
		} else {
			var sourceIndex = dataSources.indexOf(kmlsLoaded[sourceNumber]);
			var entity = dataSources.get(sourceIndex).entities.values[entityNumber];
			this.flyToPos({
				entity : {
					entity : entity,
					height : 2500000
				}
			}, 4);
			//console.log(entity.description);
			//entity.polygon.material = Cesium.Color.WHITE;
		}
	}

	this.toggleOverlays = function () {
		var layers = viewer.scene.imageryLayers;
		var eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
		if (!overlayActive) {
			var toAdd = new Cesium.TileMapServiceImageryProvider({
					url : '../Resources/output',
					maximumLevel : 8
					//tilingScheme : new Cesium.GeographicTilingScheme({
					//numberOfLevelZeroTilesX : 1
				});

			var testOverlay = layers.addImageryProvider(toAdd);
			var testLayer = layers.addImageryProvider(new Cesium.SingleTileImageryProvider({
						url : '../Resources/transparency.png',
						rectangle : Cesium.Rectangle.fromDegrees(-75.0, 28.0, -67.0, 29.75)
					}));
			var transparency = 1;
			var lastCamHeight = viewer.camera.position.z;
			eventHandler.setInputAction(function () {
				//console.log(lastCamHeight);
				var camHeight = viewer.camera.position.z;
				if (camHeight < lastCamHeight) {
					transparency = transparency - 0.05;
					if (transparency < 0)
						transparency = 0;
				} else {
					transparency = transparency + .05;
					if (transparency > 1)
						transparency = 1;
				}
				testOverlay.alpha = transparency;
				lastCamHeight = camHeight;
			}, Cesium.ScreenSpaceEventType.WHEEL);
		} else {
			console.log(layers.remove(layers.get(2)));
			console.log(layers.remove(layers.get(1)));
			eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.WHEEL);
		}
		overlayActive = !overlayActive;
	}

	this.loadOverlay = function (latStart, longStart, latEnd, longEnd, picSource) {
		var lat1 = document.getElementById(latStart).value;
		var long1 = document.getElementById(longStart).value;
		var lat2 = document.getElementById(latEnd).value;
		var long2 = document.getElementById(longEnd).value;
		var pic = document.getElementById(picSource).value;
		var layers = viewer.scene.imageryLayers;
		layers.addImageryProvider(new Cesium.SingleTileImageryProvider({
				url : pic,
				rectangle : Cesium.Rectangle.fromDegrees(long1, lat1, long2, lat2)
			}));
		viewer.camera.flyTo({
			destination : Cesium.Cartesian3.fromDegrees(long2, lat2, 2500000)
		});

	}

	this.returnScene = function () {
		return viewer.scene;
	}

	this.returnViewer = function () {
		return viewer;
	}

	this.drawRectangle = function () {
		var points = [];
		var pointNumber = 0;
		var mousePos;
		var eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
		var entity = viewer.entities.add({
				label : {
					show : false
				}
			});

		eventHandler.setInputAction(function (movement) {
			var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
			//console.log(movement);
			if (cartesian) {
				var cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
				var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
				var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);

				entity.position = cartesian;
				entity.label.show = true;
				entity.label.text = '(' + longitudeString + ', ' + latitudeString + ')';
			} else {
				entity.label.show = false;
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

		eventHandler.setInputAction(function (movement) {
			mousePos = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
			if (mousePos) {
				if (pointNumber > 1) {
					console.log("finished");
					eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
					eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
					viewer.entities.add({
						rectangle : {
							coordinates : Cesium.Rectangle.fromCartographicArray(points),
							material : Cesium.Color.RED.withAlpha(.5)
						}
					});
					entity.label.show = false;
				} else {
					console.log("left click");
					console.log(movement);
					points[pointNumber] = viewer.scene.globe.ellipsoid.cartesianToCartographic(mousePos);
					console.log(points[pointNumber]);
					pointNumber++;
				}
			}
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
	}

	this.drawPolygon = function () {
		var points = [];
		var pointNumber = 0;
		var mousePos;
		var eventHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
		var entity = viewer.entities.add({
				label : {
					show : false
				}
			});

		eventHandler.setInputAction(function (movement) {
			var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
			if (cartesian) {
				var cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
				var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
				var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);

				entity.position = cartesian;
				entity.label.show = true;
				entity.label.text = '(' + longitudeString + ', ' + latitudeString + ')';
			} else {
				entity.label.show = false;
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

		eventHandler.setInputAction(function (movement) {
			mousePos = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
			if (mousePos) {
				points[pointNumber] = mousePos;
				console.log(points[pointNumber]);
				pointNumber++;
			}
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

		eventHandler.setInputAction(function () {
			console.log("Finished");
			eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
			eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
			eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
			entity.label.show = false;
			//draw
			viewer.entities.add({
				polygon : {
					hierarchy : points
				}
			})
		}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
	}

	this.clearGlobe = function () {
		console.log(viewer.entities.values.length)
		viewer.entities.removeAll();
		viewer.dataSources.removeAll(true);
		viewer.scene.primitives.removeAll();
		kmlsLoaded = [];
		isLoaded = [false, false, false, false, false, false, false, false, false, false];
		visible = [false, false, false, false, false, false, false, false, false, false];
	}

	this.toggleMode = function () {
		mode = (mode + 1) % 3;
		var scene = viewer.scene;
		switch (mode) {
		case 0:
			scene.morphTo3D();
			break;
		case 1:
			scene.morphTo2D();
			break;
		case 2:
			scene.morphToColumbusView();
			break;
		default:
			scene.morphTo3D();
		}
	}

	this.tour = function () {
		var index = 0;
		var prevColor;
		var prevThis = this;
		viewer.dataSources.removeAll(true);
		for (var i = 0; i < isLoaded.length; i++) {
			isLoaded[i] = false;
		}
		viewer.dataSources.add(Cesium.KmlDataSource.load('../Resources/actuals.kml')).then(function (dataSource) {
			console.log(dataSource);
			console.log("Done loading");
			loop();
		});

		var loop = function () {
			console.log(prevThis);
			console.log("In loop");
			if (index >= 10) {
				console.log("done");
				prevThis.clearGlobe();
			} else {
				console.log("Selecting entity");
				index++;
				var randomEntity = Math.floor(Math.random() * viewer.dataSources.get(0).entities.values.length);
				randomEntity = viewer.dataSources.get(0).entities.values[randomEntity];
				console.log("got entity");
				console.log(randomEntity);
				prevThis.flyToPos({
					entity : {
						entity : randomEntity,
						height : 10000000
					}
				}, 6, function () {
					prevColor = randomEntity.polygon.material;
					randomEntity.polygon.material = Cesium.Color.AQUA;
					randomEntity.polygon.outlineColor = Cesium.Color.AQUA;
					console.log(viewer.selectedEntity = randomEntity)
					prevThis.flyToPos({
						entity : {
							entity : randomEntity,
							height : 2500000
						}
					}, 6, function () {
						setTimeout(function () {
							prevThis.flyToPos({
								entity : {
									entity : randomEntity,
									height : 10000000
								}
							}, 4, function () {
								randomEntity.polygon.material = prevColor;
								randomEntity.polygon.outlineColor = prevColor;
								viewer.selectedEntity = undefined;
								console.log("done zooming out");
								loop();
							});
						}, 3000);
					});
				});
				console.log("Done");
			}
		}
	}

	this.improvedTour = function () {
		var index = 1;
		var prevColor;
		var prevThis = this;
		viewer.dataSources.removeAll(true);
		for (var i = 0; i < isLoaded.length; i++) {
			isLoaded[i] = false;
		}
		//console.log(this);
		this.manageSources(0, function () {
			console.log("Done loading, getting animation");
			prevThis.generateAnimation(0);
			console.log("Done with animation");
			//console.log(viewEntity);
			console.log(viewer.entities.getById("sat0"));
			var satellite = viewer.entities.getById("sat0");
			console.log("Got entity");
			viewEntity({
				entity : satellite
			}, 8, "view", function (position) {
				//viewEntity({entity : satellite, position : position.clone()}, 8, "track");
				//console.log(viewer.camera.position)
				//console.log("Done viewing")
				//viewer.scene.screenSpaceCameraController.enableInputs = false;
				setTimeout(function () {
					moveCamera({
						cartesian : new Cesium.Cartesian3(-1500000, -1300000, 4300000)
					}, 4, loop)
				}, 500);
				//moveCamera({cartesian : new Cesium.Cartesian3(10000, -15000, 61000)}, 8, loop);
				//viewer.camera.position = new Cesium.Cartesian3(770000, -232000, 1980000);
			});
			console.log("Done")
		});

		function loop() {
			console.log("Inside loop");
			if (index >= 10) {
				console.log("Done with loop");
			} else {
				var entity = kmlsLoaded[0].entities.values[50 * index];
				var entityTime = Cesium.JulianDate.addSeconds(viewer.clock.startTime, 3000 * index, new Cesium.JulianDate());
				//kmlsLoaded[0].entities.getById(entity.id).polygon.material = Cesium.Color.WHITE;
				//interval is entityTime +/- 10s.
				//console.log("current time");
				//console.log(viewer.clock.currentTime);
				//console.log("Entity time")
				//console.log(entityTime);
				var viewingInterval = new Cesium.TimeInterval({
						start : Cesium.JulianDate.addSeconds(entityTime, -200, new Cesium.JulianDate()),
						stop : Cesium.JulianDate.addSeconds(entityTime, 100, new Cesium.JulianDate())
					});
				//console.log(viewingInterval);
				viewer.clock.multiplier = 150;
				viewer.clock.onTick.addEventListener(function (clock) {
					if (Cesium.TimeInterval.contains(viewingInterval, clock.currentTime)) {
						clock.onTick.removeEventListener(arguments.callee);
						clock.multiplier = 10;
						//tracking = false;
						console.log(entity);
						//create the sampled property for the path of the camera down to the entity. 
						var cameraPath = new Cesium.SampledPositionProperty();
						//cameraPath.addSample(clock.currentTime, )
						clock.onTick.addEventListener(function (clock) {
							
							//change view to entity on the ground
							console.log("Done tracking");
							tracking = false; 
					
							if(!Cesium.TimeInterval.contains(viewingInterval, clock.currentTime)) {
								clock.onTick.removeEventListener(arguments.callee);
								console.log("leaving interval");
								index++;
								loop();
							}
						});
					}
				});
				console.log(entity);
			}
		}
	}

	this.generateAnimation = function (Source) {
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
		//adding a '1' to the constructor results in an inertial reference frame.
		var positionCollection = new Cesium.SampledPositionProperty();
		positionCollection.setInterpolationOptions({
			interpolationDegree : 10,
			interpolationAlgorithm : Cesium.HermitePolynomialApproximation
		});
		var groundPositionCollection = new Cesium.SampledPositionProperty();
		//positionCollection.referenceFrame = 1;
		var drawType = detectDrawType(kmlsLoaded[Source]);

		var timeStart = dateToString(kmlsLoaded[Source].entities.values[0]);
		var timeEnd = dateToString(kmlsLoaded[Source].entities.values[kmlsLoaded[Source].entities.values.length - 1]);
		/*var timeStart = time.slice(0,5)
		/*var timeStart = kmlsLoaded[Source].entities.values[0].description._value;
		//console.log(timeStart);
		timeStart = timeStart.slice(187, 207);
		timeStart = timeStart.slice(0,5) + months[timeStart.slice(5,8)] + "-" + timeStart.slice(9,11) + "T" + timeStart.slice(12) + "Z";
		console.log(timeStart);
		var timeEnd = kmlsLoaded[Source].entities.values[(kmlsLoaded[Source].entities.values.length - 1)].description._value;
		timeEnd = timeEnd.slice(187, 207)
		timeEnd = timeEnd.slice(0,5) + months[timeEnd.slice(5,8)] + "-" + timeEnd.slice(9,11) + "T" + timeEnd.slice(12) + "Z";
		console.log(timeEnd);*/

		timeStart = Cesium.JulianDate.fromIso8601(timeStart);
		timeEnd = Cesium.JulianDate.fromIso8601(timeEnd);

		//viewer.timeline.zoomTo(timeStart, timeEnd);
		viewer.clock.startTime = timeStart.clone();
		viewer.clock.stopTime = timeEnd.clone();
		viewer.clock.currentTime = timeStart.clone();
		viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
		viewer.clock.multiplier = 10;

		var height = 2500000 + (Source * 1000000);

		for (var i = 0; i < kmlsLoaded[Source].entities.values.length; i++) {
			if (drawType == 'polygon') {
				var pos = kmlsLoaded[Source].entities.values[i][drawType].hierarchy.getValue(viewer.clock.currentTime).positions;
			} else {
				var pos = kmlsLoaded[Source].entities.values[i][drawType].positions.getValue(viewer.clock.currentTime);
			}

			var positionsArray = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(pos);
			var boundingRectangle = Cesium.Rectangle.fromCartographicArray(positionsArray);
			//console.log(boundingRectangle);
			var center = Cesium.Rectangle.center(boundingRectangle);
			//console.log(center)
			var groundPos = center.clone();
			center.height = height;
			//console.log(center);

			/*viewer.entities.add({
			rectangle : {
			coordinates : boundingRectangle,
			material : Cesium.Color.GREEN.withAlpha(0.5),
			outline : true,
			}
			})*/
			var time = dateToString(kmlsLoaded[Source].entities.values[i]);
			//console.log(time);
			if (!(center.latitude > 85) && !(center.latitude < -85)) {
				positionCollection.addSample(time, Cesium.Ellipsoid.WGS84.cartographicToCartesian(center));
				groundPositionCollection.addSample(time, Cesium.Ellipsoid.WGS84.cartographicToCartesian(groundPos));
			}

			/*var groundPosition = pos;
			pos = Cesium.Ellipsoid.WGS84.cartesianToCartographic(pos);
			pos.height = height;
			pos = Cesium.Ellipsoid.WGS84.cartographicToCartesian(pos);
			//console.log(pos);
			var time = Cesium.JulianDate.addSeconds(timeStart, i*60, new Cesium.JulianDate());
			//console.log(time);
			positionCollection.addSample(time, pos);
			groundPositionCollection.addSample(time, groundPosition);*/
		}

		//console.log(kmlsLoaded[Source].entities.values[0][drawType].material.color._value)

		viewer.entities.add({
			id : "sat" + Source,
			availability : new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
						start : timeStart,
						stop : timeEnd
					})]),
			position : positionCollection,
			model : {
				uri : '../Resources/3d/Cloudsat.gltf',
				minimumPixelSize : 32,
				scale : 2
			},
			orientation : new Cesium.VelocityOrientationProperty(positionCollection),
			path : {
				resolution : 120,
				material : new Cesium.PolylineGlowMaterialProperty({
					glowPower : 0.1,
					color : kmlsLoaded[Source].entities.values[0][drawType].material.color._value
				}),
				width : 5,
				leadTime : 0,
				trailTime : 0
			}
		});
		/*viewer.entities.add({
		id : "ground" + Source,
		availability : new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
		start : timeStart,
		stop : timeEnd
		})]),
		position : groundPositionCollection
		});

		var positionCollection2 = Cesium.ReferenceProperty.fromString(viewer.entities, "sat" + Source + "#position");
		var groundPositionCollection2 = Cesium.ReferenceProperty.fromString(viewer.entities, "ground" + Source + "#position");

		console.log(positionCollection2);
		console.log(groundPositionCollection2);

		var reference = [positionCollection2, groundPositionCollection2];

		var reference2 = new Cesium.PositionPropertyArray(reference);

		console.log(reference2);

		viewer.entities.add({
		name : "lineToGround" + Source,
		availability : new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({
		start : timeStart,
		stop : timeEnd
		})]),
		polyline : {
		positions : reference2,
		width : 1,
		material : kmlsLoaded[Source].entities.values[0][drawType].material
		}
		}); */
		function dateToString(entity) {
			var toParse = entity.description._value;
			var parser = document.createElement("html");
			parser.innerHTML = toParse;
			var elements = (parser.getElementsByTagName("td"));
			var timeString = undefined;
			for (var i = 0; i < elements.length; i++) {
				if (elements[i].textContent.indexOf("Time:") > -1) {
					timeString = elements[i + 1].textContent;
				}
			}
			//console.log(timeString);
			var months = {JAN : "01",FEB : "02",MAR : "03",APR : "04",MAY : "05",JUN : "06",JUL : "07",AUG : "08",SEP : "09",OCT : "10",NOV : "11",DEC : "12"};
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

		console.log("Done");
	}

	this.screenOverlay = function () {
		if (!screenOverlayShown) {
			var container = viewer.container;
			console.log(container);
			var screenOverlay = document.createElement('div');

			var headerStyle = document.createElement("H2");
			headerStyle.style.color = '#FFFFFF';
			headerStyle.style.fontSize = '150%';
			headerStyle.id = "header";
			headerStyle.appendChild(document.createTextNode("Currently loaded sources:"));
			headerStyle.appendChild(document.createElement("BR"));
			var bodyStyle = document.createElement("H2");
			bodyStyle.id = "body";
			bodyStyle.style.color = '#FFFFFF';
			bodyStyle.style.fontSize = '100%';

			for (var i = 0; i < isLoaded.length; i++) {
				if (isLoaded[i]) {
					var sourceName = kmlsLoaded[i].entities.values[0].name;
					bodyStyle.appendChild(document.createTextNode(sourceName));
					bodyStyle.appendChild(document.createElement("BR"));
				}
			}

			screenOverlay.appendChild(headerStyle);
			screenOverlay.appendChild(bodyStyle);

			//style related things.
			screenOverlay.style.width = '25%';
			screenOverlay.style.position = 'absolute';
			screenOverlay.style.top = '0%';
			screenOverlay.style.left = '75%';
			screenOverlay.id = "screenOverlay";

			container.appendChild(screenOverlay);
		} else {
			var toRemove = document.getElementById("screenOverlay");
			viewer.container.removeChild(toRemove);

		}

		screenOverlayShown = !screenOverlayShown;
	}

	this.timeDynamicData = function () {
		var timeStart = Cesium.JulianDate.fromIso8601("2014-06-02T00:00:30Z");
		var timeEnd = Cesium.JulianDate.fromIso8601("2015-06-02T00:00:30Z");
		viewer.timeline.zoomTo(timeStart, timeEnd);
		viewer.clock.startTime = timeStart.clone();
		viewer.clock.stopTime = timeEnd.clone();
		viewer.clock.currentTime = timeStart.clone();
		viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
		viewer.clock.clockStep = Cesium.ClockStep.TICK_DEPENDENT;

		console.log("Done creating clock");
		var rectangles = [];
		var heightMap = [];
		var colorMap = [];
		var colors = [];
		var newPrimitiveCollection = [];
		var primitiveCollection = [];
		var count = 0;
		var flag = 0;

		var container = viewer.container;
		var screenOverlay = document.createElement('div');

		var headerStyle = document.createElement("H2");
		headerStyle.style.color = '#FFFFFF';
		headerStyle.style.fontSize = '150%';
		headerStyle.id = "header";
		headerStyle.appendChild(document.createTextNode("Current Date: "));
		headerStyle.appendChild(document.createElement("BR"));
		var bodyStyle = document.createElement("H2");
		bodyStyle.id = "body";
		bodyStyle.style.color = '#FFFFFF';
		bodyStyle.style.fontSize = '100%';

		bodyStyle.appendChild(document.createTextNode(viewer.clock.currentTime));
		bodyStyle.appendChild(document.createElement("BR"));

		screenOverlay.appendChild(headerStyle);
		screenOverlay.appendChild(bodyStyle);

		//style related things.
		screenOverlay.style.width = '25%';
		screenOverlay.style.position = 'absolute';
		screenOverlay.style.top = '0%';
		screenOverlay.style.left = '75%';
		screenOverlay.id = "screenOverlay";

		container.appendChild(screenOverlay);
		console.log(document.getElementById("body").innerHTML);
		Cesium.KmlDataSource.load("../Resources/precipitation.kmz").then(function (dataSource) {
			console.log(dataSource._entityCollection.values);
			var count = 0;
			var entities = dataSource._entityCollection.values;
			var time = viewer.clock.currentTime;
			for (var i = 0; i < entities.length; i += 2) {
				heightMap[count] = new Cesium.SampledProperty(Number);
				heightMap[count].addSample(timeStart, 0);
				heightMap[count].addSample(timeEnd, entities[i + 1].name * 10000);
				var position = viewer.scene.globe.ellipsoid.cartesianArrayToCartographicArray(entities[i].polygon.hierarchy.getValue(time).positions);
				rectangles[count] = Cesium.Rectangle.fromCartographicArray(position);
				colors[count] = entities[i].polygon.material.getValue(time).color;
				colorMap[count] = new Cesium.SampledProperty(Cesium.Color);
				colorMap[count].addSample(timeStart, Cesium.Color.fromRgba("0xCC5dffba"));
				colorMap[count].addSample(timeEnd, colors[count]);
				count++;
			}

			console.log(rectangles);

			for (var i = 0; i < rectangles.length; i++) {
				primitiveCollection.push(new Cesium.GeometryInstance({
						geometry : new Cesium.RectangleGeometry({
							rectangle : rectangles[i],
							extrudedHeight : heightMap[i].getValue(time)
						}),
						attributes : {
							color : Cesium.ColorGeometryInstanceAttribute.fromColor(colorMap[i].getValue(time))
						}
					}));
			}

			viewer.scene.primitives.add(new Cesium.Primitive({
					geometryInstances : primitiveCollection,
					appearance : new Cesium.PerInstanceColorAppearance()
				}));

			viewer.clock.multiplier = 60000;

			viewer.clock.onTick.addEventListener(function () {
				if (flag == 0) {
					//console.log("Tick");

					var time = viewer.clock.currentTime;
					newPrimitiveCollection = [];
					for (var i = 0; i < rectangles.length; i++) {
						newPrimitiveCollection.push(new Cesium.GeometryInstance({
								geometry : new Cesium.RectangleGeometry({
									rectangle : rectangles[i],
									extrudedHeight : heightMap[i].getValue(time)
								}),
								attributes : {
									color : Cesium.ColorGeometryInstanceAttribute.fromColor(colorMap[i].getValue(time))
								}
							}));
					}
					viewer.scene.primitives.add(new Cesium.Primitive({
							geometryInstances : newPrimitiveCollection,
							appearance : new Cesium.PerInstanceColorAppearance()
						}));
					document.getElementById("body").innerHTML = viewer.clock.currentTime + "<br>";
					//console.log(viewer.scene.primitives.get(1));
					viewer.scene.primitives.get(1).readyPromise.then(function () {
						//console.log("Resolved, removing first primitive");
						viewer.scene.primitives.remove(viewer.scene.primitives.get(0));
						count = 0;
						flag = 0;
					});
					flag = 1;
				}
				count++;
			});

			console.log("Finished");

		});
	}

	this.dataVisualization = function () {
		Cesium.KmlDataSource.load("../Resources/precipitation.kmz").then(function (dataSource) {
			console.log(dataSource.entities.values.length)
			var rectangles = [];
			var colors = [];
			var heights = [];
			var count = 0;

			var time = viewer.clock.currentTime;
			for (var i = 0; i < dataSource.entities.values.length; i += 2) {
				var position = viewer.scene.globe.ellipsoid.cartesianArrayToCartographicArray(dataSource.entities.values[i].polygon.hierarchy.getValue(time).positions);
				rectangles[count] = Cesium.Rectangle.fromCartographicArray(position);
				colors[count] = dataSource.entities.values[i].polygon.material.getValue(time).color;
				heights[count] = dataSource.entities.values[i + 1].name * 10000;
				count++;
			}

			var primitiveCollection = [];
			for (var i = 0; i < rectangles.length; i++) {
				primitiveCollection.push(new Cesium.GeometryInstance({
						geometry : new Cesium.RectangleGeometry({
							rectangle : rectangles[i],
							extrudedHeight : heights[i]
						}),
						attributes : {
							color : Cesium.ColorGeometryInstanceAttribute.fromColor(colors[i])
						}
					}));
			}

			viewer.scene.primitives.add(new Cesium.Primitive({
					geometryInstances : primitiveCollection,
					appearance : new Cesium.PerInstanceColorAppearance()
				}));

			console.log("Done");
		});
	}

	this.heatmapGen = function () {
		var count = 0;
		var rectangles = [];
		var rectanglesFreq = [];
		//north/south
		for (var i = -180; i < 180; i += 5) {
			for (var j = -85; j < 85; j += 5) {
				rectangles[count] = new Cesium.Rectangle.fromDegrees(i, j, i + 5, j + 5);
				rectanglesFreq[count] = 0;
				/*viewer.entities.add({
				name : 'Green translucent, rotated, and extruded rectangle at height with outline',
				rectangle : {
				coordinates : Cesium.Rectangle.fromDegrees(i, j, i+1, j+1),
				material : Cesium.Color.GREEN.withAlpha(0.5),
				outline : true
				}
				});*/
				count++;
			}
		}
		console.log("Generated rectangles");

		var allDataSources = viewer.dataSources;
		console.log(allDataSources.length)
		var dataRectangles = [];
		for (var j = 0; j < allDataSources.length; j++) {
			var values = allDataSources.get(j).entities.values
				for (var i = 0; i < values.length; i++) {
					var position = viewer.scene.globe.ellipsoid.cartesianArrayToCartographicArray(values[i].polygon.hierarchy.getValue(viewer.clock.currentTime).positions);
					dataRectangles.push(Cesium.Rectangle.fromCartographicArray(position));
				}
		}

		console.log(dataRectangles)

		var centers = [];
		count = 0;
		for (var i = 0; i < dataRectangles.length; i++) {
			centers[i] = Cesium.Rectangle.center(dataRectangles[i]);
		}

		console.log(centers)

		for (var i = 0; i < rectangles.length; i++) {
			for (var j = 0; j < centers.length; j++) {
				if (Cesium.Rectangle.contains(rectangles[i], centers[j])) {
					rectanglesFreq[i]++;
				}
			}
			//console.log(rectanglesFreq[i])
		}

		var eventHandler = new Cesium.ScreenSpaceEventHandler();
		eventHandler.setInputAction(function () {
			viewer.dataSources.removeAll(true);
			kmlsLoaded = [];
			isLoaded = [false, false, false, false, false, false, false, false, false, false];
			visible = [false, false, false, false, false, false, false, false, false, false];
			eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

		eventHandler.setInputAction(function () {
			for (var i = 0; i < rectangles.length; i++) {
				if (rectanglesFreq[i] > 0) {
					viewer.entities.add({
						rectangle : {
							coordinates : rectangles[i],
							material : Cesium.Color.GREEN.withAlpha(0.5),
							outline : true,
							extrudedHeight : rectanglesFreq[i] * 100000
						}
					})
				}
			}
			var container = viewer.container;
			console.log(container);
			var screenOverlay = document.createElement('div');

			var headerStyle = document.createElement("H2");
			headerStyle.style.color = '#FFFFFF';
			headerStyle.style.fontSize = '150%';
			headerStyle.id = "header";
			headerStyle.appendChild(document.createTextNode("Approximate coverage percentage: "));
			headerStyle.appendChild(document.createElement("BR"));
			var bodyStyle = document.createElement("H2");
			bodyStyle.id = "body";
			bodyStyle.style.color = '#FFFFFF';
			bodyStyle.style.fontSize = '100%';

			bodyStyle.appendChild(document.createTextNode((coverage * 100) + "%"));
			bodyStyle.appendChild(document.createElement("BR"));

			screenOverlay.appendChild(headerStyle);
			screenOverlay.appendChild(bodyStyle);

			//style related things.
			screenOverlay.style.width = '25%';
			screenOverlay.style.position = 'absolute';
			screenOverlay.style.top = '0%';
			screenOverlay.style.left = '75%';
			screenOverlay.id = "screenOverlay";

			container.appendChild(screenOverlay);

			eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
		}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

		var coverage = 0;
		for (var i = 0; i < rectangles.length; i++) {
			if (rectanglesFreq[i] > 0)
				coverage++;
		}
		coverage = coverage / rectangles.length;
		console.log(coverage);
	}

	this.flyToPos = function (target, duration, callback) {
		console.log("Flying to position");
		if (Cesium.defined(target.cartographic)) {
			var latitude = target.cartographic.latitude;
			var longitude = target.cartographic.longitude;
			var altitude = target.cartographic.height;
		} else if (Cesium.defined(target.cartesian)) {
			var cartographicPoint = viewer.scene.globe.ellipsoid.cartesianToCartographic(target.cartesian);
			var latitude = cartographicPoint.latitude;
			var longitude = cartographicPoint.longitude;
			var altitude = cartographicPoint.height;
		} else if (Cesium.defined(target.entity)) {
			var cartographicArray = target.entity.entity.polygon.hierarchy.getValue(viewer.clock.currentTime).positions;
			console.log(cartographicArray);
			cartographicArray = viewer.scene.globe.ellipsoid.cartesianArrayToCartographicArray(cartographicArray);
			console.log(cartographicArray);
			var boundingRectangle = Cesium.Rectangle.fromCartographicArray(cartographicArray);
			console.log(boundingRectangle);
			var point = Cesium.Rectangle.center(boundingRectangle);
			console.log(point);
			var latitude = Cesium.Math.toDegrees(point.latitude);
			var longitude = Cesium.Math.toDegrees(point.longitude);
			var altitude = target.entity.height;

		}

		var initial = viewer.camera.position;
		var destination = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);
		var initialCartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(initial);

		var timeInitial = viewer.clock.currentTime;
		var timeMidpoint = Cesium.JulianDate.addSeconds(timeInitial, duration / 2, new Cesium.JulianDate());
		var timeDestination = Cesium.JulianDate.addSeconds(timeInitial, duration, new Cesium.JulianDate());
		console.log(timeMidpoint);

		console.log(Cesium.Math.toDegrees(initialCartographic.longitude));
		console.log(Cesium.Math.toDegrees(initialCartographic.latitude));
		//console.log(initialCartographic.height);
		var midAlt = initialCartographic.height + ((altitude - initialCartographic.height) / 2);
		//console.log(midAlt);
		var midpoint = new Cesium.SampledProperty(Number);
		midpoint.addSample(timeInitial, Cesium.Math.toDegrees(initialCartographic.longitude));
		midpoint.addSample(timeDestination, longitude);
		var midLong = midpoint.getValue(timeMidpoint);
		console.log(midLong);
		midpoint = new Cesium.SampledProperty(Number);
		midpoint.addSample(timeInitial, Cesium.Math.toDegrees(initialCartographic.latitude));
		midpoint.addSample(timeDestination, latitude);
		var midLat = midpoint.getValue(timeMidpoint);
		console.log(midLat);
		//var midpoint = Cesium.Cartographic.fromDegrees(midLong, midLat, midAlt);
		midpoint = Cesium.Cartesian3.fromDegrees(midLong, midLat, midAlt);

		var cameraPos = new Cesium.SampledPositionProperty();
		cameraPos.addSample(timeInitial, initial);
		cameraPos.addSample(timeMidpoint, midpoint);
		cameraPos.addSample(timeDestination, destination);
		viewer.clock.onTick.addEventListener(function (e) {
			//console.log("tick");
			if (Cesium.defined(cameraPos.getValue(viewer.clock.currentTime))) {
				viewer.camera.position = cameraPos.getValue(viewer.clock.currentTime);
				viewer.camera.direction = Cesium.Cartesian3.negate(viewer.camera.position, new Cesium.Cartesian3());
			} else {
				console.log(arguments.callee);
				viewer.clock.onTick.removeEventListener(arguments.callee);
				if (Cesium.defined(callback)) {
					callback();
				}
			}
		});

	}

	//entityProperties contains an entity and a position. Entity is used to find the position of the reference frame,
	//and the optional position Cartesian3 is used for the initial offset when tracking an entity.
	var viewEntity = function (entityProperties, duration, mode, callback) {
		console.log("in view entity");
		var point;
		var orientation;
		var flag = false;
		if (Cesium.defined(entityProperties.entity.position)) {
			point = entityProperties.entity.position;
			if (!Cesium.defined(entityProperties.entity.orientation)) {
				entityProperties.entity.orientation = Cesium.Quaternion.IDENTITY;
			}
		} else {
			var result = undefined;
			//finds the defined graphics property, converts positions array to cartographic, forms a rectangle around
			//the positions collection and creates a constant position property with the center point.
			for (var i = 0; i < 20; i++) {
				var entityType = entityProperties.entity.propertyNames[i];
				if (entityType = "polygon" && Cesium.defined(entityProperties.entity.polygon.hierarchy.getValue(viewer.clock.currentTime).positions)) {
					result = viewer.scene.globe.ellipsoid.cartesianArrayToCartographicArray(entityProperties.entity.polygon.hierarchy.getValue(viewer.clock.currentTime).positions);
					i = 20;
				} else if (Cesium.defined(entityProperties.entity[entityType].positions)) {
					result = viewer.scene.globe.ellipsoid.cartesianArrayToCartographicArray(entityProperties.entity[entityType].positions);
					i = 20;
				}
			}
			var boundingRectangle = Cesium.Rectangle.fromCartographicArray(result);
			var center = Cesium.Rectangle.center(boundingRectangle);
			console.log(center);
			point = new Cesium.ConstantPositionProperty(viewer.scene.globe.ellipsoid.cartographicToCartesian(center));
			entityProperties.entity.orientation = Cesium.Quaternion.IDENTITY;
		}
		if (mode == "view") {
			var lastCamera = {
				position : viewer.camera.position.clone(),
				direction : viewer.camera.direction.clone(),
				transform : viewer.camera.transform.clone()
			}
			var circularPositions = [new Cesium.Cartesian3(500, 0, 0), new Cesium.Cartesian3(0, 500, 0),
				new Cesium.Cartesian3(-500, 0, 0), new Cesium.Cartesian3(0, -500, 0),
				new Cesium.Cartesian3(500, 0, 0)];
			var increment = duration / 4;
			var cameraPos = new Cesium.SampledPositionProperty();
			var startTime = viewer.clock.currentTime.clone();
			for (var i = 0; i < 5; i++) {
				var time = Cesium.JulianDate.addSeconds(startTime, i * increment, new Cesium.JulianDate());
				cameraPos.addSample(time, circularPositions[i]);
			}
			cameraPos.setInterpolationOptions({
				interpolationDegree : 5,
				interpolationAlgorithm : Cesium.LagrangePolynomialApproximation
			});
			viewer.clock.multiplier = 1;
			var prim;
			viewer.clock.onTick.removeEventListener(view);
			viewer.clock.onTick.addEventListener(view);
		} else if (mode == "track") {
			tracking = true;
			var lastCamera = {
				position : viewer.camera.position.clone(),
				direction : viewer.camera.direction.clone(),
				transform : viewer.camera.transform.clone()
			}
			if (!Cesium.defined(entityProperties.position)) {
				var cameraPos = new Cesium.Cartesian3(12000, -12000, 12000);
			} else {
				var cameraPos = entityProperties.position;
			}
			var referencePoint = point.getValue(viewer.clock.currentTime);
			//var transform = Cesium.Transforms.eastNorthUpToFixedFrame(referencePoint);
			//viewer.camera.lookAtTransform(transform, cameraPos);
			//var prim;
			//viewer.clock.onTick.removeEventListener(track);
			viewer.clock.onTick.addEventListener(track);
		} else {
			console.log("Error");
		}

		function view(clock) {
			viewer.scene.primitives.remove(prim);
			if (cameraPos.getValue(clock.currentTime) == undefined) {
				if (Cesium.defined(callback)) {
					clock.multiplier = 0;
					console.log(viewer.camera.position);
					tracking = true;
					callback(viewer.camera.position.clone());
					viewer.clock.onTick.removeEventListener(arguments.callee);
					viewer.clock.onTick.addEventListener(track)
					//viewer.clock.onTick.removeEventListener(arguments.callee);
				} else if (!Cesium.defined(callback)) {
					console.log(lastCamera);
					viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
					viewer.camera.position = lastCamera.position;
					viewer.camera.direction = lastCamera.direction;
					viewer.clock.onTick.removeEventListener(arguments.callee);
				}
			} else {
				var referencePoint = point.getValue(clock.currentTime);
				//cameraPos = Cesium.Cartesian3.clone(viewer.camera.position);
				//cameraPos = viewer.camera.position;
				//console.log(cameraPos);
				//var offset = Cesium.Cartesian3.subtract(cameraPos, referencePoint, new Cesium.Cartesian3());
				transform = Cesium.Transforms.eastNorthUpToFixedFrame(referencePoint, new Cesium.Ellipsoid(500, 500, 500));
				prim = viewer.scene.primitives.add(new Cesium.DebugModelMatrixPrimitive({
							modelMatrix : transform,
							length : 100000.0
						}));
				viewer.camera.lookAtTransform(transform, cameraPos.getValue(clock.currentTime));
			}
		}

		function track(clock) {
			viewer.scene.primitives.remove(prim);
			/*referencePoint = point.getValue(clock.currentTime);
			cameraPos = Cesium.Cartesian3.clone(viewer.camera.position);
			//console.log(cameraPos);
			//console.log(referenceCamera.position);
			transform = Cesium.Transforms.eastNorthUpToFixedFrame(referencePoint, new Cesium.Ellipsoid(500, 500, 500));
			referenceCamera.lookAtTransform(transform, cameraPos);
			viewer.camera.lookAtTransform(transform, cameraPos);*/
			transform = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
					point.getValue(clock.currentTime),
					entityProperties.entity.orientation.getValue(clock.currentTime),
					new Cesium.Cartesian3(1, 1, 1),
					new Cesium.Matrix4());
			cameraPos = Cesium.Cartesian3.clone(viewer.camera.position);
			viewer.camera.lookAtTransform(transform, cameraPos);
			prim = viewer.scene.primitives.add(new Cesium.DebugModelMatrixPrimitive({
						modelMatrix : transform,
						length : 1000000.0
					}));
			if (!tracking) {
				if (Cesium.defined(callback)) {
					callback(viewer.camera.position.clone());
					viewer.clock.onTick.removeEventListener(arguments.callee);
				} else if (!Cesium.defined(callback)) {
					console.log("Undo");
					console.log(lastCamera);
					viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
					viewer.camera.position = lastCamera.position;
					viewer.camera.direction = lastCamera.direction;
					viewer.clock.onTick.removeEventListener(arguments.callee);
				}
			}
		}

	}

	var detectDrawType = function (dataSource) {
		console.log("Detecting draw type");
		for (var i = 0; i < 20; i++) {
			var value = dataSource.entities.values[0].propertyNames[i];
			if (typeof dataSource.entities.values[0][value] !== "undefined" && dataSource.entities.values[0][value].hasOwnProperty('_material')) {
				console.log("Detected draw type: " + value);
				return value;
			}
		}
	}

	var changeColor = function (dataSource, Style) {
		var length = dataSource.entities.values.length;
		var entitiesList = dataSource.entities;
		var color;
		//console.log(viewer.scene.globe.ellipsoid.cartesianToCartographic(entitiesList.getById(entitiesList.values[0].id)._polygon.hierarchy._value.positions[0]));
		for (var i = 0; i < length; i++) {
			var style = entitiesList.getById(entitiesList.values[i].id)[drawType].material._color._value.toRgba();

			//console.log(style);
			if (DayStyles.indexOf(style) !== -1) {
				//console.log("Day");
				color = Cesium.Color.fromRgba(DayStyles[Style]);
			} else {
				//console.log("Night");
				color = Cesium.Color.fromRgba(NightStyles[Style]);
			}
			//console.log(color);
			entitiesList.getById(entitiesList.values[i].id)[drawType].outlineColor = color;
			entitiesList.getById(entitiesList.values[i].id)[drawType].material = color;
		}
	};

	var updateOverlay = function () {
		var bodyStyle = document.getElementById("body");
		while (bodyStyle.firstChild) {
			bodyStyle.removeChild(bodyStyle.firstChild);
		}
		console.log(bodyStyle);

		for (var i = 0; i < isLoaded.length; i++) {
			if (isLoaded[i]) {
				var sourceName = kmlsLoaded[i].entities.values[0].name;
				bodyStyle.appendChild(document.createTextNode(sourceName));
				bodyStyle.appendChild(document.createElement("BR"));
			}
		}

	}

	//moves the camera position smoothly through its defined reference frame
	//creates a sampled position property containing the beginning point, ending point,
	//and a midpoint to make for a smoother flight.
	var moveCamera = function (point, duration, callback) {
		var cameraPath = new Cesium.SampledPositionProperty();
		var flightTimes = [viewer.clock.currentTime.clone(), Cesium.JulianDate.addSeconds(viewer.clock.currentTime, duration / 2, new Cesium.JulianDate()),
			Cesium.JulianDate.addSeconds(viewer.clock.currentTime, duration, new Cesium.JulianDate())];
		if (Cesium.defined(point.cartesian)) {
			console.log(viewer.camera.position);
			cameraPath.addSample(flightTimes[0], viewer.camera.position.clone());
			var midpoint = Cesium.Cartesian3.subtract(point.cartesian, viewer.camera.position.clone(), new Cesium.Cartesian3());
			Cesium.Cartesian3.divideByScalar(midpoint, 10, midpoint);
			cameraPath.addSample(flightTimes[1], midpoint);
			cameraPath.addSample(flightTimes[2], point.cartesian);
		} else if (Cesium.defined(point.cartographic)) {
			cameraPath.addSample(flightTimes[0], viewer.camera.position.clone());
			cameraPath.addSample(flightTimes[2], viewer.scene.globe.ellipsoid.cartographicToCartesian(point.cartographic))
		} else {
			console.log("error");
			return;
		}
		var prevMultiplier = viewer.clock.multiplier;
		viewer.clock.multiplier = 1;
		console.log("Moving camera");
		console.log(cameraPath);
		viewer.clock.onTick.addEventListener(function (clock) {
			if (!Cesium.defined(cameraPath.getValue(clock.currentTime))) {
				console.log("Completed movement")
				viewer.clock.onTick.removeEventListener(arguments.callee);
				viewer.clock.multiplier = prevMultiplier;
				if (Cesium.defined(callback)) {
					callback();
				}
			} else {
				viewer.camera.position = cameraPath.getValue(clock.currentTime);
			}
		});
	}

	var toggleShow = function (dataSource, value) {
		for (var i = 0; i < dataSource.entities.values.length; i++) {
			dataSource.entities.getById(dataSource.entities.values[i].id).show = value;
		}
	}

	//If point is undefined, it will default to the default view with the globe as the central object.
	//Will keep the same global camera position.
	var changeCameraReferenceFrame = function (origin) {}
};
