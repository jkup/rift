// WeakMap Built-in Tests
// Tests for ECMAScript WeakMap implementation

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

var wm1 = new WeakMap();
test("Empty WeakMap creation", wm1 !== undefined);

// ============================================================================
// set() and get() with objects
// ============================================================================

var obj1 = { name: "obj1" };
var obj2 = { name: "obj2" };

wm1.set(obj1, "value1");
test("get() returns value for set key", wm1.get(obj1) === "value1");

wm1.set(obj2, 42);
test("get() returns number value", wm1.get(obj2) === 42);

// Overwrite existing key
wm1.set(obj1, "updated");
test("set() overwrites existing key", wm1.get(obj1) === "updated");

// ============================================================================
// get() returns undefined for missing keys
// ============================================================================

var obj3 = { name: "obj3" };
test("get() returns undefined for missing key", wm1.get(obj3) === undefined);
test("get() returns undefined for new object", wm1.get({}) === undefined);

// ============================================================================
// has()
// ============================================================================

test("has() returns true for existing key", wm1.has(obj1) === true);
test("has() returns true for obj2", wm1.has(obj2) === true);
test("has() returns false for missing key", wm1.has(obj3) === false);
test("has() returns false for new object", wm1.has({}) === false);

// ============================================================================
// delete()
// ============================================================================

var deleted = wm1.delete(obj1);
test("delete() returns true for existing key", deleted === true);
test("has() returns false after delete", wm1.has(obj1) === false);
test("get() returns undefined after delete", wm1.get(obj1) === undefined);

var deletedAgain = wm1.delete(obj1);
test("delete() returns false for already deleted key", deletedAgain === false);

var deletedNonExistent = wm1.delete(obj3);
test("delete() returns false for non-existent key", deletedNonExistent === false);

// ============================================================================
// Chaining with set()
// ============================================================================

var wm2 = new WeakMap();
var chainObj1 = { id: 1 };
var chainObj2 = { id: 2 };

var returnVal = wm2.set(chainObj1, "a");
test("set() returns the WeakMap", returnVal === wm2);

wm2.set(chainObj1, "x").set(chainObj2, "y");
test("Chained set() works - first", wm2.get(chainObj1) === "x");
test("Chained set() works - second", wm2.get(chainObj2) === "y");

// ============================================================================
// Different object keys are distinct
// ============================================================================

var wm3 = new WeakMap();
var similar1 = { a: 1 };
var similar2 = { a: 1 };
wm3.set(similar1, "first");
wm3.set(similar2, "second");
test("Similar objects are distinct keys - first", wm3.get(similar1) === "first");
test("Similar objects are distinct keys - second", wm3.get(similar2) === "second");

// ============================================================================
// Primitive keys throw TypeError
// ============================================================================

var wm4 = new WeakMap();
var primitiveTestPassed = false;

try {
    wm4.set("string", "value");
} catch (e) {
    primitiveTestPassed = true;
}
test("String key throws TypeError", primitiveTestPassed);

primitiveTestPassed = false;
try {
    wm4.set(123, "value");
} catch (e) {
    primitiveTestPassed = true;
}
test("Number key throws TypeError", primitiveTestPassed);

primitiveTestPassed = false;
try {
    wm4.set(null, "value");
} catch (e) {
    primitiveTestPassed = true;
}
test("null key throws TypeError", primitiveTestPassed);

primitiveTestPassed = false;
try {
    wm4.set(undefined, "value");
} catch (e) {
    primitiveTestPassed = true;
}
test("undefined key throws TypeError", primitiveTestPassed);

primitiveTestPassed = false;
try {
    wm4.set(true, "value");
} catch (e) {
    primitiveTestPassed = true;
}
test("Boolean key throws TypeError", primitiveTestPassed);

// ============================================================================
// Primitive keys with has() and delete() return false (no throw)
// ============================================================================

test("has() with string returns false", wm4.has("string") === false);
test("has() with number returns false", wm4.has(123) === false);
test("delete() with string returns false", wm4.delete("string") === false);
test("get() with string returns undefined", wm4.get("string") === undefined);

// ============================================================================
// Constructor with iterable
// ============================================================================

var iterKey1 = { k: 1 };
var iterKey2 = { k: 2 };
var initArray = [[iterKey1, "val1"], [iterKey2, "val2"]];
var wm5 = new WeakMap(initArray);
test("Constructor with array - first key", wm5.get(iterKey1) === "val1");
test("Constructor with array - second key", wm5.get(iterKey2) === "val2");

// ============================================================================
// Constructor with null/undefined creates empty WeakMap
// ============================================================================

var wm6 = new WeakMap(null);
test("Constructor with null creates empty WeakMap", wm6 !== undefined);

var wm7 = new WeakMap(undefined);
test("Constructor with undefined creates empty WeakMap", wm7 !== undefined);

// ============================================================================
// Values can be any type
// ============================================================================

var wm8 = new WeakMap();
var valKey = { key: true };
wm8.set(valKey, null);
test("Value can be null", wm8.get(valKey) === null);

wm8.set(valKey, undefined);
test("Value can be undefined", wm8.get(valKey) === undefined);
test("has() still true when value is undefined", wm8.has(valKey) === true);

wm8.set(valKey, { nested: "object" });
test("Value can be object", wm8.get(valKey).nested === "object");

// ============================================================================
// Function objects as keys
// ============================================================================

var wm9 = new WeakMap();
var funcKey = function() { return 42; };
wm9.set(funcKey, "function value");
test("Function can be used as key", wm9.get(funcKey) === "function value");
test("has() works with function key", wm9.has(funcKey) === true);

// ============================================================================
// Summary
// ============================================================================

console.log("");
console.log("===================");
console.log("Tests passed: " + passed);
console.log("Tests failed: " + failed);
console.log("===================");
