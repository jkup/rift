// Test: Function.prototype.call, apply, and bind

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

// === Function.prototype.call ===

function greet(greeting) {
    return this.name + " says " + greeting;
}
var alice = { name: "Alice" };

assert(greet.call(alice, "hello") === "Alice says hello", "call with this and arg");
assert(greet.call(alice) === "Alice says undefined", "call with this, no arg");

function sum(a, b) {
    return a + b;
}
assert(sum.call(null, 3, 4) === 7, "call with null this");

// call on built-in method
assert(Array.prototype.join.call([1, 2, 3], "-") === "1-2-3", "call on Array.prototype.join");
assert(Object.prototype.hasOwnProperty.call({ a: 1 }, "a") === true, "call on hasOwnProperty");

// === Function.prototype.apply ===

assert(greet.apply(alice, ["hi"]) === "Alice says hi", "apply with this and args array");
assert(sum.apply(null, [10, 20]) === 30, "apply with args array");

// apply on built-in method
assert(Array.prototype.join.apply([4, 5, 6], [":"]) === "4:5:6", "apply on Array.prototype.join");

// apply with no args array
assert(greet.apply(alice) === "Alice says undefined", "apply with no args");

// === Function.prototype.bind ===

var boundGreet = greet.bind(alice);
assert(boundGreet("hey") === "Alice says hey", "bind basic");

var boundSum = sum.bind(null, 100);
assert(boundSum(5) === 105, "bind with partial application");

// bind on built-in method
var boundJoin = Array.prototype.join.bind([7, 8, 9]);
assert(boundJoin("-") === "7-8-9", "bind on Array.prototype.join");

// bound function name (has "bound " prefix)
assert(boundGreet.name.indexOf("bound ") === 0, "bound function name has 'bound ' prefix");

// === The critical pattern: Function.prototype.call.bind ===

// This is the pattern used by propertyHelper.js in test262
var __join = Function.prototype.call.bind(Array.prototype.join);
assert(__join([1, 2, 3], "-") === "1-2-3", "call.bind pattern with join");

var __hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
assert(__hasOwn({ x: 1 }, "x") === true, "call.bind pattern with hasOwnProperty");
assert(__hasOwn({ x: 1 }, "y") === false, "call.bind pattern with hasOwnProperty (false case)");

var __push = Function.prototype.call.bind(Array.prototype.push);
var arr = [1, 2];
__push(arr, 3);
assert(arr.length === 3, "call.bind pattern with push");
assert(arr[2] === 3, "call.bind pattern with push value");

// === Chaining: call/apply/bind have call/apply/bind ===

assert(typeof Function.prototype.call.call === "function", "call has call");
assert(typeof Function.prototype.call.apply === "function", "call has apply");
assert(typeof Function.prototype.call.bind === "function", "call has bind");
assert(typeof Function.prototype.bind.call === "function", "bind has call");
assert(typeof Function.prototype.apply.bind === "function", "apply has bind");

// === Results ===

console.log("Function.prototype.call/apply/bind tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
    console.log("SOME TESTS FAILED");
} else {
    console.log("ALL TESTS PASSED");
}
