// Test: Temporal namespace exists
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

// === Temporal namespace ===
assert(typeof Temporal === "object", "Temporal is an object");
assert(typeof Temporal.Instant === "function", "Temporal.Instant is a function");
assert(typeof Temporal.Now === "object", "Temporal.Now is an object");

// === Temporal.Instant.fromEpochMilliseconds ===
var epoch = Temporal.Instant.fromEpochMilliseconds(0);
assert(epoch.epochMilliseconds === 0, "fromEpochMilliseconds(0) gives epoch 0");
assert(epoch.toString() === "1970-01-01T00:00:00Z", "epoch toString is 1970-01-01T00:00:00Z");

var i1 = Temporal.Instant.fromEpochMilliseconds(1000);
assert(i1.epochMilliseconds === 1000, "fromEpochMilliseconds(1000) gives epoch 1000");
assert(i1.toString() === "1970-01-01T00:00:01Z", "1 second after epoch");

var i2 = Temporal.Instant.fromEpochMilliseconds(1000000000000);
assert(i2.toString() === "2001-09-09T01:46:40Z", "known epoch ms value");

// === Temporal.Instant.from (string parsing) ===
var i3 = Temporal.Instant.from("2024-01-15T12:00:00Z");
assert(i3.toString() === "2024-01-15T12:00:00Z", "from() parses ISO string");

var i4 = Temporal.Instant.from("1970-01-01T00:00:00Z");
assert(i4.epochMilliseconds === 0, "from() epoch string gives 0 ms");

// === Temporal.Instant.from (Instant clone) ===
var original = Temporal.Instant.fromEpochMilliseconds(5000);
var clone = Temporal.Instant.from(original);
assert(clone.epochMilliseconds === 5000, "from(instant) clones correctly");
assert(clone.equals(original), "cloned instant equals original");

// === Temporal.Instant.compare ===
var early = Temporal.Instant.fromEpochMilliseconds(1000);
var late = Temporal.Instant.fromEpochMilliseconds(2000);
assert(Temporal.Instant.compare(early, late) === -1, "compare: early < late = -1");
assert(Temporal.Instant.compare(late, early) === 1, "compare: late > early = 1");
assert(Temporal.Instant.compare(early, early) === 0, "compare: equal = 0");

// === Prototype methods ===

// epochMilliseconds
var ms_inst = Temporal.Instant.fromEpochMilliseconds(42000);
assert(ms_inst.epochMilliseconds === 42000, "epochMilliseconds returns correct value");

// epochNanoseconds (approximation)
assert(ms_inst.epochNanoseconds === 42000000000, "epochNanoseconds returns ms * 1e6");

// equals
var a = Temporal.Instant.fromEpochMilliseconds(100);
var b = Temporal.Instant.fromEpochMilliseconds(100);
var c = Temporal.Instant.fromEpochMilliseconds(200);
assert(a.equals(b), "equal instants are equal");
assert(!a.equals(c), "different instants are not equal");
assert(!a.equals("not an instant"), "equals with non-instant returns false");

// toString
var ts = Temporal.Instant.fromEpochMilliseconds(0);
assert(typeof ts.toString() === "string", "toString returns a string");
assert(ts.toString().indexOf("1970") !== -1, "toString contains year");

// toJSON (same as toString)
assert(ts.toJSON() === ts.toString(), "toJSON returns same as toString");

// valueOf throws
assertThrows(function() {
    var v = Temporal.Instant.fromEpochMilliseconds(0);
    v.valueOf();
}, "valueOf throws TypeError");

// === add and subtract ===
var base = Temporal.Instant.fromEpochMilliseconds(0);

var added = base.add({hours: 1});
assert(added.epochMilliseconds === 3600000, "add 1 hour = 3600000ms");

var added2 = base.add({minutes: 30});
assert(added2.epochMilliseconds === 1800000, "add 30 minutes = 1800000ms");

var added3 = base.add({seconds: 10});
assert(added3.epochMilliseconds === 10000, "add 10 seconds = 10000ms");

var added4 = base.add({milliseconds: 500});
assert(added4.epochMilliseconds === 500, "add 500 milliseconds");

var subtracted = Temporal.Instant.fromEpochMilliseconds(3600000);
var sub_result = subtracted.subtract({hours: 1});
assert(sub_result.epochMilliseconds === 0, "subtract 1 hour from 3600000ms = 0");

var combined = base.add({hours: 1, minutes: 30, seconds: 45});
assert(combined.epochMilliseconds === 5445000, "add combined duration");

// === Temporal.Now ===
var now = Temporal.Now.instant();
assert(typeof now === "object", "Now.instant() returns an object");
assert(now.epochMilliseconds > 0, "Now epoch is positive");
assert(typeof now.toString() === "string", "Now toString returns string");

var tz = Temporal.Now.timeZoneId();
assert(typeof tz === "string", "timeZoneId returns a string");
assert(tz !== "", "timeZoneId is non-empty");

// === Error cases ===
assertThrows(function() {
    Temporal.Instant.from();
}, "from() with no args throws");

assertThrows(function() {
    Temporal.Instant.fromEpochMilliseconds();
}, "fromEpochMilliseconds() with no args throws");

assertThrows(function() {
    Temporal.Instant.compare(early);
}, "compare with 1 arg throws");

// === Instant prototype is correct ===
var inst = Temporal.Instant.fromEpochMilliseconds(0);
assert(Object.getPrototypeOf(inst) === Temporal.Instant.prototype, "prototype chain is correct");

// === Summary ===
console.log("Temporal.Instant tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
    throw new Error(failed + " tests failed");
}
