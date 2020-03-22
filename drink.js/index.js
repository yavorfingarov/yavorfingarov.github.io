"use strict";

function q(query) {
	let tokens = query.split(" ");
	if (tokens.every(t => !t.includes(",")) && tokens[tokens.length - 1][0] === "#") {
		return document.querySelector(query);
	} else {
		return document.querySelectorAll(query);
	}
}

function hide(element) {
	if (element) {
		element.style.display = "none";
	}
}

function show(element) {
	if (element) {
		element.style.display = "block";
	}
}

function getProxy(storage, defaults) {
	let proxy = new Proxy({}, {
		get(target, prop) {
			if (!storage.getItem(prop) && prop in defaults) {
				state[prop] = defaults[prop];
			}
			let value = JSON.parse(storage.getItem(prop));
			if (typeof value === "string") {
				let date = new Date(value);
				value = (date.getTime() === date.getTime()) ? date : value;
			}
			return value;
		},
		set(target, prop, val) {
			storage.setItem(prop, JSON.stringify(val));
			return true;
		},
	});
	return proxy;
}

function saveSettings() {
	let button = q("#saveButton");
	if (checkForInvalidValues()) {
		button.disabled = true;
	} else {
		if (button.textContent !== "Save anyway" && isGoalOutOfBounds()) {
			button.className = "button is-warning";
			button.textContent = "Save anyway";
		} else {
			q(constants.formItemsQuery).forEach(element => {
				if (element.id === "units" && state[element.id] !== element.value) {
					state.progress = state.progress.map(x => convertTo(x, element.value));
				}
				state[element.id] = (element.type === "number") ? Math.round(Number(element.value)) :
					(element.type === "checkbox") ? Boolean(element.checked) : element.value;
			});
			updateProgress();
			closeSettings();
		}
	}
}

function checkForInvalidValues() {
	let result = false;
	for (let element of q(constants.formItemsQuery)) {
		if (element.type === "number") {
			let val = Number(element.value);
			if (Number.isNaN(val) || val < element.min) {
				element.classList.add("is-danger");
				show(q("#" + element.id + "Error"));
				result = true;
			}
		}
	}
	return result;
}

function isGoalOutOfBounds() {
	let element = q("#goalVolume");
	let goal = Number(element.value);
	let warning;
	if (q("#units").value === "ml") {
		if (goal < constants.goalMlTooLow) {
			warning = "TooLow";
		} else if (goal > constants.goalMlTooHigh) {
			warning = "TooHigh";
		}
	} else {
		if (goal < constants.goalFlOzTooLow) {
			warning = "TooLow";
		} else if (goal > constants.goalFlOzTooHigh) {
			warning = "TooHigh";
		}
	}
	if (warning) {
		element.classList.add("is-warning");
		show(q("#goalVolumeWarning" + warning));
	}
	return warning;
}

function fieldChange() {
	this.parentElement.childNodes.forEach(element => {
		if (element.classList && element.classList.contains("help")) {
			hide(element);
		}
	});
	if (this.id === "units") {
		unitChange(this);
	} else {
		if (this.classList.contains("input")) {
			this.className = "input";
		}
		if (isAllHelpHidden()) {
			resetSaveButton();
		}
	}
}

function resetSaveButton() {
	let button = q("#saveButton");
	button.className = "button is-success";
	button.textContent = "Save changes";
	button.disabled = false;
}

function unitChange(selectElement) {
	let idsToUpdate = ["glassVolume", "bottleVolume", "goalVolume"];
	if (selectElement.value === "ml") {
		show(q("#showLiters").parentElement.parentElement);
	} else {
		hide(q("#showLiters").parentElement.parentElement);
	}
	for (let id of idsToUpdate) {
		let element = q("#" + id);
		if (selectElement.value === "ml" && state.units !== "ml") {
			element.value = convertTo(q("#" + id).value, "ml");
		} else if (selectElement.value === "fl oz" && state.units !== "fl oz") {
			element.value = convertTo(q("#" + id).value, "fl oz");
		} else {
			element.value = state[id];
		}
	}
}

function convertTo(val, targetUnits) {
	let result;
	if (targetUnits === "ml") {
		result = Math.round(val * constants.mlInOneFlOz);
	} else if (targetUnits === "fl oz") {
		result = Math.round(val / constants.mlInOneFlOz);
	} else if (targetUnits === "l") {
		result = Math.round(val / 10) / 100;
	}
	return result;
}

function isAllHelpHidden() {
	let result = true;
	q("#settings .help").forEach(element => {
		if (element.style.display && element.style.display !== "none") {
			result = false;
		}
	});
	return result;
}

function showSettings() {
	q("#settings").classList.add("is-active");
	q(constants.formItemsQuery).forEach(element => {
		if (element.type === "checkbox") {
			element.checked = state[element.id];
		} else {
			element.value = state[element.id];
		}
		if (element.id === "showLiters") {
			if (state.units === "ml") {
				show(element.parentElement.parentElement);
			} else {
				hide(element.parentElement.parentElement);
			}
		}
	});
}

function closeSettings() {
	q("#settings").classList.remove("is-active");
	resetSaveButton();
	q("#settings .help").forEach(element => hide(element));
	q("#settings .input").forEach(element => element.className = "input");
}

function drink() {
	let progress = state.progress;
	progress.push(state[this.value + "Volume"]);
	state.progress = progress;
	updateProgress();
}

function undoDrink() {
	let progress = state.progress;
	progress.pop();
	state.progress = progress;
	updateProgress();
}

function updateProgress() {
	let now = new Date();
	if (now > state.resetTime) {
		state.progress = [];
		state.resetTime = getNextResetTime(now);
	}
	let current = state.progress.reduce((acc, cur) => acc + cur, 0);
	let bar = q("#progressBar");
	bar.max = state.goalVolume;
	bar.value = current;
	q("#goal").textContent = (state.showLiters && state.units === "ml") ?
		convertTo(state.goalVolume, "l").toFixed(2) : state.goalVolume;
	q("#current").textContent = (state.showLiters && state.units === "ml") ?
		convertTo(current, "l").toFixed(2) : current;
	q("#unitName").textContent = (state.showLiters && state.units === "ml") ?
		state.units.slice(1) : state.units;
	q("#undoButton").disabled = (state.progress.length === 0);
	if (current >= state.goalVolume) {
		q("#smiley").textContent = getNextSmiley();
	} else {
		q("#smiley").textContent = null;
	}
}

function getNextSmiley() {
	let index = state.lastSmiley;
	while (index === state.lastSmiley) {
		index = Math.floor(Math.random() * constants.smileys.length);
	}
	state.lastSmiley = index;
	return constants.smileys[index];
}

function getNextResetTime(now) {
	let result = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	result.setHours(constants.resetHour);
	if (now > result) {
		result.setDate(result.getDate() + 1);
	}
	return result;
}

function attachEventHandlers() {
	q("#settingsButton").addEventListener("click", showSettings);
	q("#saveButton").addEventListener("click", saveSettings);
	q("#cancelButton").addEventListener("click", closeSettings);
	q(constants.formItemsQuery).forEach(element => element.addEventListener("input", fieldChange));
	q("#drinkButtons .button").forEach(element => element.addEventListener("click", drink));
	q("#undoButton").addEventListener("click", undoDrink);
	
	if("serviceWorker" in navigator) {
		navigator.serviceWorker.register("serviceWorker.js");
	}
	window.addEventListener("beforeinstallprompt", (event) => {
		event.preventDefault();
		let deferredPrompt = event;
		//let button = q("#addToDesktopButton");
		//show(button);
		button.addEventListener("click", (e) => {
			//hide(button);
			deferredPrompt.prompt();
			deferredPrompt.userChoice.then(() => deferredPrompt = null);
		});
	});
}

function init() {
	attachEventHandlers();
	updateProgress();
	setInterval(updateProgress, constants.updateInterval);
}

let constants = {
	updateInterval: 60 * 1000,
	resetHour: 3,
	mlInOneFlOz: 29.57353,
	goalMlTooHigh: 5000,
	goalMlTooLow: 2000,
	goalFlOzTooHigh: 170,
	goalFlOzTooLow: 68,
	formItemsQuery: "#units, #showLiters, #glassVolume, #bottleVolume, #goalVolume",
	smileys: ["🙂", "😎", "😋", "😊", "🍾", "👍"],
};

let state = getProxy(localStorage, {
	units: "ml",
	showLiters: true,
	glassVolume: 300,
	bottleVolume: 500,
	goalVolume: 2500,
	progress: [],
	resetTime: getNextResetTime(new Date()),
});

init();
