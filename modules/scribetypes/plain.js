/*\
title: $:/plugins/rimir/scribe/modules/scribetypes/plain.js
type: application/javascript
module-type: scribetype

text/plain — values pass through as strings.

\*/

"use strict";

exports.name = "text/plain";

exports.fromField = function(value) {
	if (value === undefined || value === null) return "";
	return String(value);
};

exports.toField = function(text) {
	return text;
};
