// Map Tests

// Test 1: Basic constructor
var m = new Map();
console.log("Test 1: new Map() creates empty map");
console.log("  size === 0:", m.size() === 0);

// Test 2: set() and get()
m.set("a", 1);
m.set("b", 2);
console.log("Test 2: set() and get()");
console.log("  get('a') === 1:", m.get("a") === 1);
console.log("  get('b') === 2:", m.get("b") === 2);
console.log("  get('c') === undefined:", m.get("c") === undefined);

// Test 3: size after additions
console.log("Test 3: size after additions");
console.log("  size === 2:", m.size() === 2);

// Test 4: has()
console.log("Test 4: has()");
console.log("  has('a') === true:", m.has("a") === true);
console.log("  has('c') === false:", m.has("c") === false);

// Test 5: set() returns the map for chaining
console.log("Test 5: set() returns map for chaining");
var m2 = new Map();
var result = m2.set("x", 10).set("y", 20).set("z", 30);
console.log("  chained sets work:", m2.size() === 3);
console.log("  returns same map:", result === m2);

// Test 6: Overwriting existing key
console.log("Test 6: Overwriting existing key");
m.set("a", 100);
console.log("  get('a') === 100:", m.get("a") === 100);
console.log("  size unchanged:", m.size() === 2);

// Test 7: delete()
console.log("Test 7: delete()");
var deleted = m.delete("a");
console.log("  delete returns true:", deleted === true);
console.log("  has('a') === false:", m.has("a") === false);
console.log("  delete non-existent returns false:", m.delete("nonexistent") === false);

// Test 8: clear()
console.log("Test 8: clear()");
m.set("x", 1);
m.set("y", 2);
m.clear();
console.log("  size === 0 after clear:", m.size() === 0);

// Test 9: Constructor with iterable
console.log("Test 9: Constructor with iterable");
var m3 = new Map([["one", 1], ["two", 2], ["three", 3]]);
console.log("  size === 3:", m3.size() === 3);
console.log("  get('one') === 1:", m3.get("one") === 1);
console.log("  get('two') === 2:", m3.get("two") === 2);
console.log("  get('three') === 3:", m3.get("three") === 3);

// Test 10: Different key types
console.log("Test 10: Different key types");
var m4 = new Map();
m4.set(1, "number");
m4.set("1", "string");
m4.set(true, "boolean");
m4.set(null, "null");
m4.set(undefined, "undefined");
console.log("  number key:", m4.get(1) === "number");
console.log("  string key:", m4.get("1") === "string");
console.log("  boolean key:", m4.get(true) === "boolean");
console.log("  null key:", m4.get(null) === "null");
console.log("  undefined key:", m4.get(undefined) === "undefined");
console.log("  size === 5:", m4.size() === 5);

// Test 11: Object keys (identity-based)
console.log("Test 11: Object keys");
var obj1 = {name: "obj1"};
var obj2 = {name: "obj2"};
var m5 = new Map();
m5.set(obj1, "value1");
m5.set(obj2, "value2");
console.log("  obj1 key:", m5.get(obj1) === "value1");
console.log("  obj2 key:", m5.get(obj2) === "value2");
console.log("  different objects are different keys:", m5.size() === 2);

// Test 12: forEach
console.log("Test 12: forEach");
var m6 = new Map([["a", 1], ["b", 2], ["c", 3]]);
var keys = [];
var values = [];
m6.forEach(function(value, key) {
    keys.push(key);
    values.push(value);
});
console.log("  keys collected:", keys.length === 3);
console.log("  values collected:", values.length === 3);

// Test 13: keys() iterator
console.log("Test 13: keys() iterator");
var m7 = new Map([["x", 10], ["y", 20]]);
var keysIter = m7.keys();
var k1 = keysIter.next();
var k2 = keysIter.next();
var k3 = keysIter.next();
console.log("  first key:", k1.value === "x" && k1.done === false);
console.log("  second key:", k2.value === "y" && k2.done === false);
console.log("  iterator done:", k3.done === true);

// Test 14: values() iterator
console.log("Test 14: values() iterator");
var valuesIter = m7.values();
var v1 = valuesIter.next();
var v2 = valuesIter.next();
var v3 = valuesIter.next();
console.log("  first value:", v1.value === 10 && v1.done === false);
console.log("  second value:", v2.value === 20 && v2.done === false);
console.log("  iterator done:", v3.done === true);

// Test 15: entries() iterator
console.log("Test 15: entries() iterator");
var entriesIter = m7.entries();
var e1 = entriesIter.next();
var e2 = entriesIter.next();
var e3 = entriesIter.next();
console.log("  first entry:", e1.value[0] === "x" && e1.value[1] === 10);
console.log("  second entry:", e2.value[0] === "y" && e2.value[1] === 20);
console.log("  iterator done:", e3.done === true);

// Test 16: for-of iteration (uses Symbol.iterator -> entries)
console.log("Test 16: for-of iteration");
var m8 = new Map([["p", 1], ["q", 2]]);
var forOfEntries = [];
for (var entry of m8) {
    forOfEntries.push(entry);
}
console.log("  entries count:", forOfEntries.length === 2);
console.log("  first entry key:", forOfEntries[0][0] === "p");
console.log("  first entry value:", forOfEntries[0][1] === 1);

// Test 17: NaN key (SameValueZero)
console.log("Test 17: NaN key (SameValueZero)");
var m9 = new Map();
m9.set(NaN, "NaN value");
console.log("  NaN has:", m9.has(NaN) === true);
console.log("  NaN get:", m9.get(NaN) === "NaN value");
m9.set(NaN, "updated");
console.log("  NaN overwrites:", m9.get(NaN) === "updated");
console.log("  size still 1:", m9.size() === 1);

// Test 18: -0 and +0 are the same key (SameValueZero)
console.log("Test 18: -0 and +0 as keys");
var m10 = new Map();
m10.set(-0, "negative zero");
console.log("  +0 gets -0 value:", m10.get(0) === "negative zero");
m10.set(0, "positive zero");
console.log("  -0 gets +0 value:", m10.get(-0) === "positive zero");
console.log("  size is 1:", m10.size() === 1);

// Test 19: Iteration preserves insertion order
console.log("Test 19: Insertion order preserved");
var m11 = new Map();
m11.set("c", 3);
m11.set("a", 1);
m11.set("b", 2);
var insertionOrder = [];
m11.forEach(function(v, k) { insertionOrder.push(k); });
console.log("  order is c,a,b:", insertionOrder[0] === "c" && insertionOrder[1] === "a" && insertionOrder[2] === "b");

// Test 20: Delete doesn't affect iteration order of remaining items
console.log("Test 20: Delete preserves order of remaining items");
var m12 = new Map([["a", 1], ["b", 2], ["c", 3]]);
m12.delete("b");
var afterDelete = [];
m12.forEach(function(v, k) { afterDelete.push(k); });
console.log("  remaining keys in order:", afterDelete[0] === "a" && afterDelete[1] === "c");

console.log("\nAll Map tests completed!");
