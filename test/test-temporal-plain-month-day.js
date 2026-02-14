// Test: Temporal.PlainMonthDay
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

// === Temporal.PlainMonthDay exists ===
assert(typeof Temporal.PlainMonthDay === "function", "Temporal.PlainMonthDay is a function");

// === Constructor ===
var md = Temporal.PlainMonthDay(12, 25);
assert(md.day === 25, "day returns 25");
assert(md.monthCode === "M12", "December monthCode is M12");
assert(md.calendarId === "iso8601", "default calendar is iso8601");

// Different months
var jan1 = Temporal.PlainMonthDay(1, 1);
assert(jan1.day === 1, "Jan 1 day");
assert(jan1.monthCode === "M01", "Jan monthCode M01");

var feb14 = Temporal.PlainMonthDay(2, 14);
assert(feb14.day === 14, "Feb 14 day");
assert(feb14.monthCode === "M02", "Feb monthCode M02");

var oct31 = Temporal.PlainMonthDay(10, 31);
assert(oct31.day === 31, "Oct 31 day");
assert(oct31.monthCode === "M10", "Oct monthCode M10");

// === from() with string ===
var fromStr = Temporal.PlainMonthDay.from("--12-25");
assert(fromStr.day === 25, "from string: day 25");
assert(fromStr.monthCode === "M12", "from string: monthCode M12");

// === from() with property bag ===
var fromBag = Temporal.PlainMonthDay.from({monthCode: "M06", day: 15});
assert(fromBag.day === 15, "from bag: day 15");
assert(fromBag.monthCode === "M06", "from bag: monthCode M06");

// from() with month/day numbers
var fromBag2 = Temporal.PlainMonthDay.from({month: 3, day: 10});
assert(fromBag2.day === 10, "from bag (month): day 10");
assert(fromBag2.monthCode === "M03", "from bag (month): monthCode M03");

// === from() with existing PlainMonthDay (clone) ===
var originalMd = Temporal.PlainMonthDay(7, 4);
var clonedMd = Temporal.PlainMonthDay.from(originalMd);
assert(clonedMd.day === 4, "from(md) clones day");
assert(clonedMd.monthCode === "M07", "from(md) clones monthCode");
assert(clonedMd.equals(originalMd), "cloned md equals original");

// === with() ===
var md1 = Temporal.PlainMonthDay(6, 15);
var md2 = md1.with({day: 20});
assert(md2.day === 20, "with: day changed to 20");
assert(md2.monthCode === "M06", "with: monthCode unchanged");

// === equals() ===
var eqMd1 = Temporal.PlainMonthDay(12, 25);
var eqMd2 = Temporal.PlainMonthDay(12, 25);
var neqMd = Temporal.PlainMonthDay(12, 26);
assert(eqMd1.equals(eqMd2), "equals: same month/day");
assert(!eqMd1.equals(neqMd), "equals: different day");

// Different month
var neqMonth = Temporal.PlainMonthDay(11, 25);
assert(!eqMd1.equals(neqMonth), "equals: different month");

// === toPlainDate() ===
var mdDate = Temporal.PlainMonthDay(6, 15);
var date = mdDate.toPlainDate({year: 2024});
assert(date.year === 2024, "toPlainDate: year");
assert(date.month === 6, "toPlainDate: month");
assert(date.day === 15, "toPlainDate: day");

// toPlainDate with different year
var date2 = mdDate.toPlainDate({year: 2023});
assert(date2.year === 2023, "toPlainDate: year 2023");
assert(date2.month === 6, "toPlainDate: month 6");
assert(date2.day === 15, "toPlainDate: day 15");

// === toString() ===
var mdStr = Temporal.PlainMonthDay(12, 25);
var str = mdStr.toString();
assert(typeof str === "string", "toString returns a string");
assert(str.indexOf("12") !== -1, "toString contains month");
assert(str.indexOf("25") !== -1, "toString contains day");

// === toJSON() ===
var jsonStr = mdStr.toJSON();
assert(jsonStr === str, "toJSON returns same as toString");

// === valueOf() throws ===
assertThrows(function() { mdStr.valueOf(); }, "valueOf throws TypeError");

// === Edge cases ===
// Feb 29 (leap day)
var leapDay = Temporal.PlainMonthDay(2, 29);
assert(leapDay.day === 29, "leap day: day 29");
assert(leapDay.monthCode === "M02", "leap day: monthCode M02");

console.log("Temporal.PlainMonthDay tests: " + passed + " passed, " + failed + " failed");
