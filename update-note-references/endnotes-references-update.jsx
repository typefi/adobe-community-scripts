
(function () {
	
	var startNumber;
	var n;
	var noterefs;
	
	// Record the Find/Change dialog settings so that we can restore them
	var userDefaults = {
		preferences: app.findGrepPreferences.properties,
		options: app.findChangeGrepOptions.properties
	}

	// Get the document's start number from the user.
	// Prefill the field with the document's first note number
	
	function getStartNumber (startNum) {
		var w = new Window ('dialog {text: "Renumber endnote references", properties: {closeButton: false}}');
			w.panel = w.add ('panel {orientation: "row"}');
				w.panel.add ('staticText {text: "Start number:"}');
				w.startNumber = w.panel.add ('editText {characters: 5}');
				w.startNumber.text = startNum;
			w.buttons = w.add ('group');
				w.buttons.add ('button {text: "OK"}');
				w.buttons.add ('button {text: "Cancel"}');
			w.startNumber.active = true;
		if (w.show() == 2) {
			return null;
		}
		if (isNaN (w.startNumber.text)) {
			alert ('Please enter a whole number');
			return null;
		}
		return Number (w.startNumber.text);
	}

	// Look for any and all numbers in the endnote reference style
	// and renumber them
	app.findGrepPreferences = app.findChangeGrepOptions = null;
	app.findGrepPreferences.findWhat = '\\d+';
	app.findGrepPreferences.appliedCharacterStyle = app.documents[0].endnoteOptions.endnoteMarkerStyle;
	var noterefs = app.documents[0].findGrep();
	if (noterefs.length === 0) {
		alert ('The document contains no endnote references');
	} else {
		startNumber = getStartNumber (noterefs[0].contents);
		if (startNumber) {
			for (var n = noterefs.length-1; n >= 0; n--) {
				noterefs[n].contents = String (startNumber + n);
			}
		}
	}
	// Restore the Find/Change dialog's settings
	app.findGrepPreferences.properties = userDefaults.preferences;
	app.findChangeGrepOptions.properties = userDefaults.options;

}());