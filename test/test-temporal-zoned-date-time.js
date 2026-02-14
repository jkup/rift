// Test: Temporal.ZonedDateTime
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

// === Temporal.ZonedDateTime exists ===
assert(typeof Temporal.ZonedDateTime === "function", "Temporal.ZonedDateTime is a function");

// === Constructor with UTC ===
// epoch nanoseconds = 0 means Unix epoch (1970-01-01T00:00:00Z)
var zdt = Temporal.ZonedDateTime(0, "UTC");
assert(zdt.year === 1970, "UTC epoch: year 1970");
assert(zdt.month === 1, "UTC epoch: month 1");
assert(zdt.day === 1, "UTC epoch: day 1");
assert(zdt.hour === 0, "UTC epoch: hour 0");
assert(zdt.minute === 0, "UTC epoch: minute 0");
assert(zdt.second === 0, "UTC epoch: second 0");

// === Timezone getters ===
assert(zdt.timeZoneId === "UTC", "timeZoneId is UTC");
assert(zdt.epochMilliseconds === 0, "epochMilliseconds is 0 at epoch");

// === Offset ===
var offsetStr = zdt.offset;
assert(offsetStr === "+00:00", "UTC offset is +00:00");
assert(zdt.offsetNanoseconds === 0, "UTC offsetNanoseconds is 0");

// === Calendar ===
assert(zdt.calendarId === "iso8601", "default calendar is iso8601");

// === Detailed date/time tests using from() to avoid precision issues ===
// (Large nanosecond values as doubles lose precision without BigInt)
var zdt2 = Temporal.ZonedDateTime.from("2024-01-15T12:30:00+00:00[UTC]");
assert(zdt2.year === 2024, "2024-01-15: year 2024");
assert(zdt2.month === 1, "2024-01-15: month 1");
assert(zdt2.day === 15, "2024-01-15: day 15");
assert(zdt2.hour === 12, "2024-01-15: hour 12");
assert(zdt2.minute === 30, "2024-01-15: minute 30");
assert(zdt2.second === 0, "2024-01-15: second 0");
assert(zdt2.millisecond === 0, "2024-01-15: millisecond 0");
assert(zdt2.microsecond === 0, "2024-01-15: microsecond 0");
assert(zdt2.nanosecond === 0, "2024-01-15: nanosecond 0");

// === Date getters ===
assert(zdt2.dayOfWeek === 1, "2024-01-15 is Monday (1)");
assert(zdt2.dayOfYear === 15, "2024-01-15 is day 15 of year");
assert(typeof zdt2.weekOfYear === "number", "weekOfYear returns a number");
assert(zdt2.daysInMonth === 31, "January has 31 days");
assert(zdt2.daysInYear === 366, "2024 has 366 days (leap year)");
assert(zdt2.monthsInYear === 12, "12 months in year");
assert(zdt2.inLeapYear === true, "2024 is a leap year");
assert(zdt2.monthCode === "M01", "January monthCode is M01");

// === Constructor with small epoch nanoseconds ===
// 12 hours in nanoseconds = 43200000000000 (fits in double without precision loss)
var zdt_12h = Temporal.ZonedDateTime(43200000000000, "UTC");
assert(zdt_12h.hour === 12, "constructor: 12h nanoseconds gives hour 12");
assert(zdt_12h.year === 1970, "constructor: 12h gives year 1970");

// === from() with string ===
var fromStr = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
assert(fromStr.year === 2024, "from string: year 2024");
assert(fromStr.month === 6, "from string: month 6");
assert(fromStr.day === 20, "from string: day 20");
assert(fromStr.hour === 10, "from string: hour 10");
assert(fromStr.minute === 30, "from string: minute 30");

// === from() with existing ZonedDateTime (clone) ===
var originalZdt = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var clonedZdt = Temporal.ZonedDateTime.from(originalZdt);
assert(clonedZdt.year === 2024, "from(zdt) clones year");
assert(clonedZdt.month === 6, "from(zdt) clones month");
assert(clonedZdt.day === 20, "from(zdt) clones day");
assert(clonedZdt.equals(originalZdt), "cloned zdt equals original");

// === compare() ===
var zdtEarlier = Temporal.ZonedDateTime(0, "UTC");
var zdtLater = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
assert(Temporal.ZonedDateTime.compare(zdtEarlier, zdtLater) === -1, "compare: earlier < later");
assert(Temporal.ZonedDateTime.compare(zdtLater, zdtEarlier) === 1, "compare: later > earlier");
assert(Temporal.ZonedDateTime.compare(zdtEarlier, zdtEarlier) === 0, "compare: equal");

// === equals() ===
var eqZdt1 = Temporal.ZonedDateTime(0, "UTC");
var eqZdt2 = Temporal.ZonedDateTime(0, "UTC");
assert(eqZdt1.equals(eqZdt2), "equals: same instant and timezone");

// === epochMilliseconds ===
assert(typeof zdt2.epochMilliseconds === "number", "epochMilliseconds returns a number");
assert(zdt2.epochMilliseconds > 0, "epochMilliseconds is positive for 2024 date");

// === with() ===
var zdtWith = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var zdtModified = zdtWith.with({hour: 15});
assert(zdtModified.hour === 15, "with: hour changed to 15");
assert(zdtModified.year === 2024, "with: year unchanged");
assert(zdtModified.month === 6, "with: month unchanged");
assert(zdtModified.day === 20, "with: day unchanged");

var zdtModDay = zdtWith.with({day: 25});
assert(zdtModDay.day === 25, "with: day changed to 25");

// === withCalendar() ===
var zdtCal = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var zdtNewCal = zdtCal.withCalendar("iso8601");
assert(zdtNewCal.calendarId === "iso8601", "withCalendar: calendar changed");

// === add() ===
var zdtAdd = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var zdtAdded = zdtAdd.add({hours: 5});
assert(zdtAdded.hour === 15, "add 5 hours: hour 15");
assert(zdtAdded.day === 20, "add 5 hours: day unchanged");

var zdtAddDays = zdtAdd.add({days: 10});
assert(zdtAddDays.day === 30, "add 10 days: day 30");
assert(zdtAddDays.month === 6, "add 10 days: month 6");

var zdtAddMonths = zdtAdd.add({months: 1});
assert(zdtAddMonths.month === 7, "add 1 month: month 7");

// === subtract() ===
var zdtSub = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var zdtSubbed = zdtSub.subtract({hours: 5});
assert(zdtSubbed.hour === 5, "subtract 5 hours: hour 5");

var zdtSubDays = zdtSub.subtract({days: 10});
assert(zdtSubDays.day === 10, "subtract 10 days: day 10");

// === until() / since() ===
var zdtA = Temporal.ZonedDateTime.from("2024-01-01T00:00:00+00:00[UTC]");
var zdtB = Temporal.ZonedDateTime.from("2024-01-01T12:00:00+00:00[UTC]");
var durUntil = zdtA.until(zdtB);
assert(durUntil.hours === 12, "until: 12 hours");

var durSince = zdtB.since(zdtA);
assert(durSince.hours === 12, "since: 12 hours");

// === toInstant() ===
var zdtInst = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var instant = zdtInst.toInstant();
assert(typeof instant.epochMilliseconds === "number", "toInstant returns an Instant");

// === toPlainDate() ===
var zdtDate = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var plainDate = zdtDate.toPlainDate();
assert(plainDate.year === 2024, "toPlainDate: year");
assert(plainDate.month === 6, "toPlainDate: month");
assert(plainDate.day === 20, "toPlainDate: day");

// === toPlainTime() ===
var plainTime = zdtDate.toPlainTime();
assert(plainTime.hour === 10, "toPlainTime: hour");
assert(plainTime.minute === 30, "toPlainTime: minute");
assert(plainTime.second === 0, "toPlainTime: second");

// === toPlainDateTime() ===
var plainDateTime = zdtDate.toPlainDateTime();
assert(plainDateTime.year === 2024, "toPlainDateTime: year");
assert(plainDateTime.month === 6, "toPlainDateTime: month");
assert(plainDateTime.day === 20, "toPlainDateTime: day");
assert(plainDateTime.hour === 10, "toPlainDateTime: hour");
assert(plainDateTime.minute === 30, "toPlainDateTime: minute");

// === startOfDay() ===
var zdtSod = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var sod = zdtSod.startOfDay();
assert(sod.year === 2024, "startOfDay: year");
assert(sod.month === 6, "startOfDay: month");
assert(sod.day === 20, "startOfDay: day");
assert(sod.hour === 0, "startOfDay: hour 0");
assert(sod.minute === 0, "startOfDay: minute 0");
assert(sod.second === 0, "startOfDay: second 0");

// === hoursInDay() ===
var zdtHid = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var hours = zdtHid.hoursInDay();
assert(hours === 24, "hoursInDay: 24 hours for UTC");

// === toString() ===
var zdtToStr = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var strResult = zdtToStr.toString();
assert(typeof strResult === "string", "toString returns a string");
assert(strResult.indexOf("2024") !== -1, "toString contains year");
assert(strResult.indexOf("UTC") !== -1, "toString contains timezone");

// === toJSON() ===
var jsonStr = zdtToStr.toJSON();
assert(jsonStr === strResult, "toJSON returns same as toString");

// === valueOf() throws ===
assertThrows(function() { zdtToStr.valueOf(); }, "valueOf throws TypeError");

// === Fixed offset timezone ===
var zdtOffset = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+05:30[+05:30]");
assert(zdtOffset.year === 2024, "fixed offset: year 2024");
assert(zdtOffset.hour === 10, "fixed offset: hour 10");
assert(zdtOffset.timeZoneId === "+05:30", "fixed offset: timeZoneId +05:30");
var offsetResult = zdtOffset.offset;
assert(offsetResult === "+05:30", "fixed offset: offset string +05:30");

// === withTimeZone() ===
var zdtWtz = Temporal.ZonedDateTime.from("2024-06-20T10:30:00+00:00[UTC]");
var zdtNewTz = zdtWtz.withTimeZone("+05:30");
assert(zdtNewTz.timeZoneId === "+05:30", "withTimeZone: new timeZoneId");
// The instant should be the same, but wall clock time changes
assert(zdtNewTz.hour === 16, "withTimeZone: hour adjusted to +05:30");

console.log("Temporal.ZonedDateTime tests: " + passed + " passed, " + failed + " failed");
