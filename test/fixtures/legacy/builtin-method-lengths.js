// Test that built-in method length properties are spec-compliant

function assert(condition, message) {
    if (!condition) {
        throw new Error("FAIL: " + message);
    }
}

// Array static methods
assert(Array.isArray.length === 1, "Array.isArray.length should be 1");
assert(Array.from.length === 1, "Array.from.length should be 1");
assert(Array.of.length === 0, "Array.of.length should be 0");

// Array prototype methods
assert([].push.length === 1, "[].push.length should be 1");
assert([].pop.length === 0, "[].pop.length should be 0");
assert([].shift.length === 0, "[].shift.length should be 0");
assert([].unshift.length === 1, "[].unshift.length should be 1");
assert([].splice.length === 2, "[].splice.length should be 2");
assert([].sort.length === 1, "[].sort.length should be 1");
assert([].fill.length === 1, "[].fill.length should be 1");
assert([].copyWithin.length === 2, "[].copyWithin.length should be 2");
assert([].forEach.length === 1, "[].forEach.length should be 1");
assert([].map.length === 1, "[].map.length should be 1");
assert([].filter.length === 1, "[].filter.length should be 1");
assert([].reduce.length === 1, "[].reduce.length should be 1");
assert([].find.length === 1, "[].find.length should be 1");
assert([].findIndex.length === 1, "[].findIndex.length should be 1");
assert([].indexOf.length === 1, "[].indexOf.length should be 1");
assert([].includes.length === 1, "[].includes.length should be 1");
assert([].slice.length === 2, "[].slice.length should be 2");
assert([].concat.length === 1, "[].concat.length should be 1");
assert([].join.length === 1, "[].join.length should be 1");
assert([].flat.length === 0, "[].flat.length should be 0");
assert([].flatMap.length === 1, "[].flatMap.length should be 1");
assert([].at.length === 1, "[].at.length should be 1");
assert([].toReversed.length === 0, "[].toReversed.length should be 0");
assert([].toSorted.length === 1, "[].toSorted.length should be 1");
assert([].toSpliced.length === 2, "[].toSpliced.length should be 2");
assert([].with.length === 2, "[].with.length should be 2");

// Object static methods
assert(Object.keys.length === 1, "Object.keys.length should be 1");
assert(Object.values.length === 1, "Object.values.length should be 1");
assert(Object.entries.length === 1, "Object.entries.length should be 1");
assert(Object.defineProperty.length === 3, "Object.defineProperty.length should be 3");
assert(Object.create.length === 2, "Object.create.length should be 2");
assert(Object.getPrototypeOf.length === 1, "Object.getPrototypeOf.length should be 1");
assert(Object.assign.length === 2, "Object.assign.length should be 2");
assert(Object.freeze.length === 1, "Object.freeze.length should be 1");
assert(Object.is.length === 2, "Object.is.length should be 2");
assert(Object.hasOwn.length === 2, "Object.hasOwn.length should be 2");
assert(Object.groupBy.length === 2, "Object.groupBy.length should be 2");

// Object prototype methods
assert(({}).hasOwnProperty.length === 1, "hasOwnProperty.length should be 1");
assert(({}).propertyIsEnumerable.length === 1, "propertyIsEnumerable.length should be 1");
assert(({}).isPrototypeOf.length === 1, "isPrototypeOf.length should be 1");

// String static methods
assert(String.fromCharCode.length === 1, "String.fromCharCode.length should be 1");
assert(String.raw.length === 1, "String.raw.length should be 1");

// String prototype methods
assert("".charAt.length === 1, "charAt.length should be 1");
assert("".indexOf.length === 1, "indexOf.length should be 1");
assert("".slice.length === 2, "slice.length should be 2");
assert("".split.length === 2, "split.length should be 2");
assert("".replace.length === 2, "replace.length should be 2");
assert("".trim.length === 0, "trim.length should be 0");
assert("".padStart.length === 1, "padStart.length should be 1");
assert("".repeat.length === 1, "repeat.length should be 1");
assert("".startsWith.length === 1, "startsWith.length should be 1");
assert("".includes.length === 1, "includes.length should be 1");

// Number static methods
assert(Number.isNaN.length === 1, "Number.isNaN.length should be 1");
assert(Number.isFinite.length === 1, "Number.isFinite.length should be 1");
assert(Number.parseInt.length === 2, "Number.parseInt.length should be 2");

// Number prototype methods
var n = 1;
assert(n.toFixed.length === 1, "toFixed.length should be 1");
assert(n.toString.length === 1, "Number.prototype.toString.length should be 1");

// Math methods
assert(Math.abs.length === 1, "Math.abs.length should be 1");
assert(Math.max.length === 2, "Math.max.length should be 2");
assert(Math.min.length === 2, "Math.min.length should be 2");
assert(Math.pow.length === 2, "Math.pow.length should be 2");
assert(Math.random.length === 0, "Math.random.length should be 0");

// Function prototype methods
assert(Function.prototype.call.length === 1, "call.length should be 1");
assert(Function.prototype.apply.length === 2, "apply.length should be 2");
assert(Function.prototype.bind.length === 1, "bind.length should be 1");

// Promise static methods
assert(Promise.resolve.length === 1, "Promise.resolve.length should be 1");
assert(Promise.reject.length === 1, "Promise.reject.length should be 1");
assert(Promise.all.length === 1, "Promise.all.length should be 1");

// Date static methods
assert(Date.now.length === 0, "Date.now.length should be 0");
assert(Date.parse.length === 1, "Date.parse.length should be 1");
assert(Date.UTC.length === 7, "Date.UTC.length should be 7");

// Date prototype methods
var d = new Date();
assert(d.setDate.length === 1, "setDate.length should be 1");
assert(d.setFullYear.length === 3, "setFullYear.length should be 3");
assert(d.setHours.length === 4, "setHours.length should be 4");
assert(d.toJSON.length === 1, "toJSON.length should be 1");
assert(d.getTime.length === 0, "getTime.length should be 0");

// Map prototype methods
var m = new Map();
assert(m.get.length === 1, "Map.prototype.get.length should be 1");
assert(m.set.length === 2, "Map.prototype.set.length should be 2");
assert(m.has.length === 1, "Map.prototype.has.length should be 1");
assert(m.delete.length === 1, "Map.prototype.delete.length should be 1");
assert(m.forEach.length === 1, "Map.prototype.forEach.length should be 1");

// Set prototype methods
var s = new Set();
assert(s.add.length === 1, "Set.prototype.add.length should be 1");
assert(s.has.length === 1, "Set.prototype.has.length should be 1");
assert(s.delete.length === 1, "Set.prototype.delete.length should be 1");
assert(s.forEach.length === 1, "Set.prototype.forEach.length should be 1");

// WeakMap prototype methods
var wm = new WeakMap();
assert(wm.get.length === 1, "WeakMap.prototype.get.length should be 1");
assert(wm.set.length === 2, "WeakMap.prototype.set.length should be 2");
assert(wm.has.length === 1, "WeakMap.prototype.has.length should be 1");
assert(wm.delete.length === 1, "WeakMap.prototype.delete.length should be 1");

// WeakSet prototype methods
var ws = new WeakSet();
assert(ws.add.length === 1, "WeakSet.prototype.add.length should be 1");
assert(ws.has.length === 1, "WeakSet.prototype.has.length should be 1");
assert(ws.delete.length === 1, "WeakSet.prototype.delete.length should be 1");

// RegExp prototype methods
var r = /a/;
assert(r.test.length === 1, "RegExp.prototype.test.length should be 1");
assert(r.exec.length === 1, "RegExp.prototype.exec.length should be 1");
assert(r.toString.length === 0, "RegExp.prototype.toString.length should be 0");

// Temporal.Now methods
assert(Temporal.Now.instant.length === 0, "Temporal.Now.instant.length should be 0");
assert(Temporal.Now.plainDateISO.length === 0, "Temporal.Now.plainDateISO.length should be 0");
assert(Temporal.Now.plainTimeISO.length === 0, "Temporal.Now.plainTimeISO.length should be 0");
assert(Temporal.Now.plainDateTimeISO.length === 0, "Temporal.Now.plainDateTimeISO.length should be 0");

// Temporal.Instant prototype methods
var inst = Temporal.Now.instant();
assert(inst.toString.length === 0, "Temporal.Instant.prototype.toString.length should be 0");
assert(inst.equals.length === 1, "Temporal.Instant.prototype.equals.length should be 1");
assert(inst.add.length === 1, "Temporal.Instant.prototype.add.length should be 1");
assert(inst.subtract.length === 1, "Temporal.Instant.prototype.subtract.length should be 1");

// Temporal.PlainDate prototype methods
var pd = Temporal.Now.plainDateISO();
assert(pd.toString.length === 0, "Temporal.PlainDate.prototype.toString.length should be 0");
assert(pd.equals.length === 1, "Temporal.PlainDate.prototype.equals.length should be 1");
assert(pd.add.length === 1, "Temporal.PlainDate.prototype.add.length should be 1");

// Temporal.Duration static & prototype methods
assert(Temporal.Duration.from.length === 1, "Temporal.Duration.from.length should be 1");
assert(Temporal.Duration.compare.length === 2, "Temporal.Duration.compare.length should be 2");

// length descriptor properties
var desc = Object.getOwnPropertyDescriptor([].push, "length");
assert(desc.writable === false, "length should not be writable");
assert(desc.enumerable === false, "length should not be enumerable");
assert(desc.configurable === true, "length should be configurable");

console.log("All built-in method length tests passed!");
