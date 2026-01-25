// WeakSet Built-in Tests
// Tests for ECMAScript WeakSet implementation

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

var ws1 = new WeakSet();
test("Empty WeakSet creation", ws1 !== undefined);

// ============================================================================
// add() and has() with objects
// ============================================================================

var obj1 = { name: "obj1" };
var obj2 = { name: "obj2" };

ws1.add(obj1);
test("has() returns true after add", ws1.has(obj1) === true);

ws1.add(obj2);
test("has() returns true for second object", ws1.has(obj2) === true);

// Adding same object again is a no-op
ws1.add(obj1);
test("Adding duplicate does not error", ws1.has(obj1) === true);

// ============================================================================
// has() returns false for missing objects
// ============================================================================

var obj3 = { name: "obj3" };
test("has() returns false for missing object", ws1.has(obj3) === false);
test("has() returns false for new object", ws1.has({}) === false);

// ============================================================================
// delete()
// ============================================================================

var deleted = ws1.delete(obj1);
test("delete() returns true for existing value", deleted === true);
test("has() returns false after delete", ws1.has(obj1) === false);

var deletedAgain = ws1.delete(obj1);
test("delete() returns false for already deleted value", deletedAgain === false);

var deletedNonExistent = ws1.delete(obj3);
test("delete() returns false for non-existent value", deletedNonExistent === false);

// ============================================================================
// Chaining with add()
// ============================================================================

var ws2 = new WeakSet();
var chainObj1 = { id: 1 };
var chainObj2 = { id: 2 };

var returnVal = ws2.add(chainObj1);
test("add() returns the WeakSet", returnVal === ws2);

ws2.add(chainObj1).add(chainObj2);
test("Chained add() works - first", ws2.has(chainObj1) === true);
test("Chained add() works - second", ws2.has(chainObj2) === true);

// ============================================================================
// Different objects are distinct
// ============================================================================

var ws3 = new WeakSet();
var similar1 = { a: 1 };
var similar2 = { a: 1 };
ws3.add(similar1);
ws3.add(similar2);
test("Similar objects are distinct - has first", ws3.has(similar1) === true);
test("Similar objects are distinct - has second", ws3.has(similar2) === true);

// A new object with same structure is not in the set
test("New similar object not in set", ws3.has({ a: 1 }) === false);

// ============================================================================
// Primitive values throw TypeError
// ============================================================================

var ws4 = new WeakSet();
var primitiveTestPassed = false;

try {
    ws4.add("string");
} catch (e) {
    primitiveTestPassed = true;
}
test("String value throws TypeError", primitiveTestPassed);

primitiveTestPassed = false;
try {
    ws4.add(123);
} catch (e) {
    primitiveTestPassed = true;
}
test("Number value throws TypeError", primitiveTestPassed);

primitiveTestPassed = false;
try {
    ws4.add(null);
} catch (e) {
    primitiveTestPassed = true;
}
test("null value throws TypeError", primitiveTestPassed);

primitiveTestPassed = false;
try {
    ws4.add(undefined);
} catch (e) {
    primitiveTestPassed = true;
}
test("undefined value throws TypeError", primitiveTestPassed);

primitiveTestPassed = false;
try {
    ws4.add(true);
} catch (e) {
    primitiveTestPassed = true;
}
test("Boolean value throws TypeError", primitiveTestPassed);

// ============================================================================
// Primitive values with has() and delete() return false (no throw)
// ============================================================================

test("has() with string returns false", ws4.has("string") === false);
test("has() with number returns false", ws4.has(123) === false);
test("delete() with string returns false", ws4.delete("string") === false);

// ============================================================================
// Constructor with iterable
// ============================================================================

var iterObj1 = { k: 1 };
var iterObj2 = { k: 2 };
var initArray = [iterObj1, iterObj2];
var ws5 = new WeakSet(initArray);
test("Constructor with array - first value", ws5.has(iterObj1) === true);
test("Constructor with array - second value", ws5.has(iterObj2) === true);

// ============================================================================
// Constructor with null/undefined creates empty WeakSet
// ============================================================================

var ws6 = new WeakSet(null);
test("Constructor with null creates empty WeakSet", ws6 !== undefined);

var ws7 = new WeakSet(undefined);
test("Constructor with undefined creates empty WeakSet", ws7 !== undefined);

// ============================================================================
// Function objects as values
// ============================================================================

var ws8 = new WeakSet();
var funcVal = function() { return 42; };
ws8.add(funcVal);
test("Function can be added", ws8.has(funcVal) === true);

var deleted2 = ws8.delete(funcVal);
test("Function can be deleted", deleted2 === true);
test("has() false after function deleted", ws8.has(funcVal) === false);

// ============================================================================
// Multiple operations
// ============================================================================

var ws9 = new WeakSet();
var multiObj1 = { x: 1 };
var multiObj2 = { x: 2 };
var multiObj3 = { x: 3 };

ws9.add(multiObj1).add(multiObj2).add(multiObj3);
test("Multiple adds work", ws9.has(multiObj1) && ws9.has(multiObj2) && ws9.has(multiObj3));

ws9.delete(multiObj2);
test("After delete middle, first still exists", ws9.has(multiObj1) === true);
test("After delete middle, middle gone", ws9.has(multiObj2) === false);
test("After delete middle, third still exists", ws9.has(multiObj3) === true);

// ============================================================================
// Summary
// ============================================================================

console.log("");
console.log("===================");
console.log("Tests passed: " + passed);
console.log("Tests failed: " + failed);
console.log("===================");
