/*\
title: $:/plugins/rimir/scribe/modules/scribetypes/json.js
type: application/javascript
module-type: scribetype

application/json — pretty-print for state body, parsed JSON value for field/sub-path.

If used in whole-field mode the value is the field text (a JSON string). fromField
re-pretty-prints it; toField parses to compact for storage.

If used in sub-path mode the value is the parsed JS value at the path (string, number,
array, object). fromField stringifies pretty; toField parses back.

\*/

"use strict";

exports.name = "application/json";

exports.fromField = function(value) {
	if (value === undefined || value === null) return "";
	var spaces = ($tw.config.preferences && $tw.config.preferences.jsonSpaces) || 4;
	if (typeof value === "string") {
		// Could be a JSON-text or just a string. Try to parse and pretty-print.
		try {
			return JSON.stringify(JSON.parse(value), null, spaces);
		} catch (e) {
			return value;
		}
	}
	return JSON.stringify(value, null, spaces);
};

exports.toField = function(text) {
	if (!text || !text.trim()) return undefined;
	try {
		return JSON.parse(text);
	} catch (e) {
		return text;
	}
};
