// Tests for frozen/sealed/non-extensible object behavior and Object.defineProperty validation

var assert = function(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
};

var assertThrows = function(fn, msg) {
  var threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
  }
  if (!threw) throw new Error("FAIL: " + msg + " (no error thrown)");
};

// Wrap strict-mode-dependent tests in a function
function strictTests() {
  "use strict";

  // Test 1: Assignment to frozen object property throws
  var frozen = { x: 1, y: 2 };
  Object.freeze(frozen);
  assertThrows(function() { frozen.x = 10; },
    "Assignment to frozen property should throw");
  assert(frozen.x === 1, "Frozen property value should be preserved");
  console.log("PASS: Assignment to frozen property throws in strict mode");

  // Test 2: Adding new property to frozen object throws
  assertThrows(function() { frozen.z = 3; },
    "Adding property to frozen object should throw");
  console.log("PASS: Adding property to frozen object throws");

  // Test 3: Sealed object allows writing to existing writable properties
  var sealed = { a: 1 };
  Object.seal(sealed);
  sealed.a = 100;
  assert(sealed.a === 100, "Sealed writable property should be modifiable");
  console.log("PASS: Sealed writable property can be modified");

  // Test 4: Adding new property to sealed object throws
  assertThrows(function() { sealed.b = 2; },
    "Adding property to sealed object should throw");
  console.log("PASS: Adding property to sealed object throws");

  // Test 5: Adding property to non-extensible object throws
  var nonExt = { p: 1 };
  Object.preventExtensions(nonExt);
  assertThrows(function() { nonExt.q = 2; },
    "Adding property to non-extensible object should throw");
  console.log("PASS: Adding property to non-extensible object throws");

  // Test 6: Modifying existing property on non-extensible is OK
  nonExt.p = 99;
  assert(nonExt.p === 99, "Existing writable property modifiable on non-extensible");
  console.log("PASS: Existing property on non-extensible can be modified");

  // Test 7: Increment on frozen property throws
  var obj7 = { count: 0 };
  Object.freeze(obj7);
  assertThrows(function() { obj7.count++; },
    "Increment on frozen property should throw");
  assert(obj7.count === 0, "Frozen property preserved after ++ attempt");
  console.log("PASS: Increment on frozen property throws");
}

strictTests();

// === Object.defineProperty validation (not strict-mode dependent) ===

// Test 8: defineProperty on non-extensible object
var obj8 = {};
Object.preventExtensions(obj8);
assertThrows(function() {
  Object.defineProperty(obj8, 'newProp', { value: 1 });
}, "defineProperty on non-extensible should throw");
console.log("PASS: defineProperty on non-extensible throws");

// Test 9: defineProperty changing configurable false to true
var obj9 = {};
Object.defineProperty(obj9, 'x', {
  value: 1, writable: true, enumerable: true, configurable: false
});
assertThrows(function() {
  Object.defineProperty(obj9, 'x', { configurable: true });
}, "Cannot change configurable false to true");
console.log("PASS: Cannot change configurable false to true");

// Test 10: defineProperty changing enumerable on non-configurable
assertThrows(function() {
  Object.defineProperty(obj9, 'x', { enumerable: false });
}, "Cannot change enumerable on non-configurable");
console.log("PASS: Cannot change enumerable on non-configurable");

// Test 11: defineProperty changing value on non-writable non-configurable
var obj11 = {};
Object.defineProperty(obj11, 'y', {
  value: 42, writable: false, enumerable: true, configurable: false
});
assertThrows(function() {
  Object.defineProperty(obj11, 'y', { value: 100 });
}, "Cannot change value on non-writable non-configurable");
assert(obj11.y === 42, "Value should be preserved");
console.log("PASS: Cannot change value on non-writable non-configurable");

// Test 12: defineProperty setting same value on non-writable non-configurable (allowed)
Object.defineProperty(obj11, 'y', { value: 42 });
assert(obj11.y === 42, "Same value defineProperty should succeed");
console.log("PASS: Setting same value on non-writable non-configurable is OK");

// Test 13: defineProperty changing writable true->false on non-configurable (allowed)
var obj13 = {};
Object.defineProperty(obj13, 'w', {
  value: 5, writable: true, enumerable: true, configurable: false
});
Object.defineProperty(obj13, 'w', { writable: false });
assert(obj13.w === 5, "Value preserved after writable change");
console.log("PASS: Changing writable true to false on non-configurable is OK");

// Test 14: defineProperty changing writable false->true on non-configurable (rejected)
assertThrows(function() {
  Object.defineProperty(obj13, 'w', { writable: true });
}, "Cannot change writable false to true on non-configurable");
console.log("PASS: Cannot change writable false to true on non-configurable");

// Test 15: Non-strict mode: frozen assignment silently fails
var obj15 = { val: 10 };
Object.freeze(obj15);
obj15.val = 999; // silently fails in non-strict
assert(obj15.val === 10, "Frozen property value preserved in non-strict");
console.log("PASS: Non-strict frozen assignment silently fails");

// Test 16: Object.freeze and Object.seal still work (don't throw internally)
var obj16 = { a: 1, b: 2 };
Object.freeze(obj16);
Object.freeze(obj16); // double freeze - no error
assert(Object.isFrozen(obj16), "Double freeze should work");
console.log("PASS: Double freeze works");

var obj17 = { c: 3 };
Object.seal(obj17);
Object.seal(obj17); // double seal - no error
assert(Object.isSealed(obj17), "Double seal should work");
console.log("PASS: Double seal works");

console.log("\nAll tests passed!");
