// Test built-in property descriptor flags per ECMAScript spec

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

// ============================================================================
// Built-in prototype methods should be non-enumerable
// ============================================================================

var pushDesc = Object.getOwnPropertyDescriptor(Array.prototype, "push");
assert(pushDesc.writable === true, "Array.prototype.push should be writable");
assert(pushDesc.enumerable === false, "Array.prototype.push should be non-enumerable");
assert(pushDesc.configurable === true, "Array.prototype.push should be configurable");

var mapDesc = Object.getOwnPropertyDescriptor(Array.prototype, "map");
assert(mapDesc.enumerable === false, "Array.prototype.map should be non-enumerable");

var toStringDesc = Object.getOwnPropertyDescriptor(Array.prototype, "toString");
assert(toStringDesc.enumerable === false, "Array.prototype.toString should be non-enumerable");

// ============================================================================
// Math constants: non-writable, non-enumerable, non-configurable
// ============================================================================

var piDesc = Object.getOwnPropertyDescriptor(Math, "PI");
assert(piDesc.writable === false, "Math.PI should be non-writable");
assert(piDesc.enumerable === false, "Math.PI should be non-enumerable");
assert(piDesc.configurable === false, "Math.PI should be non-configurable");

var eDesc = Object.getOwnPropertyDescriptor(Math, "E");
assert(eDesc.writable === false, "Math.E should be non-writable");
assert(eDesc.enumerable === false, "Math.E should be non-enumerable");
assert(eDesc.configurable === false, "Math.E should be non-configurable");

// ============================================================================
// Math methods: non-enumerable
// ============================================================================

var absDesc = Object.getOwnPropertyDescriptor(Math, "abs");
assert(absDesc.enumerable === false, "Math.abs should be non-enumerable");
assert(absDesc.writable === true, "Math.abs should be writable");
assert(absDesc.configurable === true, "Math.abs should be configurable");

// ============================================================================
// Number constants: non-writable, non-enumerable, non-configurable
// Note: Object.getOwnPropertyDescriptor(Number, ...) requires function-as-object
// support which is tracked separately. Test via Object.keys instead.
// ============================================================================

var numberKeys = Object.keys(Number);
assert(numberKeys.indexOf("EPSILON") === -1, "Number.EPSILON should not appear in Object.keys (non-enumerable)");

// ============================================================================
// Array length: writable, non-enumerable, non-configurable
// ============================================================================

var arr = [1, 2, 3];
var lengthDesc = Object.getOwnPropertyDescriptor(arr, "length");
assert(lengthDesc.writable === true, "Array length should be writable");
assert(lengthDesc.enumerable === false, "Array length should be non-enumerable");
assert(lengthDesc.configurable === false, "Array length should be non-configurable");

// ============================================================================
// Object.keys should not include non-enumerable properties
// ============================================================================

var arrKeys = Object.keys(arr);
assert(arrKeys.indexOf("length") === -1, "Object.keys on array should not include 'length'");

// ============================================================================
// prototype.constructor should be non-enumerable
// ============================================================================

var ctorDesc = Object.getOwnPropertyDescriptor(Array.prototype, "constructor");
assert(ctorDesc.writable === true, "Array.prototype.constructor should be writable");
assert(ctorDesc.enumerable === false, "Array.prototype.constructor should be non-enumerable");
assert(ctorDesc.configurable === true, "Array.prototype.constructor should be configurable");

// ============================================================================
// Regular user properties should be enumerable (via assignment)
// ============================================================================

var obj = {};
obj.foo = 42;
var fooDesc = Object.getOwnPropertyDescriptor(obj, "foo");
assert(fooDesc.writable === true, "User property should be writable");
assert(fooDesc.enumerable === true, "User property should be enumerable");
assert(fooDesc.configurable === true, "User property should be configurable");

// ============================================================================
// Error.prototype.name/message: writable, non-enumerable, configurable
// ============================================================================

var errNameDesc = Object.getOwnPropertyDescriptor(Error.prototype, "name");
assert(errNameDesc.writable === true, "Error.prototype.name should be writable");
assert(errNameDesc.enumerable === false, "Error.prototype.name should be non-enumerable");
assert(errNameDesc.configurable === true, "Error.prototype.name should be configurable");

var errMsgDesc = Object.getOwnPropertyDescriptor(Error.prototype, "message");
assert(errMsgDesc.writable === true, "Error.prototype.message should be writable");
assert(errMsgDesc.enumerable === false, "Error.prototype.message should be non-enumerable");
assert(errMsgDesc.configurable === true, "Error.prototype.message should be configurable");

// ============================================================================
// Summary
// ============================================================================

console.log("Passed: " + passed + "/" + (passed + failed));
if (failed > 0) {
    console.log("FAILED: " + failed + " test(s)");
} else {
    console.log("All tests passed!");
}
