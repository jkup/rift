// Test: Temporal Phase 5 - Polish (missing methods)
var passed = 0;
var failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.log("FAIL: " + message);
    }
}

function assertThrows(fn, message) {
    try {
        fn();
        failed++;
        console.log("FAIL (no throw): " + message);
    } catch (e) {
        passed++;
    }
}

// =============================================================
// Temporal.Instant.prototype.since() / .until()
// =============================================================

var inst1 = Temporal.Instant.fromEpochMilliseconds(0);
var inst2 = Temporal.Instant.fromEpochMilliseconds(3600000); // 1 hour later

// until()
var durUntil = inst1.until(inst2);
assert(typeof durUntil === "object", "instant.until returns an object");
assert(durUntil.seconds() === 3600, "instant.until: 3600 seconds");

// since()
var durSince = inst2.since(inst1);
assert(typeof durSince === "object", "instant.since returns an object");
assert(durSince.seconds() === 3600, "instant.since: 3600 seconds");

// since with same instant
var durZero = inst1.since(inst1);
assert(durZero.seconds() === 0, "instant.since self: 0 seconds");

// until with same instant
var durZero2 = inst1.until(inst1);
assert(durZero2.seconds() === 0, "instant.until self: 0 seconds");

// larger time difference
var inst3 = Temporal.Instant.fromEpochMilliseconds(86400000); // 24 hours
var dur24h = inst1.until(inst3);
assert(dur24h.seconds() === 86400, "instant.until: 86400 seconds (24h)");

// =============================================================
// Temporal.Duration.prototype.total()
// =============================================================

var dur1h = Temporal.Duration(0, 0, 0, 0, 1, 30);  // 1 hour 30 minutes
var totalMinutes = dur1h.total("minutes");
assert(totalMinutes === 90, "duration.total('minutes'): 90");

var totalHours = dur1h.total("hours");
assert(totalHours === 1.5, "duration.total('hours'): 1.5");

var totalSeconds = dur1h.total("seconds");
assert(totalSeconds === 5400, "duration.total('seconds'): 5400");

// total with object argument
var totalObj = dur1h.total({unit: "minutes"});
assert(totalObj === 90, "duration.total({unit:'minutes'}): 90");

// Simple durations
var dur5s = Temporal.Duration(0, 0, 0, 0, 0, 0, 5);
assert(dur5s.total("seconds") === 5, "5s total seconds: 5");
assert(dur5s.total("milliseconds") === 5000, "5s total milliseconds: 5000");

// =============================================================
// Temporal.Duration.prototype.round()
// =============================================================

var durRound = Temporal.Duration(0, 0, 0, 0, 1, 30, 45);  // 1h 30m 45s

// Round to nearest hour
var rounded = durRound.round("hours");
assert(rounded.hours() === 2, "round to hours: 2 hours (1h30m45s rounds up)");
assert(rounded.minutes() === 0, "round to hours: 0 minutes");

// Round to nearest minute
var roundedMin = durRound.round("minutes");
assert(roundedMin.hours() === 1, "round to minutes: 1 hour");
assert(roundedMin.minutes() === 31, "round to minutes: 31 minutes (30m45s rounds up)");
assert(roundedMin.seconds() === 0, "round to minutes: 0 seconds");

// Round with options object
var roundedObj = durRound.round({smallestUnit: "minutes"});
assert(roundedObj.minutes() === 31, "round({smallestUnit:'minutes'}): 31");

// =============================================================
// Temporal.PlainDate.prototype.toPlainDateTime()
// =============================================================

var date = Temporal.PlainDate(2024, 6, 15);

// Without time argument (defaults to midnight)
var dt = date.toPlainDateTime();
assert(dt.year() === 2024, "toPlainDateTime: year 2024");
assert(dt.month() === 6, "toPlainDateTime: month 6");
assert(dt.day() === 15, "toPlainDateTime: day 15");
assert(dt.hour() === 0, "toPlainDateTime: hour 0 (midnight)");
assert(dt.minute() === 0, "toPlainDateTime: minute 0");
assert(dt.second() === 0, "toPlainDateTime: second 0");

// With PlainTime argument
var time = Temporal.PlainTime(14, 30, 0);
var dtWithTime = date.toPlainDateTime(time);
assert(dtWithTime.year() === 2024, "toPlainDateTime(time): year 2024");
assert(dtWithTime.month() === 6, "toPlainDateTime(time): month 6");
assert(dtWithTime.day() === 15, "toPlainDateTime(time): day 15");
assert(dtWithTime.hour() === 14, "toPlainDateTime(time): hour 14");
assert(dtWithTime.minute() === 30, "toPlainDateTime(time): minute 30");

// =============================================================
// Temporal.PlainDate.prototype.toZonedDateTime()
// =============================================================

var date2 = Temporal.PlainDate(2024, 6, 15);
var zdt = date2.toZonedDateTime("UTC");
assert(zdt.year() === 2024, "toZonedDateTime: year 2024");
assert(zdt.month() === 6, "toZonedDateTime: month 6");
assert(zdt.day() === 15, "toZonedDateTime: day 15");
assert(zdt.timeZoneId() === "UTC", "toZonedDateTime: timezone UTC");

// With fixed offset timezone
var zdtOffset = date2.toZonedDateTime("+05:30");
assert(zdtOffset.year() === 2024, "toZonedDateTime(+05:30): year 2024");
assert(zdtOffset.timeZoneId() === "+05:30", "toZonedDateTime: timezone +05:30");

// =============================================================
// Temporal.Now.plainDateISO()
// =============================================================

var nowDate = Temporal.Now.plainDateISO();
assert(typeof nowDate.year() === "number", "Now.plainDateISO: year is number");
assert(nowDate.year() >= 2024, "Now.plainDateISO: year >= 2024");
assert(nowDate.month() >= 1 && nowDate.month() <= 12, "Now.plainDateISO: month 1-12");
assert(nowDate.day() >= 1 && nowDate.day() <= 31, "Now.plainDateISO: day 1-31");

// =============================================================
// Temporal.Now.plainTimeISO()
// =============================================================

var nowTime = Temporal.Now.plainTimeISO();
assert(typeof nowTime.hour() === "number", "Now.plainTimeISO: hour is number");
assert(nowTime.hour() >= 0 && nowTime.hour() <= 23, "Now.plainTimeISO: hour 0-23");
assert(nowTime.minute() >= 0 && nowTime.minute() <= 59, "Now.plainTimeISO: minute 0-59");
assert(nowTime.second() >= 0 && nowTime.second() <= 59, "Now.plainTimeISO: second 0-59");

// =============================================================
// Temporal.Now.plainDateTimeISO()
// =============================================================

var nowDT = Temporal.Now.plainDateTimeISO();
assert(typeof nowDT.year() === "number", "Now.plainDateTimeISO: year is number");
assert(nowDT.year() >= 2024, "Now.plainDateTimeISO: year >= 2024");
assert(nowDT.month() >= 1 && nowDT.month() <= 12, "Now.plainDateTimeISO: month 1-12");
assert(nowDT.day() >= 1 && nowDT.day() <= 31, "Now.plainDateTimeISO: day 1-31");
assert(typeof nowDT.hour() === "number", "Now.plainDateTimeISO: hour is number");
assert(typeof nowDT.minute() === "number", "Now.plainDateTimeISO: minute is number");

console.log("Temporal Phase 5 tests: " + passed + " passed, " + failed + " failed");
