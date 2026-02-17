// Set Built-in Tests
// Tests for ECMAScript Set implementation

var passed = 0;
var failed = 0;

function test(name, condition) {
    if (condition) {
        console.log("PASS: " + name);
        passed = passed + 1;
    } else {
        console.log("FAIL: " + name);
        failed = failed + 1;
    }
}

// ============================================================================
// Basic Creation
// ============================================================================

var s1 = new Set();
test("Empty Set creation", s1 !== undefined);
test("Empty Set size is 0", s1.size === 0);

// ============================================================================
// add() and size
// ============================================================================

s1.add(1);
test("After add(1), size is 1", s1.size === 1);

s1.add(2);
s1.add(3);
test("After add(2), add(3), size is 3", s1.size === 3);

// add() returns the Set for chaining
var returnVal = s1.add(4);
test("add() returns the Set", returnVal === s1);

s1.add(5).add(6);
test("Chained add() works", s1.size === 6);

// No duplicates
s1.add(1);
test("Adding duplicate does not change size", s1.size === 6);

// ============================================================================
// has()
// ============================================================================

test("has(1) returns true", s1.has(1) === true);
test("has(3) returns true", s1.has(3) === true);
test("has(99) returns false", s1.has(99) === false);

// ============================================================================
// delete()
// ============================================================================

var deleted = s1.delete(3);
test("delete(3) returns true", deleted === true);
test("After delete(3), has(3) is false", s1.has(3) === false);
test("After delete(3), size is 5", s1.size === 5);

var deletedAgain = s1.delete(3);
test("delete(3) again returns false", deletedAgain === false);

var deletedNonExistent = s1.delete(99);
test("delete(99) returns false", deletedNonExistent === false);

// ============================================================================
// clear()
// ============================================================================

var s2 = new Set();
s2.add(1).add(2).add(3);
s2.clear();
test("After clear(), size is 0", s2.size === 0);
test("After clear(), has(1) is false", s2.has(1) === false);

// ============================================================================
// SameValueZero semantics
// ============================================================================

var s3 = new Set();
s3.add(NaN);
test("NaN can be added to Set", s3.size === 1);
test("has(NaN) returns true", s3.has(NaN) === true);

// Adding NaN again should not create duplicate
s3.add(NaN);
test("NaN is not duplicated", s3.size === 1);

// +0 and -0 are considered equal
s3.add(0);
s3.add(-0);
test("+0 and -0 are treated as equal", s3.size === 2); // NaN and 0

// ============================================================================
// Different value types
// ============================================================================

var s4 = new Set();
s4.add(1);
s4.add("1");
s4.add(true);
s4.add(null);
s4.add(undefined);
test("Different types are distinct", s4.size === 5);
test("has(1) number", s4.has(1) === true);
test("has('1') string", s4.has("1") === true);
test("has(true)", s4.has(true) === true);
test("has(null)", s4.has(null) === true);
test("has(undefined)", s4.has(undefined) === true);

// ============================================================================
// Object references
// ============================================================================

var obj1 = {a: 1};
var obj2 = {a: 1};
var s5 = new Set();
s5.add(obj1);
s5.add(obj2);
test("Different objects are distinct", s5.size === 2);
test("has(obj1)", s5.has(obj1) === true);
test("has(obj2)", s5.has(obj2) === true);
test("has({a:1}) new object", s5.has({a: 1}) === false);

// ============================================================================
// forEach()
// ============================================================================

var s6 = new Set();
s6.add(10).add(20).add(30);
var forEachSum = 0;
var forEachCount = 0;
s6.forEach(function(value) {
    forEachSum = forEachSum + value;
    forEachCount = forEachCount + 1;
});
test("forEach iterates all values", forEachCount === 3);
test("forEach sum is correct", forEachSum === 60);

// ============================================================================
// values() iterator
// ============================================================================

var s7 = new Set();
s7.add("a").add("b").add("c");
var iter = s7.values();
var result1 = iter.next();
test("values() first result not done", result1.done === false);
test("values() first value is 'a'", result1.value === "a");

var result2 = iter.next();
test("values() second value is 'b'", result2.value === "b");

var result3 = iter.next();
test("values() third value is 'c'", result3.value === "c");

var result4 = iter.next();
test("values() fourth result is done", result4.done === true);

// ============================================================================
// keys() is same as values()
// ============================================================================

var s8 = new Set();
s8.add(1).add(2);
var keysIter = s8.keys();
var keysResult = keysIter.next();
test("keys() returns iterator", keysResult.done === false);
test("keys() first value", keysResult.value === 1);

// ============================================================================
// entries() returns [value, value] pairs
// ============================================================================

var s9 = new Set();
s9.add("x").add("y");
var entriesIter = s9.entries();
var entry1 = entriesIter.next();
test("entries() first not done", entry1.done === false);
test("entries() first value[0]", entry1.value[0] === "x");
test("entries() first value[1]", entry1.value[1] === "x");

var entry2 = entriesIter.next();
test("entries() second value[0]", entry2.value[0] === "y");
test("entries() second value[1]", entry2.value[1] === "y");

// ============================================================================
// Constructor with iterable (array)
// ============================================================================

var s10 = new Set([1, 2, 3, 2, 1]);
test("Set from array removes duplicates", s10.size === 3);
test("Set from array has 1", s10.has(1) === true);
test("Set from array has 2", s10.has(2) === true);
test("Set from array has 3", s10.has(3) === true);

// ============================================================================
// Iteration preserves insertion order
// ============================================================================

var s11 = new Set();
s11.add(3).add(1).add(2);
var orderIter = s11.values();
test("Insertion order: first is 3", orderIter.next().value === 3);
test("Insertion order: second is 1", orderIter.next().value === 1);
test("Insertion order: third is 2", orderIter.next().value === 2);

// ============================================================================
// Iteration after delete maintains order
// ============================================================================

var s12 = new Set();
s12.add("a").add("b").add("c").add("d");
s12.delete("b");
var orderIter2 = s12.values();
test("After delete, first is 'a'", orderIter2.next().value === "a");
test("After delete, second is 'c'", orderIter2.next().value === "c");
test("After delete, third is 'd'", orderIter2.next().value === "d");
test("After delete, iteration done", orderIter2.next().done === true);

// ============================================================================
// Summary
// ============================================================================

console.log("");
console.log("===================");
console.log("Tests passed: " + passed);
console.log("Tests failed: " + failed);
console.log("===================");
