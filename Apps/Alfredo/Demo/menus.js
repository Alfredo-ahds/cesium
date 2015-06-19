(function () {
	"use strict";
	/*jshint validthis:true, loopfunc:true*/
    /*global Cesium, cesiumFunctions, console */

	var activeSourceNumber = 0;
	var activeStyleNumber = 0;
	var numberOfCesiumInstances = 0;
	var activeGlobe = 0;
	var cesiumInstances = [];
	var lastPosition;
	var trigger;
	var options;

	window.menus = {
		returnViewer : function () {
			return cesiumInstances[0];
		},
		test : function () {
			console.log("Called script");
		},
		addAll : function (toolbarId) {
			var toolbar = document.getElementById(toolbarId);

			console.log("Adding menu items.");

			var options = function () {
				showAppearance(toolbar);
			};
			addButton("Appearance", options, toolbar);

			options = function () {
				showCam(toolbar);
			};
			addButton("Camera control", options, toolbar);
			console.log("Done");

			options = function () {
				showOverlays(toolbar);
			};
			addButton("Overlays", options, toolbar);
			console.log("Done");
			toolbar.appendChild(document.createElement("BR"));
		}
	};

	function showOverlays(toolbar) {
		while (toolbar.childNodes[9]) {
			toolbar.removeChild(toolbar.childNodes[9]);
		}

		var options = [{
				text : '0',
				onselect : function () {
					activeGlobe = 0;
					console.log("Picked globe: " + activeGlobe);
				}
			}
		];
		addSelectionBar("Globe: ", toolbar, options, activeGlobe);
		updateGlobePicker();

		options = function () {
			cesiumInstances[activeGlobe].screenOverlay();
		};
		addButton("Screen overlay", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].toggleOverlays();
		};
		addButton("Toggle overlays", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].dataVisualization();
		};
		addButton("Static 3D data", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].timeDynamicData();
		};
		addButton("Time dynamic 3D data", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].heatmapGen();
		};
		addButton("Heatmap example", options, toolbar);
	}

	function showCam(toolbar) {
		while (toolbar.childNodes[9]) {
			toolbar.removeChild(toolbar.childNodes[9]);
		}

		var options = [{
				text : '0',
				onselect : function () {
					activeGlobe = 0;
					console.log("Picked globe: " + activeGlobe);
				}
			}
		];
		addSelectionBar("Globe: ", toolbar, options, activeGlobe);
		updateGlobePicker();

		//Source#, Entity#
		addTextField("Source#", "flyToSource", "0", toolbar);
		addTextField("Entity#", "flyToEntity", "0", toolbar);
		options = function () {
			cesiumInstances[activeGlobe].flyToEntity("flyToSource", "flyToEntity");
		};
		addButton("Fly to entity", options, toolbar);

		//Lat Long Alt, Pitch, Head, Roll
		addTextField("Lat", "flyToLat", "0", toolbar);
		addTextField("Long", "flyToLong", "0", toolbar);
		addTextField("Alt", "flyToAlt", "2500000", toolbar);
		options = function () {
			cesiumInstances[activeGlobe].flyToPos({
				cartographic : {
					latitude : document.getElementById("flyToLat").value,
					longitude : document.getElementById("flyToLong").value,
					height : document.getElementById("flyToAlt").value
				}
			}, 4);
		};
		addButton("Fly to Position", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].tour();
		};
		addButton("Camera control tour", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].improvedTour();
		};
		addButton("Improved tour", options, toolbar);
	}

	function showAppearance(toolbar) {
		while (toolbar.childNodes[9]) {
			toolbar.removeChild(toolbar.childNodes[9]);
		}

		var options = function () {
			var parent = document.getElementById('Cesium');
			console.log(parent);
			var child = document.createElement('div');
			child.id = numberOfCesiumInstances;
			child.className = "container";
			console.log(child);
			parent.appendChild(child);
			cesiumInstances[numberOfCesiumInstances] = new cesiumFunctions(child.id);
			numberOfCesiumInstances++;
			updateGlobePicker();
			var percentOfDisplay = (100 / numberOfCesiumInstances);
			for (var i = 0; i < document.getElementById("Cesium").children.length; i++) {
				console.log("Modifying child " + i);
				console.log(parent.children[i].style.width = percentOfDisplay + "%");
				console.log(parent.children[i].style.left = (parent.children[i].id * percentOfDisplay) + "%");
			}
			console.log(cesiumInstances[activeGlobe]);
		};
		addButton("Start Cesium Instance", options, toolbar);

		options = function () {
			var parent = document.getElementById('Cesium');
			var toRemove = document.getElementById((numberOfCesiumInstances - 1));
			console.log(toRemove);
			toRemove.parentNode.removeChild(toRemove);
			numberOfCesiumInstances--;
			var percentOfDisplay = (100 / numberOfCesiumInstances);
			for (var i = 0; i < document.getElementById("Cesium").children.length; i++) {
				console.log("Modifying child " + i);
				console.log(parent.children[i].style.width = percentOfDisplay + "%");
				console.log(parent.children[i].style.left = (parent.children[i].id * percentOfDisplay) + "%");
			}
			updateGlobePicker();
		};
		addButton("Remove Cesium Instance", options, toolbar);

		options = function () {
			toggleSync();
		};
		addCheckBox("Sync Globes", toolbar, options);
		//document.getElementById("Sync Globes").addEventListener("change", toggleSync);

		options = [{
				text : '0',
				onselect : function () {
					activeGlobe = 0;
					console.log("Picked globe: " + activeGlobe);
				}
			}
		];
		addSelectionBar("Globe: ", toolbar, options, activeGlobe);
		updateGlobePicker();

		options = [];
		for (var i = 0; i < 10; i++) {
			options[i] = {
				text : i,
				onselect : function () {
					activeSourceNumber = this.text;
					console.log("Current active source: " + activeSourceNumber);
				}
			};
		}
		addSelectionBar("Source:  ", toolbar, options);

		options = [];
		for (var styleIndex = 0; styleIndex < 5; styleIndex++) {
			options[styleIndex] = {
				text : "Style " + (styleIndex + 1),
				index : styleIndex,
				onselect : function () {
					activeStyleNumber = this.index;
					console.log("Current active style: " + (activeStyleNumber + 1));
					cesiumInstances[activeGlobe].changeStyle(activeSourceNumber, activeStyleNumber);
				}
			};
		}
		addSelectionBar("Style: ", toolbar, options);

		options = function () {
			cesiumInstances[activeGlobe].toggleEnable(activeSourceNumber);
		};
		addButton("Toggle enable for selected source", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].manageSources(activeSourceNumber, function () {
				console.log("Done");
			});
		};
		addButton("Load or unload selected source", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].drawRectangle();
		};
		addButton("Draw rectangle", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].drawPolygon();
		};
		addButton("Draw polygon", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].clearGlobe();
		};
		addButton("Remove all drawn objects", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].toggleMode();
		};
		addButton("Toggle mode", options, toolbar);

		options = function () {
			cesiumInstances[activeGlobe].generateAnimation(activeSourceNumber);
		};
		addButton("Animation example", options, toolbar);

	}

	//Synchronizes all displayed globes to the current position.
	function syncScenes(scene) {
		var position = scene.camera.position.clone();
		if (!Cesium.Cartesian3.equalsEpsilon(lastPosition, position, Cesium.Math.EPSILON4)) {
			for (var i = 0; i < cesiumInstances.length; i++) {
				cesiumInstances[i].returnScene().camera.setView({
					position : scene.camera.position.clone(),
					heading : scene.camera.heading,
					pitch : scene.camera.pitch,
					roll : scene.camera.roll
				});
			}
		}
		lastPosition = position.clone();
	}

	//Adds or removes event listeners depending on the value of a checkbox.
	function toggleSync() {
		console.log("Toggle sync");
		console.log(cesiumInstances.length);
		var value = document.getElementById("Sync Globes").checked;
		if (value) {
			for (var i = 0; i < cesiumInstances.length; i++) {
				lastPosition = cesiumInstances[i].returnScene().camera.position.clone();
				cesiumInstances[i].returnScene().preRender.addEventListener(syncScenes);
			}
		} else {
			for (var cesiumInstancesIndex = 0; cesiumInstancesIndex < cesiumInstances.length; cesiumInstancesIndex++) {
				cesiumInstances[cesiumInstancesIndex].returnScene().preRender.removeEventListener(syncScenes);
			}
		}
	}

	//When a new cesium instance is added, update the globe dropdown box.
	function updateGlobePicker() {
		var options = [];
		for (var i = 0; i < numberOfCesiumInstances; i++) {
			options[i] = {
				text : i,
				onselect : function () {
					activeGlobe = this.text;
					console.log("Current globe : " + activeGlobe);
				}
			};
		}

		var menu = document.createElement('select');
		menu.id = "Globe: ";
		menu.onchange = function () {
			var item = options[menu.selectedIndex];
			if (item && typeof item.onselect === 'function') {
				item.onselect();
			}
		};

		for (var optionsIndex = 0, len = options.length; optionsIndex < len; ++optionsIndex) {
			var option = document.createElement('option');
			option.textContent = options[optionsIndex].text;
			menu.appendChild(option);
		}

		menu.selectedIndex = activeGlobe;

		console.log(document.getElementById("toolbar").replaceChild(menu, document.getElementById("Globe: ")));

	}

	//Adds a checkbox input field.
	function addCheckBox(divId, toolbar, options) {
		var checkbox = document.createElement('input');
		checkbox.type = "checkbox";
		checkbox.id = divId;
		checkbox.onclick = options;

		toolbar.appendChild(document.createTextNode(divId + ":"));
		toolbar.appendChild(checkbox);
		toolbar.appendChild(document.createElement("BR"));
	}

	//Adds an input text field of the format: use : field.
	function addTextField(label, divId, initialVal, toolbar) {
		var textField = document.createElement('input');
		textField.id = divId;
		textField.setAttribute('type', 'text');
		textField.setAttribute('value', initialVal);
		textField.style.width = "50px";
		toolbar.appendChild(document.createTextNode(label + ": "));
		toolbar.appendChild(textField);
		toolbar.appendChild(document.createElement("BR"));
	}

	//adds a menu bar with the label use and options 'options[]'
	function addSelectionBar(use, toolbar, options, initial) {
		var menu = document.createElement('select');
		menu.id = use;
		menu.onchange = function () {
			var item = options[menu.selectedIndex];
			if (item && typeof item.onselect === 'function') {
				item.onselect();
			}
		};

		//Format: use: toolbar \n
		toolbar.appendChild(document.createTextNode(use));
		toolbar.appendChild(menu);
		toolbar.appendChild(document.createElement("BR"));

		for (var i = 0, len = options.length; i < len; ++i) {
			var option = document.createElement('option');
			option.textContent = options[i].text;
			menu.appendChild(option);
		}

	}

	//adds a clickable button with the label 'use', function 'onclick'
	function addButton(use, onclick, toolbar) {
		var button = document.createElement('button');
		button.type = 'button';
		button.onclick = onclick;
		button.textContent = use;
		toolbar.appendChild(button);
		toolbar.appendChild(document.createElement("BR"));
	}

}());
