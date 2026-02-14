// Test: Temporal.PlainDate
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

// === Temporal.PlainDate exists ===
assert(typeof Temporal.PlainDate === "function", "Temporal.PlainDate is a function");

// === Constructor ===
var d = Temporal.PlainDate(2024, 1, 15);
assert(d.year() === 2024, "year() returns 2024");
assert(d.month() === 1, "month() returns 1");
assert(d.day() === 15, "day() returns 15");

// === Getters ===
assert(d.dayOfWeek() === 1, "2024-01-15 is Monday (dayOfWeek=1)");
assert(d.dayOfYear() === 15, "2024-01-15 is day 15 of year");
assert(d.inLeapYear() === true, "2024 is a leap year");
assert(d.daysInMonth() === 31, "January has 31 days");
assert(d.daysInYear() === 366, "2024 has 366 days (leap year)");
assert(d.monthsInYear() === 12, "12 months in year");
assert(d.monthCode() === "M01", "January monthCode is M01");
assert(typeof d.weekOfYear() === "number", "weekOfYear returns a number");
assert(d.calendarId() === "iso8601", "default calendar is iso8601");

// Non-leap year
var d2023 = Temporal.PlainDate(2023, 3, 1);
assert(d2023.inLeapYear() === false, "2023 is not a leap year");
assert(d2023.daysInYear() === 365, "2023 has 365 days");

// February days
var feb2024 = Temporal.PlainDate(2024, 2, 1);
assert(feb2024.daysInMonth() === 29, "Feb 2024 (leap) has 29 days");
var feb2023 = Temporal.PlainDate(2023, 2, 1);
assert(feb2023.daysInMonth() === 28, "Feb 2023 (non-leap) has 28 days");

// === from() with string ===
var fromStr = Temporal.PlainDate.from("2024-06-20");
assert(fromStr.year() === 2024, "from string: year 2024");
assert(fromStr.month() === 6, "from string: month 6");
assert(fromStr.day() === 20, "from string: day 20");

// === from() with property bag ===
var fromBag = Temporal.PlainDate.from({year: 2024, month: 3, day: 10});
assert(fromBag.year() === 2024, "from bag: year 2024");
assert(fromBag.month() === 3, "from bag: month 3");
assert(fromBag.day() === 10, "from bag: day 10");

// === from() with existing PlainDate (clone) ===
var original = Temporal.PlainDate(2024, 7, 4);
var cloned = Temporal.PlainDate.from(original);
assert(cloned.year() === 2024, "from(date) clones year");
assert(cloned.month() === 7, "from(date) clones month");
assert(cloned.day() === 4, "from(date) clones day");
assert(cloned.equals(original), "cloned date equals original");

// === compare() ===
var earlier = Temporal.PlainDate(2024, 1, 1);
var later = Temporal.PlainDate(2024, 12, 31);
assert(Temporal.PlainDate.compare(earlier, later) === -1, "compare: earlier < later");
assert(Temporal.PlainDate.compare(later, earlier) === 1, "compare: later > earlier");
assert(Temporal.PlainDate.compare(earlier, earlier) === 0, "compare: equal dates");

// Compare different years
var y2023 = Temporal.PlainDate(2023, 12, 31);
var y2024 = Temporal.PlainDate(2024, 1, 1);
assert(Temporal.PlainDate.compare(y2023, y2024) === -1, "compare: 2023 < 2024");

// === with() ===
var base = Temporal.PlainDate(2024, 1, 15);
var withDay = base.with({day: 20});
assert(withDay.toString() === "2024-01-20", "with({day:20})");
assert(base.toString() === "2024-01-15", "original unchanged after with()");

var withMonth = base.with({month: 6});
assert(withMonth.toString() === "2024-06-15", "with({month:6})");

var withYear = base.with({year: 2025});
assert(withYear.toString() === "2025-01-15", "with({year:2025})");

var withMultiple = base.with({year: 2025, month: 12, day: 31});
assert(withMultiple.toString() === "2025-12-31", "with multiple fields");

// === add() ===
var addBase = Temporal.PlainDate(2024, 1, 15);

// Add months
var addMonth = addBase.add(Temporal.Duration(0, 1));
assert(addMonth.toString() === "2024-02-15", "add 1 month");

// Add days
var addDays = addBase.add(Temporal.Duration(0, 0, 0, 10));
assert(addDays.toString() === "2024-01-25", "add 10 days");

// Add years
var addYear = addBase.add(Temporal.Duration(1));
assert(addYear.toString() === "2025-01-15", "add 1 year");

// Add with property bag
var addBag = addBase.add({months: 2, days: 5});
assert(addBag.toString() === "2024-03-20", "add {months:2, days:5}");

// Add across month boundary
var addCross = Temporal.PlainDate(2024, 1, 30).add(Temporal.Duration(0, 1));
assert(addCross.month() === 2, "add month from Jan 30 goes to Feb");
assert(addCross.day() === 29, "Jan 30 + 1 month = Feb 29 in leap year");

// === subtract() ===
var subBase = Temporal.PlainDate(2024, 6, 15);

// Subtract months
var subMonth = subBase.subtract(Temporal.Duration(0, 1));
assert(subMonth.toString() === "2024-05-15", "subtract 1 month");

// Subtract weeks
var subWeek = subBase.subtract(Temporal.Duration(0, 0, 1));
assert(subWeek.toString() === "2024-06-08", "subtract 1 week");

// Subtract days
var subDays = subBase.subtract(Temporal.Duration(0, 0, 0, 5));
assert(subDays.toString() === "2024-06-10", "subtract 5 days");

// === until() ===
var start = Temporal.PlainDate(2024, 1, 1);
var end = Temporal.PlainDate(2024, 1, 31);
var dur = start.until(end);
assert(dur.days() === 30, "until: Jan 1 to Jan 31 = 30 days");

var start2 = Temporal.PlainDate(2024, 1, 15);
var end2 = Temporal.PlainDate(2024, 6, 20);
var dur2 = start2.until(end2);
assert(dur2.days() === 157, "until: Jan 15 to Jun 20 = 157 days");

// === since() ===
var since_dur = end.since(start);
assert(since_dur.days() === 30, "since: Jan 31 since Jan 1 = 30 days");

var since_dur2 = end2.since(start2);
assert(since_dur2.days() === 157, "since: Jun 20 since Jan 15 = 157 days");

// === equals() ===
var eq1 = Temporal.PlainDate(2024, 6, 15);
var eq2 = Temporal.PlainDate(2024, 6, 15);
var eq3 = Temporal.PlainDate(2024, 6, 16);
assert(eq1.equals(eq2), "same dates are equal");
assert(!eq1.equals(eq3), "different dates are not equal");
assert(!eq1.equals("not a date"), "equals with non-date returns false");

// === toString() ===
assert(d.toString() === "2024-01-15", "toString format is YYYY-MM-DD");
assert(Temporal.PlainDate(2024, 12, 5).toString() === "2024-12-05", "toString pads month/day");

// === toJSON() ===
assert(d.toJSON() === d.toString(), "toJSON equals toString");

// === valueOf() throws ===
assertThrows(function() {
    Temporal.PlainDate(2024, 1, 1).valueOf();
}, "valueOf throws TypeError");

// === Prototype chain ===
var inst = Temporal.PlainDate(2024, 1, 1);
assert(Object.getPrototypeOf(inst) === Temporal.PlainDate.prototype, "prototype chain is correct");

// === Cross-type: Duration with PlainDate ===
var dateDur = Temporal.Duration(0, 3, 0, 10);
var dateBase = Temporal.PlainDate(2024, 1, 1);
var dateResult = dateBase.add(dateDur);
assert(dateResult.month() === 4, "cross-type: add 3 months gives April");
assert(dateResult.day() === 11, "cross-type: add 10 days gives 11th");

// === Error cases ===
assertThrows(function() {
    Temporal.PlainDate.from();
}, "from() with no args throws");

assertThrows(function() {
    Temporal.PlainDate.compare(earlier);
}, "compare with 1 arg throws");

assertThrows(function() {
    Temporal.PlainDate(2024, 1);
}, "constructor with <3 args throws");

assertThrows(function() {
    Temporal.PlainDate.from("not a date string");
}, "from invalid string throws");

assertThrows(function() {
    Temporal.PlainDate(2024, 13, 1);
}, "invalid month throws");

assertThrows(function() {
    Temporal.PlainDate(2024, 1, 32);
}, "invalid day throws");

// === Summary ===
console.log("Temporal.PlainDate tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
    throw new Error(failed + " tests failed");
}
