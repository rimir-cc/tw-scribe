# scribe

> Bidirectional sync between a tiddler field (or sub-path inside a JSON-encoded field) and a state tiddler

The `<$scribe>` widget wraps input widgets and keeps their backing state in sync with a target field. Inside the wrapper, the `<<state>>` variable points to a temporary state tiddler that input widgets can bind to via `tiddler=<<state>>`. The scribe handles the round-trip in both directions:

- On mount: reads the target field, optionally extracts a sub-path inside a JSON value, transforms it via the type handler, and writes the result to the state's `text` field.
- On state changes: transforms back via the handler and writes into the target field (or sets the sub-path inside the JSON field).
- On external field changes: re-prepares the state to reflect the new value.

## Key features

* **Sub-path syncing** — sync a value at a comma-separated path inside a JSON-encoded field, not just whole fields.
* **Pluggable type handlers** registered as `module-type: scribetype` modules. Three ship:
  * `text/plain` — pass-through
  * `application/json` — parse + pretty-print for state, parse + compact for field
  * `application/x-string-array` — space-separated text in state, JSON array of strings in field (or at sub-path)
* **Empty-state semantics** — clearing the state deletes the sub-path key (or empties the field), so input widgets can cleanly "un-set" properties.
* **Zero dependencies** on other rimir plugins.

## Attribution

The bidirectional sync pattern (state-tiddler ↔ field, type-handler registry, refresh-driven detection) was inspired by Flibbles' `FieldTranscriberWidget` in [tw5-graph](https://github.com/flibbles/tw5-graph). This plugin is an independent reimplementation that adds sub-path-into-JSON syncing and the `application/x-string-array` type.

## Quick start

```wikitext
<$scribe tiddler="Task1" field="kind.fields" path="0,caption" type="text/plain">
  <$edit-text tiddler=<<state>> field="text" tag="input"/>
</$scribe>
```

Typing into the input writes back into `Task1.kind.fields[0].caption`. Externally changing the field updates the input.

## Plugin Library

This plugin is part of the [rimir-cc tw-plugin-library](https://rimir-cc.github.io/tw-plugin-library/).
