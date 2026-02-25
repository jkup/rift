// Tests for Map.prototype.getOrInsert and Map.prototype.getOrInsertComputed
// Also tests WeakMap.prototype.getOrInsert and WeakMap.prototype.getOrInsertComputed

// === Map.prototype.getOrInsert ===

// Basic insert
var m = new Map();
var result = m.getOrInsert('a', 1);
if (result !== 1) throw new Error("getOrInsert should return inserted value, got " + result);
if (m.size !== 1) throw new Error("Expected size 1, got " + m.size);

// Existing key returns existing value (no update)
result = m.getOrInsert('a', 999);
if (result !== 1) throw new Error("getOrInsert should return existing value, got " + result);
if (m.get('a') !== 1) throw new Error("Value should not be updated");
if (m.size !== 1) throw new Error("Size should still be 1");

// -0 normalizes to +0
var m2 = new Map();
m2.getOrInsert(-0, 'neg');
result = m2.getOrInsert(0, 'pos');
if (result !== 'neg') throw new Error("-0 and +0 should be same key");

// Function properties
if (Map.prototype.getOrInsert.length !== 2) throw new Error("getOrInsert.length should be 2");
if (Map.prototype.getOrInsert.name !== 'getOrInsert') throw new Error("getOrInsert.name should be 'getOrInsert'");

// === Map.prototype.getOrInsertComputed ===

var m3 = new Map();
result = m3.getOrInsertComputed('x', function(k) { return k + '!'; });
if (result !== 'x!') throw new Error("getOrInsertComputed should return computed value, got " + result);

// Existing key returns existing value (callback NOT called)
var called = false;
result = m3.getOrInsertComputed('x', function(k) { called = true; return 'other'; });
if (result !== 'x!') throw new Error("Should return existing value");
if (called) throw new Error("Callback should not be called for existing key");

// TypeError for non-callable callback
var threw = false;
try {
  m3.getOrInsertComputed('y', 'not a function');
} catch (e) {
  threw = true;
}
if (!threw) throw new Error("Should throw TypeError for non-callable callbackfn");

// Function properties
if (Map.prototype.getOrInsertComputed.length !== 2) throw new Error("getOrInsertComputed.length should be 2");
if (Map.prototype.getOrInsertComputed.name !== 'getOrInsertComputed') throw new Error("getOrInsertComputed.name should be 'getOrInsertComputed'");

// === WeakMap.prototype.getOrInsert ===

var wm = new WeakMap();
var k1 = {};
var k2 = {};

result = wm.getOrInsert(k1, 'val1');
if (result !== 'val1') throw new Error("WeakMap getOrInsert should return inserted value");

result = wm.getOrInsert(k1, 'val2');
if (result !== 'val1') throw new Error("WeakMap getOrInsert should return existing value");
if (wm.get(k1) !== 'val1') throw new Error("WeakMap value should not be updated");

// TypeError for non-object keys
threw = false;
try {
  wm.getOrInsert('string', 'val');
} catch (e) {
  threw = true;
}
if (!threw) throw new Error("WeakMap should throw TypeError for non-object keys");

// Function properties
if (WeakMap.prototype.getOrInsert.length !== 2) throw new Error("WeakMap getOrInsert.length should be 2");
if (WeakMap.prototype.getOrInsert.name !== 'getOrInsert') throw new Error("WeakMap getOrInsert.name should be 'getOrInsert'");

// === WeakMap.prototype.getOrInsertComputed ===

result = wm.getOrInsertComputed(k2, function(k) { return 'computed'; });
if (result !== 'computed') throw new Error("WeakMap getOrInsertComputed should return computed value");

called = false;
result = wm.getOrInsertComputed(k2, function(k) { called = true; return 'other'; });
if (result !== 'computed') throw new Error("Should return existing value");
if (called) throw new Error("Callback should not be called for existing key");

// TypeError for non-object keys
threw = false;
try {
  wm.getOrInsertComputed(42, function() {});
} catch (e) {
  threw = true;
}
if (!threw) throw new Error("WeakMap should throw TypeError for non-object keys in getOrInsertComputed");

// TypeError for non-callable callback
threw = false;
try {
  wm.getOrInsertComputed({}, 123);
} catch (e) {
  threw = true;
}
if (!threw) throw new Error("Should throw TypeError for non-callable callbackfn in WeakMap");

// Function properties
if (WeakMap.prototype.getOrInsertComputed.length !== 2) throw new Error("WeakMap getOrInsertComputed.length should be 2");
if (WeakMap.prototype.getOrInsertComputed.name !== 'getOrInsertComputed') throw new Error("WeakMap getOrInsertComputed.name should be 'getOrInsertComputed'");

console.log("PASS");
