// Test: Temporal.PlainYearMonth
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

// === Temporal.PlainYearMonth exists ===
assert(typeof Temporal.PlainYearMonth === "function", "Temporal.PlainYearMonth is a function");

// === Constructor ===
var ym = Temporal.PlainYearMonth(2024, 6);
assert(ym.year === 2024, "year returns 2024");
assert(ym.month === 6, "month returns 6");

// === Getters ===
assert(ym.monthCode === "M06", "June monthCode is M06");
assert(ym.daysInMonth === 30, "June has 30 days");
assert(ym.daysInYear === 366, "2024 has 366 days (leap year)");
assert(ym.monthsInYear === 12, "12 months in year");
assert(ym.inLeapYear === true, "2024 is a leap year");
assert(ym.calendarId === "iso8601", "default calendar is iso8601");

// Non-leap year
var ym2023 = Temporal.PlainYearMonth(2023, 2);
assert(ym2023.inLeapYear === false, "2023 is not a leap year");
assert(ym2023.daysInYear === 365, "2023 has 365 days");
assert(ym2023.daysInMonth === 28, "Feb 2023 has 28 days");

// Leap year February
var ymFeb2024 = Temporal.PlainYearMonth(2024, 2);
assert(ymFeb2024.daysInMonth === 29, "Feb 2024 (leap) has 29 days");

// January
var ymJan = Temporal.PlainYearMonth(2024, 1);
assert(ymJan.monthCode === "M01", "January monthCode is M01");
assert(ymJan.daysInMonth === 31, "January has 31 days");

// === from() with string ===
var fromStr = Temporal.PlainYearMonth.from("2024-06");
assert(fromStr.year === 2024, "from string: year 2024");
assert(fromStr.month === 6, "from string: month 6");

// === from() with property bag ===
var fromBag = Temporal.PlainYearMonth.from({year: 2024, month: 3});
assert(fromBag.year === 2024, "from bag: year 2024");
assert(fromBag.month === 3, "from bag: month 3");

// === from() with existing PlainYearMonth (clone) ===
var original = Temporal.PlainYearMonth(2024, 7);
var cloned = Temporal.PlainYearMonth.from(original);
assert(cloned.year === 2024, "from(ym) clones year");
assert(cloned.month === 7, "from(ym) clones month");
assert(cloned.equals(original), "cloned ym equals original");

// === compare() ===
var earlier = Temporal.PlainYearMonth(2024, 1);
var later = Temporal.PlainYearMonth(2024, 12);
assert(Temporal.PlainYearMonth.compare(earlier, later) === -1, "compare: earlier < later");
assert(Temporal.PlainYearMonth.compare(later, earlier) === 1, "compare: later > earlier");
assert(Temporal.PlainYearMonth.compare(earlier, earlier) === 0, "compare: equal");

// Different years
var y2023 = Temporal.PlainYearMonth(2023, 6);
var y2024 = Temporal.PlainYearMonth(2024, 6);
assert(Temporal.PlainYearMonth.compare(y2023, y2024) === -1, "compare: 2023 < 2024");

// === with() ===
var ym1 = Temporal.PlainYearMonth(2024, 6);
var ym2 = ym1.with({month: 12});
assert(ym2.year === 2024, "with: year unchanged");
assert(ym2.month === 12, "with: month changed to 12");

var ym3 = ym1.with({year: 2025});
assert(ym3.year === 2025, "with: year changed to 2025");
assert(ym3.month === 6, "with: month unchanged");

// === add() ===
var ymAdd = Temporal.PlainYearMonth(2024, 6);
var added = ymAdd.add({months: 3});
assert(added.year === 2024, "add 3 months: year 2024");
assert(added.month === 9, "add 3 months: month 9");

// Add across year boundary
var addedYear = ymAdd.add({months: 7});
assert(addedYear.year === 2025, "add 7 months: crosses into 2025");
assert(addedYear.month === 1, "add 7 months: month 1");

// Add years
var addedYears = ymAdd.add({years: 2});
assert(addedYears.year === 2026, "add 2 years: year 2026");
assert(addedYears.month === 6, "add 2 years: month unchanged");

// === subtract() ===
var ymSub = Temporal.PlainYearMonth(2024, 6);
var subtracted = ymSub.subtract({months: 3});
assert(subtracted.year === 2024, "subtract 3 months: year 2024");
assert(subtracted.month === 3, "subtract 3 months: month 3");

// Subtract across year boundary
var subYear = ymSub.subtract({months: 7});
assert(subYear.year === 2023, "subtract 7 months: crosses into 2023");
assert(subYear.month === 11, "subtract 7 months: month 11");

// === until() ===
var ymFrom = Temporal.PlainYearMonth(2024, 1);
var ymTo = Temporal.PlainYearMonth(2024, 7);
var dur = ymFrom.until(ymTo);
assert(dur.months === 6, "until: 6 months difference");

// === since() ===
var durSince = ymTo.since(ymFrom);
assert(durSince.months === 6, "since: 6 months difference");

// === equals() ===
var eq1 = Temporal.PlainYearMonth(2024, 6);
var eq2 = Temporal.PlainYearMonth(2024, 6);
var neq = Temporal.PlainYearMonth(2024, 7);
assert(eq1.equals(eq2), "equals: same year/month");
assert(!eq1.equals(neq), "equals: different month");

// === toPlainDate() ===
var ymDate = Temporal.PlainYearMonth(2024, 6);
var date = ymDate.toPlainDate({day: 15});
assert(date.year === 2024, "toPlainDate: year");
assert(date.month === 6, "toPlainDate: month");
assert(date.day === 15, "toPlainDate: day");

// === toString() ===
var ymStr = Temporal.PlainYearMonth(2024, 6);
var str = ymStr.toString();
assert(typeof str === "string", "toString returns a string");
assert(str.indexOf("2024") !== -1, "toString contains year");
assert(str.indexOf("06") !== -1, "toString contains month");

// === toJSON() ===
var jsonStr = ymStr.toJSON();
assert(jsonStr === str, "toJSON returns same as toString");

// === valueOf() throws ===
assertThrows(function() { ymStr.valueOf(); }, "valueOf throws TypeError");

console.log("Temporal.PlainYearMonth tests: " + passed + " passed, " + failed + " failed");
