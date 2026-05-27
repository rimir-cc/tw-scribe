/*\
title: $:/plugins/rimir/scribe/modules/scribetypes/string-array.js
type: application/javascript
module-type: scribetype

application/x-string-array — TW list-format text in state (entries with spaces are
wrapped with [[...]]), JSON array of strings as field value. Useful for editing
list-like properties (e.g. constraints, options, ref-types) inline.

In sub-path mode, the JSON value at the path is the array; fromField formats via
$tw.utils.stringifyList (preserves space-containing entries), toField parses via
$tw.utils.parseStringArray (respects [[...]] quoting).

In whole-field mode, the field text holds the JSON array literal; fromField parses
and formats, toField returns the array.

\*/

"use strict";

exports.name = "application/x-string-array";

exports.fromField = function(value) {
	if (value === undefined || value === null || value === "") return "";
	if (Array.isArray(value)) {
		return $tw.utils.stringifyList(value);
	}
	if (typeof value === "string") {
		// Could be JSON-encoded array text (whole-field) or just a string.
		try {
			var parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return $tw.utils.stringifyList(parsed);
		} catch (e) {
			// fall through
		}
		return value;
	}
	return String(value);
};

exports.toField = function(text) {
	if (!text || !text.trim()) return [];
	return $tw.utils.parseStringArray(text);
};
