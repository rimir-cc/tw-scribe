/*\
title: $:/plugins/rimir/scribe/modules/scribetypes/_date-helpers.js
type: application/javascript
module-type: library

Shared smart-parser + formatter for the date / datetime scribetypes.

Public surface:
  parseSmartDate(text, {withTime})  — text → JS Date (local), or undefined on
                                       blank input. Throws on unrecognised input.
  formatTwDate(value, {withTime})   — TW date string → "YYYY-MM-DD" (or
                                       "YYYY-MM-DD HH:mm" with withTime).

Round-trip strategy: user-facing values are local-time YYYY-MM-DD strings; TW
storage is UTC YYYYMMDDHHmmsssss. parseSmartDate produces a local Date; callers
(scribetype.toField) immediately pass it through $tw.utils.stringifyDate which
converts to the UTC string for storage. formatTwDate undoes the trip.

Date-only fields store at local-midnight (00:00:00 in the user's TZ). Datetime
fields keep the user-supplied HH:mm. Crossing time zones with date-only values
will shift the displayed date — accepted tradeoff for keeping the storage
format uniform with the rest of TW.

\*/

"use strict";

/**
 * Parse a Date out of a user-typed string. Returns:
 *   undefined  → blank input (caller treats as "clear field")
 *   Date       → parsed value
 *   throws     → unrecognised input (caller surfaces an error)
 *
 * Accepted shapes:
 *   YYYY-MM-DD                  ISO date
 *   DD.MM.YYYY                  German date
 *   today | t                   today at 00:00 local
 *   tomorrow                    today + 1 day
 *   yesterday                   today - 1 day
 *   +N | -N                     today ± N days
 *   +Nd | -Nd                   same
 *   +Nw | -Nw                   today ± N weeks
 *   +Nm | -Nm                   today ± N months (day clamps to last-of-month)
 *   +Ny | -Ny                   today ± N years (Feb 29 clamps to Feb 28)
 *
 * With withTime:
 *   any of the above, optionally followed by " HH:mm"
 *   "HH:mm" alone → today at that time
 */
exports.parseSmartDate = function(text, opts) {
    var withTime = !!(opts && opts.withTime);
    text = (text || "").trim();
    if (!text) return undefined;

    var timePart = null;
    if (withTime) {
        // Pull off trailing time component if present.
        var m = /^(.*?)\s+(\d{1,2}:\d{2})$/.exec(text);
        if (m) {
            text = m[1].trim();
            timePart = m[2];
        } else if (/^\d{1,2}:\d{2}$/.test(text)) {
            // bare HH:mm → today at that time
            timePart = text;
            text = "today";
        }
    }

    var d = parseDatePart(text);
    if (timePart) applyTime(d, timePart);
    return d;
};

function parseDatePart(text) {
    var today = todayAtLocalMidnight();

    // Shortcuts
    if (text === "today" || text === "t") return today;
    if (text === "tomorrow") return addDays(today, 1);
    if (text === "yesterday") return addDays(today, -1);

    // Relative: +N / -N / +Nd / +Nw / +Nm / +Ny
    var rel = /^([+-]\d+)([dwmy]?)$/i.exec(text);
    if (rel) {
        var n = parseInt(rel[1], 10);
        var unit = (rel[2] || "d").toLowerCase();
        if (unit === "d") return addDays(today, n);
        if (unit === "w") return addDays(today, n * 7);
        if (unit === "m") return addMonths(today, n);
        if (unit === "y") return addMonths(today, n * 12);
    }

    // ISO: YYYY-MM-DD
    var iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
    if (iso) {
        return makeLocalDate(+iso[1], +iso[2] - 1, +iso[3]);
    }

    // German: DD.MM.YYYY
    var de = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
    if (de) {
        return makeLocalDate(+de[3], +de[2] - 1, +de[1]);
    }

    throw new Error("unrecognised date input: " + text);
}

function applyTime(d, timePart) {
    var t = /^(\d{1,2}):(\d{2})$/.exec(timePart);
    if (!t) throw new Error("unrecognised time: " + timePart);
    var hh = +t[1], mm = +t[2];
    if (hh > 23 || mm > 59) throw new Error("out-of-range time: " + timePart);
    d.setHours(hh, mm, 0, 0);
}

function todayAtLocalMidnight() {
    var now = new Date();
    return makeLocalDate(now.getFullYear(), now.getMonth(), now.getDate());
}

function makeLocalDate(year, monthIdx, day) {
    // Validate the date components actually form a real date — JS Date is
    // forgiving (Feb 30 → Mar 1), but for ISO/German entry we want a strict
    // check so typos surface as errors.
    var d = new Date(year, monthIdx, day, 0, 0, 0, 0);
    if (d.getFullYear() !== year || d.getMonth() !== monthIdx || d.getDate() !== day) {
        throw new Error("invalid date: " + year + "-" + (monthIdx + 1) + "-" + day);
    }
    return d;
}

function addDays(d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
}

// Month arithmetic with day clamping (Jan 31 + 1 month → Feb 28/29).
// Preserves hour/minute/second/ms on the source date.
function addMonths(d, n) {
    var year = d.getFullYear();
    var month = d.getMonth() + n;
    var targetYear = year + Math.floor(month / 12);
    var targetMonth = ((month % 12) + 12) % 12;
    var daysInTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
    var day = Math.min(d.getDate(), daysInTarget);
    return new Date(
        targetYear, targetMonth, day,
        d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()
    );
}

exports.addDays = addDays;
exports.addMonths = addMonths;

/**
 * Format a TW UTC date string (YYYYMMDDHHmmsssss) as a local-time human string.
 *   withTime:false → "YYYY-MM-DD"
 *   withTime:true  → "YYYY-MM-DD HH:mm"
 *
 * Empty/undefined input → "" (so callers can pass blank fields through).
 * Non-string values are coerced via String().
 * Unparseable strings pass through unchanged.
 */
exports.formatTwDate = function(value, opts) {
    var withTime = !!(opts && opts.withTime);
    if (value === undefined || value === null || value === "") return "";
    if (typeof value !== "string") value = String(value);
    if (!$tw || !$tw.utils || !$tw.utils.parseDate) return value;
    var d;
    try {
        d = $tw.utils.parseDate(value);
    } catch (e) {
        return value;
    }
    if (!d || isNaN(d.getTime())) return value;
    return withTime
        ? $tw.utils.formatDateString(d, "YYYY-0MM-0DD 0hh:0mm")
        : $tw.utils.formatDateString(d, "YYYY-0MM-0DD");
};

/**
 * Convert a JS Date into TW's UTC storage string (17-char
 * YYYYMMDDHHmmsssss). Used for ''datetime'' values (actual moments
 * in time, TZ matters). Exposed so callers (e.g. palette's datetime
 * kind for +/- arithmetic) can avoid round-tripping through the parser.
 */
exports.toTwDate = function(date) {
    if (!date || isNaN(date.getTime())) return undefined;
    if (!$tw || !$tw.utils || !$tw.utils.stringifyDate) return undefined;
    return $tw.utils.stringifyDate(date);
};

/**
 * Convert a JS Date into a TW date-only storage string (8-char
 * YYYYMMDD) using LOCAL year/month/day components — no time, no UTC
 * conversion. Used for ''date'' values (calendar dates, no TZ
 * semantics — birthdays, due-dates, etc.).
 *
 * Rationale: stringifyDate produces UTC digits, so local-midnight
 * dates get shifted backwards by the timezone offset (Berlin CET
 * "1900-01-28 00:00" → stored as "19000127230000000"), and the digit
 * representation crosses a day boundary. Date-only fields shouldn't
 * carry that artifact: 28th of January is the 28th of January
 * regardless of timezone.
 *
 * TW's `parseDate` and `[format:date[]]` filter both accept the
 * 8-char form (verified) — they treat it as UTC midnight on that
 * date, which renders correctly in CET (Jan 28 01:00 local) and any
 * eastern timezone. WEST-of-UTC display still day-shifts but that's
 * a pre-existing TW behaviour, not introduced here.
 */
exports.toTwDateOnly = function(date) {
    if (!date || isNaN(date.getTime())) return undefined;
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return String(y) +
        (m < 10 ? "0" + m : String(m)) +
        (d < 10 ? "0" + d : String(d));
};

/**
 * Inverse — TW UTC string → JS Date, or null on parse failure.
 */
exports.fromTwDate = function(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") value = String(value);
    if (!$tw || !$tw.utils || !$tw.utils.parseDate) return null;
    try {
        var d = $tw.utils.parseDate(value);
        return (d && !isNaN(d.getTime())) ? d : null;
    } catch (e) {
        return null;
    }
};
