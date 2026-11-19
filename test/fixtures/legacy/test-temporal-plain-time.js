// Test: Temporal.PlainTime
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

// === Temporal.PlainTime exists ===
assert(typeof Temporal.PlainTime === "function", "Temporal.PlainTime is a function");

// === Constructor with all args ===
var t = Temporal.PlainTime(10, 30, 45, 100, 200, 300);
assert(t.hour === 10, "hour returns 10");
assert(t.minute === 30, "minute returns 30");
assert(t.second === 45, "second returns 45");
assert(t.millisecond === 100, "millisecond returns 100");
assert(t.microsecond === 200, "microsecond returns 200");
assert(t.nanosecond === 300, "nanosecond returns 300");

// === Constructor with defaults ===
var t0 = Temporal.PlainTime();
assert(t0.hour === 0, "default hour is 0");
assert(t0.minute === 0, "default minute is 0");
assert(t0.second === 0, "default second is 0");
assert(t0.millisecond === 0, "default millisecond is 0");
assert(t0.microsecond === 0, "default microsecond is 0");
assert(t0.nanosecond === 0, "default nanosecond is 0");

// === Constructor with partial args ===
var t1 = Temporal.PlainTime(14);
assert(t1.hour === 14, "partial: hour 14");
assert(t1.minute === 0, "partial: minute defaults to 0");

var t2 = Temporal.PlainTime(14, 30);
assert(t2.hour === 14, "partial: hour 14");
assert(t2.minute === 30, "partial: minute 30");
assert(t2.second === 0, "partial: second defaults to 0");

// === from() with string ===
var fromStr = Temporal.PlainTime.from("12:30:00");
assert(fromStr.hour === 12, "from string: hour 12");
assert(fromStr.minute === 30, "from string: minute 30");
assert(fromStr.second === 0, "from string: second 0");

var fromStr2 = Temporal.PlainTime.from("08:15:30.123");
assert(fromStr2.hour === 8, "from string: hour 8");
assert(fromStr2.minute === 15, "from string: minute 15");
assert(fromStr2.second === 30, "from string: second 30");
assert(fromStr2.millisecond === 123, "from string: millisecond 123");

// === from() with property bag ===
var fromBag = Temporal.PlainTime.from({hour: 9, minute: 45, second: 15});
assert(fromBag.hour === 9, "from bag: hour 9");
assert(fromBag.minute === 45, "from bag: minute 45");
assert(fromBag.second === 15, "from bag: second 15");

// === from() with existing PlainTime (clone) ===
var original = Temporal.PlainTime(15, 30, 0);
var cloned = Temporal.PlainTime.from(original);
assert(cloned.hour === 15, "from(time) clones hour");
assert(cloned.minute === 30, "from(time) clones minute");
assert(cloned.equals(original), "cloned time equals original");

// === compare() ===
var earlier = Temporal.PlainTime(8, 0, 0);
var later = Temporal.PlainTime(17, 30, 0);
assert(Temporal.PlainTime.compare(earlier, later) === -1, "compare: earlier < later");
assert(Temporal.PlainTime.compare(later, earlier) === 1, "compare: later > earlier");
assert(Temporal.PlainTime.compare(earlier, earlier) === 0, "compare: equal times");

// Compare same hour different minutes
var t830 = Temporal.PlainTime(8, 30, 0);
assert(Temporal.PlainTime.compare(earlier, t830) === -1, "compare: 8:00 < 8:30");

// === with() ===
var base = Temporal.PlainTime(10, 30, 0);
var withHour = base.with({hour: 14});
assert(withHour.hour === 14, "with({hour:14}) changes hour");
assert(withHour.minute === 30, "with({hour:14}) preserves minute");
assert(base.hour === 10, "original unchanged after with()");

var withMinute = base.with({minute: 45});
assert(withMinute.hour === 10, "with({minute:45}) preserves hour");
assert(withMinute.minute === 45, "with({minute:45}) changes minute");

var withSecond = base.with({second: 30});
assert(withSecond.second === 30, "with({second:30}) changes second");

var withMultiple = base.with({hour: 23, minute: 59, second: 59});
assert(withMultiple.hour === 23, "with multiple: hour");
assert(withMultiple.minute === 59, "with multiple: minute");
assert(withMultiple.second === 59, "with multiple: second");

// === add() ===
var addBase = Temporal.PlainTime(10, 30, 0);

// Add hours
var addHours = addBase.add(Temporal.Duration(0, 0, 0, 0, 2));
assert(addHours.hour === 12, "add 2 hours");
assert(addHours.minute === 30, "add hours preserves minutes");

// Add minutes
var addMinutes = addBase.add(Temporal.Duration(0, 0, 0, 0, 0, 45));
assert(addMinutes.hour === 11, "add 45 minutes: hour becomes 11");
assert(addMinutes.minute === 15, "add 45 minutes: minute becomes 15");

// Add with property bag
var addBag = addBase.add({hours: 1, minutes: 30});
assert(addBag.hour === 12, "add {hours:1, minutes:30}: hour 12");
assert(addBag.minute === 0, "add {hours:1, minutes:30}: minute 0");

// Add wraps around midnight
var addWrap = Temporal.PlainTime(23, 0, 0).add(Temporal.Duration(0, 0, 0, 0, 2));
assert(addWrap.hour === 1, "add past midnight wraps: 23:00 + 2h = 01:00");

// === subtract() ===
var subBase = Temporal.PlainTime(14, 30, 0);

// Subtract hours
var subHours = subBase.subtract(Temporal.Duration(0, 0, 0, 0, 2));
assert(subHours.hour === 12, "subtract 2 hours");
assert(subHours.minute === 30, "subtract hours preserves minutes");

// Subtract minutes
var subMinutes = subBase.subtract(Temporal.Duration(0, 0, 0, 0, 0, 45));
assert(subMinutes.hour === 13, "subtract 45 minutes: hour becomes 13");
assert(subMinutes.minute === 45, "subtract 45 minutes: minute becomes 45");

// Subtract wraps around midnight
var subWrap = Temporal.PlainTime(1, 0, 0).subtract(Temporal.Duration(0, 0, 0, 0, 3));
assert(subWrap.hour === 22, "subtract past midnight wraps: 01:00 - 3h = 22:00");

// === until() ===
var start = Temporal.PlainTime(10, 0, 0);
var end = Temporal.PlainTime(14, 30, 0);
var dur = start.until(end);
assert(dur.hours === 4, "until: 10:00 to 14:30 = 4 hours");
assert(dur.minutes === 30, "until: 10:00 to 14:30 = 30 minutes");

// === since() ===
var sinceDur = end.since(start);
assert(sinceDur.hours === 4, "since: 14:30 since 10:00 = 4 hours");
assert(sinceDur.minutes === 30, "since: 14:30 since 10:00 = 30 minutes");

// === equals() ===
var eq1 = Temporal.PlainTime(12, 30, 0);
var eq2 = Temporal.PlainTime(12, 30, 0);
var eq3 = Temporal.PlainTime(12, 30, 1);
assert(eq1.equals(eq2), "same times are equal");
assert(!eq1.equals(eq3), "different times are not equal");
assert(!eq1.equals("not a time"), "equals with non-time returns false");

// === toString() ===
assert(Temporal.PlainTime(12, 30, 0).toString() === "12:30:00", "toString 12:30:00");
assert(Temporal.PlainTime(8, 5, 3).toString() === "08:05:03", "toString pads digits");
assert(Temporal.PlainTime(0, 0, 0).toString() === "00:00:00", "toString midnight");

// === toJSON() ===
var tJson = Temporal.PlainTime(10, 30, 0);
assert(tJson.toJSON() === tJson.toString(), "toJSON equals toString");

// === valueOf() throws ===
assertThrows(function() {
    Temporal.PlainTime(12, 0, 0).valueOf();
}, "valueOf throws TypeError");

// === Prototype chain ===
var inst = Temporal.PlainTime(12, 0, 0);
assert(Object.getPrototypeOf(inst) === Temporal.PlainTime.prototype, "prototype chain is correct");

// === Error cases ===
assertThrows(function() {
    Temporal.PlainTime.from();
}, "from() with no args throws");

assertThrows(function() {
    Temporal.PlainTime.compare(earlier);
}, "compare with 1 arg throws");

assertThrows(function() {
    Temporal.PlainTime.from("not a time string");
}, "from invalid string throws");

assertThrows(function() {
    Temporal.PlainTime(25, 0, 0);
}, "invalid hour throws");

assertThrows(function() {
    Temporal.PlainTime(0, 60, 0);
}, "invalid minute throws");

assertThrows(function() {
    Temporal.PlainTime(0, 0, 60);
}, "invalid second throws");

// === Summary ===
console.log("Temporal.PlainTime tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
    throw new Error(failed + " tests failed");
}
