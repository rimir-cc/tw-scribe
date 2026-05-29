/*\
title: $:/plugins/rimir/scribe/modules/scribetypes/date.js
type: application/javascript
module-type: scribetype

application/x-tw-date — date-only round-trip between TW's date storage
format and human-readable date strings.

  fromField  TW string → "YYYY-MM-DD"
  toField    user input → "YYYYMMDD" (8-char, local digits, no UTC)

Storage format is 8-char `YYYYMMDD` (calendar date, no time, no TZ
conversion). For an actual moment in time (UTC matters), use
`application/x-tw-datetime` instead.

Legacy 17-char UTC values written by earlier versions of this
scribetype still round-trip correctly: `fromField` uses TW's
`parseDate` which accepts both 8 and 17 char inputs. Fresh writes
are always 8-char; wikis self-migrate as users edit each date.

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
    return helpers.toTwDateOnly(d);
};
