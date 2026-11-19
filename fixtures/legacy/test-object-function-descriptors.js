// Test that Object static methods work on Function-type values
// In JavaScript, functions are objects, so all Object.* methods must accept them

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

// Object.getOwnPropertyDescriptor on a function
var desc = Object.getOwnPropertyDescriptor(Object, 'keys');
assert(desc !== undefined, "getOwnPropertyDescriptor(Object, 'keys') should return a descriptor");
assert(typeof desc.value === 'function', "descriptor.value should be a function");
assert(desc.writable === true, "descriptor.writable should be true");
assert(desc.configurable === true, "descriptor.configurable should be true");

// Object.getOwnPropertyNames on a function
var names = Object.getOwnPropertyNames(Object);
assert(Array.isArray(names), "getOwnPropertyNames(Object) should return an array");
assert(names.length > 0, "getOwnPropertyNames(Object) should have entries");

// Object.getOwnPropertyDescriptors on a function
var descriptors = Object.getOwnPropertyDescriptors(Object);
assert(typeof descriptors === 'object', "getOwnPropertyDescriptors(Object) should return an object");

// Object.keys on a function with enumerable properties
function testFunc() {}
testFunc.customProp = 42;
var keys = Object.keys(testFunc);
assert(Array.isArray(keys), "Object.keys(func) should return an array");

// Object.values on a function
var vals = Object.values(testFunc);
assert(Array.isArray(vals), "Object.values(func) should return an array");

// Object.entries on a function
var entries = Object.entries(testFunc);
assert(Array.isArray(entries), "Object.entries(func) should return an array");

// Object.defineProperty on a function
Object.defineProperty(testFunc, 'defined', {
    value: 123,
    writable: true,
    enumerable: true,
    configurable: true
});
assert(testFunc.defined === 123, "defineProperty should work on a function");

// Object.getPrototypeOf on a function
var proto = Object.getPrototypeOf(testFunc);
assert(proto !== undefined, "getPrototypeOf(func) should return a prototype");

// Object.isExtensible on a function
assert(Object.isExtensible(testFunc) === true, "isExtensible(func) should return true initially");

// Object.preventExtensions on a function
function peFunc() {}
Object.preventExtensions(peFunc);
assert(Object.isExtensible(peFunc) === false, "preventExtensions should work on a function");

// Object.freeze on a function
function freezeMe() {}
Object.freeze(freezeMe);
assert(Object.isFrozen(freezeMe) === true, "freeze should work on a function");

// Object.seal on a function
function sealMe() {}
Object.seal(sealMe);
assert(Object.isSealed(sealMe) === true, "seal should work on a function");

// Object.assign with function as target
function assignTarget() {}
Object.assign(assignTarget, { x: 1 });
assert(assignTarget.x === 1, "assign should work with function as target");

// Object.assign with function as source
var targetObj = {};
function assignSource() {}
assignSource.y = 2;
Object.assign(targetObj, assignSource);
assert(targetObj.y === 2, "assign should work with function as source");

// Object.getOwnPropertySymbols on a function
var syms = Object.getOwnPropertySymbols(testFunc);
assert(Array.isArray(syms), "getOwnPropertySymbols(func) should return an array");

// Object.hasOwn on a function (was already working)
assert(Object.hasOwn(testFunc, 'customProp') === true, "hasOwn should work on a function");

console.log("Results: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
    throw new Error(failed + " tests failed");
}
