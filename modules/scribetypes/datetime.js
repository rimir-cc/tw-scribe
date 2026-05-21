/*\
title: $:/plugins/rimir/scribe/modules/scribetypes/datetime.js
type: application/javascript
module-type: scribetype

application/x-tw-datetime — date + time round-trip between TW's UTC storage
format (YYYYMMDDHHmmsssss) and human-readable date-time strings.

  fromField  TW string → "YYYY-MM-DD HH:mm"
  toField    user input → TW string (smart parser; throws on bad input)

Accepted input shapes — any of the date-only shapes (see x-tw-date) optionally
followed by " HH:mm". A bare "HH:mm" means "today at that time". Missing time
component → 00:00.

Empty input on write → undefined (= delete the field / sub-path).

\*/

"use strict";

var helpers = require("$:/plugins/rimir/scribe/modules/scribetypes/_date-helpers.js");

exports.name = "application/x-tw-datetime";

exports.fromField = function(value) {
    return helpers.formatTwDate(value, {withTime: true});
};

exports.toField = function(text) {
    var d = helpers.parseSmartDate(text, {withTime: true});
    if (d === undefined) return undefined;
    return helpers.toTwDate(d);
};
