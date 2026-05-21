/*\
title: $:/plugins/rimir/scribe/modules/scribetypes/date.js
type: application/javascript
module-type: scribetype

application/x-tw-date — date-only round-trip between TW's UTC storage format
(YYYYMMDDHHmmsssss) and human-readable date strings.

  fromField  TW string → "YYYY-MM-DD"
  toField    user input → TW string (smart parser; throws on bad input)

Accepted input shapes (smart parser, shared with x-tw-datetime):
  YYYY-MM-DD · DD.MM.YYYY · today (or t) · tomorrow · yesterday ·
  ±N / ±Nd / ±Nw / ±Nm / ±Ny

Empty input on write → undefined (= delete the field / sub-path).

\*/

"use strict";

var helpers = require("$:/plugins/rimir/scribe/modules/scribetypes/_date-helpers.js");

exports.name = "application/x-tw-date";

exports.fromField = function(value) {
    return helpers.formatTwDate(value, {withTime: false});
};

exports.toField = function(text) {
    var d = helpers.parseSmartDate(text, {withTime: false});
    if (d === undefined) return undefined;
    return helpers.toTwDate(d);
};
