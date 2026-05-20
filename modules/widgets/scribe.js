/*\
title: $:/plugins/rimir/scribe/modules/widgets/scribe.js
type: application/javascript
module-type: widget

The <$scribe> widget — bidirectional sync of a tiddler field (or a sub-path inside a
JSON-encoded field) with a state tiddler.

Attributes:
  tiddler  — target tiddler (defaults to currentTiddler)
  field    — target field (defaults to "text")
  path     — optional comma-separated JSON sub-path, e.g. "0,caption" or "items,3,name"
  type     — scribetype handler name (defaults to "text/plain")
  state    — explicit state tiddler title (else auto-computed)

Inside the wrapped content, <<state>> is bound to the state tiddler title. Input widgets
bound to it (e.g. <$edit-text tiddler=<<state>> field="text"/>) get round-tripped to the
target via the type handler.

Pattern inspired by Flibbles' FieldTranscriberWidget in tw5-graph
(https://github.com/flibbles/tw5-graph). Independent reimplementation that adds the
`path` attribute for sub-path syncing inside JSON-encoded fields.

\*/

"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var ScribeWidget = function(parseTreeNode, options) {
	this.initialise(parseTreeNode, options);
};

ScribeWidget.prototype = new Widget();

ScribeWidget.prototype.render = function(parent, nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();
	this.renderChildren(parent, nextSibling);
};

ScribeWidget.prototype.execute = function() {
	this.scribeTiddler = this.getAttribute("tiddler") || this.getVariable("currentTiddler");
	this.scribeField = this.getAttribute("field", "text");
	this.scribePath = this.getAttribute("path", "");
	this.scribeType = this.getAttribute("type", "text/plain");
	this.scribeState = this.getAttribute("state") || this.computeDefaultState();

	var handlers = $tw.modules.getModulesByTypeAsHashmap("scribetype");
	if (!handlers[this.scribeType]) {
		this.scribeType = "text/plain";
	}
	this.transcriber = handlers[this.scribeType];

	this.setVariable("state", this.scribeState);
	this.prepState();
	this.makeChildWidgets();
};

ScribeWidget.prototype.computeDefaultState = function() {
	var pathSegment = this.scribePath ? encodeURIComponent(this.scribePath) : "_";
	return "$:/temp/rimir/scribe/" +
		encodeURIComponent(this.scribeField) + "/" +
		pathSegment + "/" +
		this.scribeTiddler;
};

ScribeWidget.prototype.refresh = function(changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if ($tw.utils.count(changedAttributes) > 0) {
		this.refreshSelf();
		return true;
	}
	if (changedTiddlers[this.scribeState]) {
		var state = this.wiki.getTiddler(this.scribeState);
		var stateText = state ? state.getFieldString("text") : "";
		if (this.stateText !== stateText) {
			this.writeFromState(stateText);
			this.stateText = stateText;
		}
	}
	if (changedTiddlers[this.scribeTiddler]) {
		this.prepState();
	}
	return this.refreshChildren(changedTiddlers);
};

/**
 * Read the current value the state should reflect.
 * - No path: full field text (string or undefined).
 * - With path: the JSON-decoded value at that path (could be string, number, array, object).
 */
ScribeWidget.prototype.readCurrentValue = function() {
	var tiddler = this.wiki.getTiddler(this.scribeTiddler);
	if (!tiddler) return undefined;
	var fieldText = tiddler.fields[this.scribeField];
	if (fieldText === undefined) return undefined;
	if (!this.scribePath) return fieldText;
	// Walk the sub-path inside the JSON
	try {
		var parsed = JSON.parse(fieldText);
		var pathParts = this.scribePath.split(",");
		var node = parsed;
		for (var i = 0; i < pathParts.length; i++) {
			if (node === null || node === undefined) return undefined;
			node = node[pathParts[i]];
		}
		return node;
	} catch (e) {
		return undefined;
	}
};

/**
 * Compute state body text from the current value via the type handler's fromField.
 */
ScribeWidget.prototype.prepState = function() {
	var value = this.readCurrentValue();
	if (this.lastValue !== undefined && deepEqual(this.lastValue, value)) {
		// nothing changed; don't disturb state
		return;
	}
	this.lastValue = value;
	if (value === undefined) {
		// Don't delete state tiddlers we don't own; just clear text
		var existing = this.wiki.getTiddler(this.scribeState);
		if (existing) {
			this.wiki.setText(this.scribeState, "text", null, "");
		}
		this.stateText = "";
		return;
	}
	this.stateText = this.transcriber.fromField(value);
	this.wiki.addTiddler({
		title: this.scribeState,
		text: this.stateText,
		type: this.scribeType
	});
};

/**
 * Write state text back into the target field (or sub-path).
 */
ScribeWidget.prototype.writeFromState = function(stateText) {
	var newValue = this.transcriber.toField(stateText);
	if (!this.scribePath) {
		// Whole-field mode: serialize value to text
		var fieldText;
		if (newValue === undefined || newValue === null) {
			fieldText = "";
		} else if (typeof newValue === "string") {
			fieldText = newValue;
		} else {
			fieldText = JSON.stringify(newValue);
		}
		this.wiki.setText(this.scribeTiddler, this.scribeField, null, fieldText);
		this.lastValue = newValue;
		return;
	}
	// Sub-path mode: parse current JSON, set/delete at path, reserialize
	var tiddler = this.wiki.getTiddler(this.scribeTiddler);
	var rawText = (tiddler && tiddler.fields[this.scribeField]) || "";
	var obj;
	try { obj = rawText ? JSON.parse(rawText) : {}; }
	catch (e) { obj = {}; }
	var pathParts = this.scribePath.split(",");
	var node = obj;
	for (var i = 0; i < pathParts.length - 1; i++) {
		var seg = pathParts[i];
		if (node[seg] === undefined || node[seg] === null) {
			node[seg] = isNumericIndex(pathParts[i + 1]) ? [] : {};
		}
		node = node[seg];
	}
	var leaf = pathParts[pathParts.length - 1];
	var shouldDelete = (newValue === undefined || newValue === null || newValue === "");
	if (Array.isArray(newValue) && newValue.length === 0) shouldDelete = true;
	if (shouldDelete) {
		// For arrays we DO NOT delete an indexed element (would shift indices and break
		// callers that index by position); set to empty array/string instead. For object
		// keys, delete the key entirely.
		if (Array.isArray(node)) {
			node[leaf] = "";
		} else {
			delete node[leaf];
		}
	} else {
		node[leaf] = newValue;
	}
	this.wiki.setText(this.scribeTiddler, this.scribeField, null, JSON.stringify(obj));
	this.lastValue = newValue;
};

function isNumericIndex(s) {
	return /^\d+$/.test(s);
}

function deepEqual(a, b) {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (a === null || b === null) return a === b;
	if (typeof a !== "object") return a === b;
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	if (Array.isArray(a)) {
		if (a.length !== b.length) return false;
		for (var i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}
	var ka = Object.keys(a), kb = Object.keys(b);
	if (ka.length !== kb.length) return false;
	for (var j = 0; j < ka.length; j++) {
		if (!deepEqual(a[ka[j]], b[ka[j]])) return false;
	}
	return true;
}

exports.scribe = ScribeWidget;
