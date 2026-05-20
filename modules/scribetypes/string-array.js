/*\
title: $:/plugins/rimir/scribe/modules/scribetypes/string-array.js
type: application/javascript
module-type: scribetype

application/x-string-array — space-separated text in state, JSON array of strings as
field value. Useful for editing list-like properties (e.g. constraints, options,
ref-types) inline without quoting.

In sub-path mode, the JSON value at the path is the array; fromField joins by single
space, toField splits by whitespace.

In whole-field mode, the field text holds the JSON array literal; fromField parses
and joins, toField returns the array.

\*/

"use strict";

exports.name = "application/x-string-array";

exports.fromField = function(value) {
	if (value === undefined || value === null || value === "") return "";
	if (Array.isArray(value)) {
		return value.join(" ");
	}
	if (typeof value === "string") {
		// Could be JSON-encoded array text (whole-field) or just a string.
		try {
			var parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return parsed.join(" ");
		} catch (e) {
			// fall through
		}
		return value;
	}
	return String(value);
};

exports.toField = function(text) {
	if (!text || !text.trim()) return [];
	return text.trim().split(/\s+/);
};
