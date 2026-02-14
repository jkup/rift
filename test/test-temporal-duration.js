// Test: Temporal.Duration
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

// === Temporal.Duration exists ===
assert(typeof Temporal.Duration === "function", "Temporal.Duration is a function");

// === Constructor with all 10 args ===
var d = Temporal.Duration(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
assert(d.years() === 1, "years() returns 1");
assert(d.months() === 2, "months() returns 2");
assert(d.weeks() === 3, "weeks() returns 3");
assert(d.days() === 4, "days() returns 4");
assert(d.hours() === 5, "hours() returns 5");
assert(d.minutes() === 6, "minutes() returns 6");
assert(d.seconds() === 7, "seconds() returns 7");
assert(d.milliseconds() === 8, "milliseconds() returns 8");
assert(d.microseconds() === 9, "microseconds() returns 9");
assert(d.nanoseconds() === 10, "nanoseconds() returns 10");

// === Default args (all zero) ===
var zero = Temporal.Duration();
assert(zero.years() === 0, "default years is 0");
assert(zero.months() === 0, "default months is 0");
assert(zero.weeks() === 0, "default weeks is 0");
assert(zero.days() === 0, "default days is 0");
assert(zero.hours() === 0, "default hours is 0");
assert(zero.minutes() === 0, "default minutes is 0");
assert(zero.seconds() === 0, "default seconds is 0");
assert(zero.milliseconds() === 0, "default milliseconds is 0");
assert(zero.microseconds() === 0, "default microseconds is 0");
assert(zero.nanoseconds() === 0, "default nanoseconds is 0");

// === sign() ===
var pos = Temporal.Duration(1);
assert(pos.sign() === 1, "positive duration sign is 1");

var neg = Temporal.Duration(-1);
assert(neg.sign() === -1, "negative duration sign is -1");

assert(zero.sign() === 0, "zero duration sign is 0");

// === blank() ===
assert(zero.blank() === true, "zero duration is blank");
assert(pos.blank() === false, "positive duration is not blank");
assert(neg.blank() === false, "negative duration is not blank");

// === from() with string ===
var fromStr = Temporal.Duration.from("PT1H30M");
assert(fromStr.hours() === 1, "from('PT1H30M') hours is 1");
assert(fromStr.minutes() === 30, "from('PT1H30M') minutes is 30");

var fromStr2 = Temporal.Duration.from("P1Y2M3DT4H5M6S");
assert(fromStr2.years() === 1, "from string: years 1");
assert(fromStr2.months() === 2, "from string: months 2");
assert(fromStr2.days() === 3, "from string: days 3");
assert(fromStr2.hours() === 4, "from string: hours 4");
assert(fromStr2.minutes() === 5, "from string: minutes 5");
assert(fromStr2.seconds() === 6, "from string: seconds 6");

// === from() with property bag ===
var fromBag = Temporal.Duration.from({hours: 2, minutes: 45});
assert(fromBag.hours() === 2, "from({hours:2}) hours is 2");
assert(fromBag.minutes() === 45, "from({minutes:45}) minutes is 45");
assert(fromBag.years() === 0, "from bag: unset years is 0");

// === from() with existing Duration (clone) ===
var original = Temporal.Duration(5, 0, 0, 0, 10);
var cloned = Temporal.Duration.from(original);
assert(cloned.years() === 5, "from(duration) clones years");
assert(cloned.hours() === 10, "from(duration) clones hours");

// === abs() ===
var negative = Temporal.Duration(-1, -2, -3, -4, -5, -6, -7, -8);
var absolute = negative.abs();
assert(absolute.years() === 1, "abs() years");
assert(absolute.months() === 2, "abs() months");
assert(absolute.hours() === 5, "abs() hours");
assert(absolute.sign() === 1, "abs() sign is positive");

// === negated() ===
var positive = Temporal.Duration(1, 2, 3);
var negated = positive.negated();
assert(negated.years() === -1, "negated() years");
assert(negated.months() === -2, "negated() months");
assert(negated.weeks() === -3, "negated() weeks");
assert(negated.sign() === -1, "negated() sign is negative");

// Double negation returns to original
var doubleNeg = negated.negated();
assert(doubleNeg.years() === 1, "double negated returns to original");

// === add() ===
var d1 = Temporal.Duration(0, 0, 0, 0, 1, 30);
var d2 = Temporal.Duration(0, 0, 0, 0, 2, 15);
var sum = d1.add(d2);
assert(sum.hours() === 3, "add: hours 1+2=3");
assert(sum.minutes() === 45, "add: minutes 30+15=45");

// Add with property bag
var addBag = d1.add({hours: 1});
assert(addBag.hours() === 2, "add with property bag");

// Add with string
var addStr = d1.add("PT30M");
assert(addStr.hours() === 2, "add with string: 1h30m + 30m = 2h");
assert(addStr.minutes() === 0, "add with string: balanced to 0 minutes");

// === subtract() ===
var sub = d2.subtract(d1);
assert(sub.hours() === 0, "subtract: 2h15m - 1h30m = 0h45m hours");
assert(sub.minutes() === 45, "subtract: 2h15m - 1h30m = 0h45m minutes");

// === toString() ===
var ts1 = Temporal.Duration(1, 2, 3, 4, 5, 6, 7);
var str = ts1.toString();
assert(typeof str === "string", "toString returns a string");
assert(str.indexOf("P") === 0, "toString starts with P");

var ts2 = Temporal.Duration(0, 0, 0, 0, 1, 30);
assert(ts2.toString() === "PT1H30M", "PT1H30M toString");

var ts3 = Temporal.Duration(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
assert(ts3.toString() === "PT0S", "zero duration toString is PT0S");

// === toJSON() ===
var json = Temporal.Duration(0, 0, 0, 0, 1).toJSON();
assert(json === Temporal.Duration(0, 0, 0, 0, 1).toString(), "toJSON equals toString");

// === valueOf() throws ===
assertThrows(function() {
    Temporal.Duration(1).valueOf();
}, "valueOf throws TypeError");

// === compare() ===
var short_dur = Temporal.Duration(0, 0, 0, 0, 1);
var long_dur = Temporal.Duration(0, 0, 0, 0, 2);
assert(Temporal.Duration.compare(short_dur, long_dur) === -1, "compare: shorter < longer");
assert(Temporal.Duration.compare(long_dur, short_dur) === 1, "compare: longer > shorter");
assert(Temporal.Duration.compare(short_dur, short_dur) === 0, "compare: equal durations");

// Compare with zero
var zeroDur = Temporal.Duration();
assert(Temporal.Duration.compare(zeroDur, short_dur) === -1, "compare: zero < positive");

// === Prototype chain ===
var inst = Temporal.Duration(1);
assert(Object.getPrototypeOf(inst) === Temporal.Duration.prototype, "prototype chain is correct");

// === Error cases ===
assertThrows(function() {
    Temporal.Duration.from();
}, "from() with no args throws");

assertThrows(function() {
    Temporal.Duration.compare(short_dur);
}, "compare with 1 arg throws");

assertThrows(function() {
    Temporal.Duration.from("invalid duration string");
}, "from invalid string throws");

// === Summary ===
console.log("Temporal.Duration tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
    throw new Error(failed + " tests failed");
}
