// Test: Temporal.PlainDateTime
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

// === Temporal.PlainDateTime exists ===
assert(typeof Temporal.PlainDateTime === "function", "Temporal.PlainDateTime is a function");

// === Constructor with all args ===
var dt = Temporal.PlainDateTime(2024, 1, 15, 10, 30, 45, 100, 200, 300);
assert(dt.year === 2024, "year returns 2024");
assert(dt.month === 1, "month returns 1");
assert(dt.day === 15, "day returns 15");
assert(dt.hour === 10, "hour returns 10");
assert(dt.minute === 30, "minute returns 30");
assert(dt.second === 45, "second returns 45");
assert(dt.millisecond === 100, "millisecond returns 100");
assert(dt.microsecond === 200, "microsecond returns 200");
assert(dt.nanosecond === 300, "nanosecond returns 300");

// === Constructor with defaults (time defaults to midnight) ===
var dt2 = Temporal.PlainDateTime(2024, 6, 15);
assert(dt2.year === 2024, "default: year 2024");
assert(dt2.month === 6, "default: month 6");
assert(dt2.day === 15, "default: day 15");
assert(dt2.hour === 0, "default: hour 0");
assert(dt2.minute === 0, "default: minute 0");
assert(dt2.second === 0, "default: second 0");
assert(dt2.millisecond === 0, "default: millisecond 0");
assert(dt2.microsecond === 0, "default: microsecond 0");
assert(dt2.nanosecond === 0, "default: nanosecond 0");

// === Constructor with partial time args ===
var dt3 = Temporal.PlainDateTime(2024, 3, 10, 14);
assert(dt3.hour === 14, "partial: hour 14");
assert(dt3.minute === 0, "partial: minute defaults to 0");

var dt4 = Temporal.PlainDateTime(2024, 3, 10, 14, 30);
assert(dt4.hour === 14, "partial: hour 14");
assert(dt4.minute === 30, "partial: minute 30");
assert(dt4.second === 0, "partial: second defaults to 0");

// === Date getters ===
var dateGetters = Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0);
assert(dateGetters.dayOfWeek === 1, "2024-01-15 is Monday (dayOfWeek=1)");
assert(dateGetters.dayOfYear === 15, "2024-01-15 is day 15 of year");
assert(dateGetters.inLeapYear === true, "2024 is a leap year");
assert(dateGetters.daysInMonth === 31, "January has 31 days");
assert(dateGetters.daysInYear === 366, "2024 has 366 days (leap year)");
assert(dateGetters.monthsInYear === 12, "12 months in year");
assert(dateGetters.monthCode === "M01", "January monthCode is M01");
assert(typeof dateGetters.weekOfYear === "number", "weekOfYear returns a number");
assert(dateGetters.calendarId === "iso8601", "default calendar is iso8601");

// Non-leap year
var dt2023 = Temporal.PlainDateTime(2023, 3, 1, 12, 0, 0);
assert(dt2023.inLeapYear === false, "2023 is not a leap year");

// === from() with string ===
var fromStr = Temporal.PlainDateTime.from("2024-06-20T14:30:00");
assert(fromStr.year === 2024, "from string: year 2024");
assert(fromStr.month === 6, "from string: month 6");
assert(fromStr.day === 20, "from string: day 20");
assert(fromStr.hour === 14, "from string: hour 14");
assert(fromStr.minute === 30, "from string: minute 30");
assert(fromStr.second === 0, "from string: second 0");

// === from() with property bag ===
var fromBag = Temporal.PlainDateTime.from({year: 2024, month: 3, day: 10, hour: 8, minute: 15});
assert(fromBag.year === 2024, "from bag: year 2024");
assert(fromBag.month === 3, "from bag: month 3");
assert(fromBag.day === 10, "from bag: day 10");
assert(fromBag.hour === 8, "from bag: hour 8");
assert(fromBag.minute === 15, "from bag: minute 15");

// === from() with existing PlainDateTime (clone) ===
var origDT = Temporal.PlainDateTime(2024, 7, 4, 12, 0, 0);
var clonedDT = Temporal.PlainDateTime.from(origDT);
assert(clonedDT.year === 2024, "from(dt) clones year");
assert(clonedDT.month === 7, "from(dt) clones month");
assert(clonedDT.day === 4, "from(dt) clones day");
assert(clonedDT.hour === 12, "from(dt) clones hour");
assert(clonedDT.equals(origDT), "cloned dt equals original");

// === compare() ===
var earlier = Temporal.PlainDateTime(2024, 1, 1, 10, 0, 0);
var later = Temporal.PlainDateTime(2024, 12, 31, 23, 59, 59);
assert(Temporal.PlainDateTime.compare(earlier, later) === -1, "compare: earlier < later");
assert(Temporal.PlainDateTime.compare(later, earlier) === 1, "compare: later > earlier");
assert(Temporal.PlainDateTime.compare(earlier, earlier) === 0, "compare: equal datetimes");

// Compare same date different times
var morning = Temporal.PlainDateTime(2024, 6, 15, 8, 0, 0);
var evening = Temporal.PlainDateTime(2024, 6, 15, 20, 0, 0);
assert(Temporal.PlainDateTime.compare(morning, evening) === -1, "compare: morning < evening");

// === with() ===
var base = Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0);
var withDay = base.with({day: 20});
assert(withDay.day === 20, "with({day:20}) changes day");
assert(withDay.hour === 10, "with({day:20}) preserves hour");
assert(base.day === 15, "original unchanged after with()");

var withHour = base.with({hour: 14});
assert(withHour.hour === 14, "with({hour:14}) changes hour");
assert(withHour.day === 15, "with({hour:14}) preserves day");

var withMultiple = base.with({year: 2025, month: 6, day: 30, hour: 23, minute: 59});
assert(withMultiple.year === 2025, "with multiple: year");
assert(withMultiple.month === 6, "with multiple: month");
assert(withMultiple.day === 30, "with multiple: day");
assert(withMultiple.hour === 23, "with multiple: hour");
assert(withMultiple.minute === 59, "with multiple: minute");

// === withTime() ===
var baseDT = Temporal.PlainDateTime(2024, 6, 15, 10, 30, 0);
var newTime = Temporal.PlainTime(20, 45, 30);
var withNewTime = baseDT.withTime(newTime);
assert(withNewTime.year === 2024, "withTime preserves year");
assert(withNewTime.month === 6, "withTime preserves month");
assert(withNewTime.day === 15, "withTime preserves day");
assert(withNewTime.hour === 20, "withTime sets hour");
assert(withNewTime.minute === 45, "withTime sets minute");
assert(withNewTime.second === 30, "withTime sets second");

// === add() ===
var addBase = Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0);

// Add months
var addMonth = addBase.add(Temporal.Duration(0, 1));
assert(addMonth.month === 2, "add 1 month: month 2");
assert(addMonth.hour === 10, "add month preserves hour");

// Add days
var addDays = addBase.add(Temporal.Duration(0, 0, 0, 10));
assert(addDays.day === 25, "add 10 days");

// Add hours
var addHours = addBase.add(Temporal.Duration(0, 0, 0, 0, 5));
assert(addHours.hour === 15, "add 5 hours");

// Add hours crossing day boundary
var addCrossDay = Temporal.PlainDateTime(2024, 1, 15, 22, 0, 0).add(Temporal.Duration(0, 0, 0, 0, 5));
assert(addCrossDay.day === 16, "add hours crossing day: day 16");
assert(addCrossDay.hour === 3, "add hours crossing day: hour 3");

// Add with property bag
var addBag = addBase.add({months: 2, days: 5, hours: 3});
assert(addBag.month === 3, "add bag: month 3");
assert(addBag.day === 20, "add bag: day 20");
assert(addBag.hour === 13, "add bag: hour 13");

// === subtract() ===
var subBase = Temporal.PlainDateTime(2024, 6, 15, 14, 30, 0);

// Subtract months
var subMonth = subBase.subtract(Temporal.Duration(0, 1));
assert(subMonth.month === 5, "subtract 1 month: month 5");

// Subtract days
var subDays = subBase.subtract(Temporal.Duration(0, 0, 0, 5));
assert(subDays.day === 10, "subtract 5 days");

// Subtract hours
var subHours = subBase.subtract(Temporal.Duration(0, 0, 0, 0, 3));
assert(subHours.hour === 11, "subtract 3 hours");

// === until() ===
var start2 = Temporal.PlainDateTime(2024, 1, 1, 0, 0, 0);
var end2 = Temporal.PlainDateTime(2024, 1, 2, 12, 0, 0);
var dur = start2.until(end2);
assert(dur.days === 1, "until: 1 day");
assert(dur.hours === 12, "until: 12 hours");

// === since() ===
var sinceDur = end2.since(start2);
assert(sinceDur.days === 1, "since: 1 day");
assert(sinceDur.hours === 12, "since: 12 hours");

// === equals() ===
var eqA = Temporal.PlainDateTime(2024, 6, 15, 12, 0, 0);
var eqB = Temporal.PlainDateTime(2024, 6, 15, 12, 0, 0);
var eqC = Temporal.PlainDateTime(2024, 6, 15, 12, 0, 1);
assert(eqA.equals(eqB), "same datetimes are equal");
assert(!eqA.equals(eqC), "different datetimes are not equal");
assert(!eqA.equals("not a datetime"), "equals with non-datetime returns false");

// === toPlainDate() ===
var dtForDate = Temporal.PlainDateTime(2024, 6, 15, 14, 30, 0);
var plainDate = dtForDate.toPlainDate();
assert(plainDate.year === 2024, "toPlainDate: year 2024");
assert(plainDate.month === 6, "toPlainDate: month 6");
assert(plainDate.day === 15, "toPlainDate: day 15");

// === toPlainTime() ===
var dtForTime = Temporal.PlainDateTime(2024, 6, 15, 14, 30, 45);
var plainTime = dtForTime.toPlainTime();
assert(plainTime.hour === 14, "toPlainTime: hour 14");
assert(plainTime.minute === 30, "toPlainTime: minute 30");
assert(plainTime.second === 45, "toPlainTime: second 45");

// === toString() ===
var dtStr = Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0);
assert(dtStr.toString() === "2024-01-15T10:30:00", "toString format");

var dtStr2 = Temporal.PlainDateTime(2024, 12, 5, 8, 5, 3);
assert(dtStr2.toString() === "2024-12-05T08:05:03", "toString pads digits");

var dtMidnight = Temporal.PlainDateTime(2024, 1, 1, 0, 0, 0);
assert(dtMidnight.toString() === "2024-01-01T00:00:00", "toString midnight");

// === toJSON() ===
var dtJ = Temporal.PlainDateTime(2024, 1, 15, 10, 30, 0);
assert(dtJ.toJSON() === dtJ.toString(), "toJSON equals toString");

// === valueOf() throws ===
assertThrows(function() {
    Temporal.PlainDateTime(2024, 1, 1, 0, 0, 0).valueOf();
}, "valueOf throws TypeError");

// === Prototype chain ===
var instDT = Temporal.PlainDateTime(2024, 1, 1, 0, 0, 0);
assert(Object.getPrototypeOf(instDT) === Temporal.PlainDateTime.prototype, "prototype chain is correct");

// === Error cases ===
assertThrows(function() {
    Temporal.PlainDateTime.from();
}, "from() with no args throws");

assertThrows(function() {
    Temporal.PlainDateTime.compare(earlier);
}, "compare with 1 arg throws");

assertThrows(function() {
    Temporal.PlainDateTime(2024, 1);
}, "constructor with <3 args throws");

assertThrows(function() {
    Temporal.PlainDateTime.from("not a datetime string");
}, "from invalid string throws");

assertThrows(function() {
    Temporal.PlainDateTime(2024, 13, 1);
}, "invalid month throws");

assertThrows(function() {
    Temporal.PlainDateTime(2024, 1, 32);
}, "invalid day throws");

assertThrows(function() {
    Temporal.PlainDateTime(2024, 1, 1, 25);
}, "invalid hour throws");

// === Summary ===
console.log("Temporal.PlainDateTime tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
    throw new Error(failed + " tests failed");
}
