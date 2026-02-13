// Test Object.is
console.log("=== Object.is ===");
console.log(Object.is(NaN, NaN) === true);         // true - differs from ===
console.log(Object.is(-0, +0) === false);           // true - differs from ===
console.log(Object.is(0, 0) === true);              // true
console.log(Object.is(1, 1) === true);              // true
console.log(Object.is(1, 2) === false);             // true
console.log(Object.is("foo", "foo") === true);      // true
console.log(Object.is("foo", "bar") === false);     // true
console.log(Object.is(null, null) === true);        // true
console.log(Object.is(undefined, undefined) === true); // true
console.log(Object.is(true, true) === true);        // true
console.log(Object.is(true, false) === false);      // true
console.log(Object.is(null, undefined) === false);  // true
console.log(Object.is(1, "1") === false);           // true
var obj = {};
console.log(Object.is(obj, obj) === true);          // true
console.log(Object.is({}, {}) === false);           // true

// Test Object.hasOwn
console.log("=== Object.hasOwn ===");
var o = { a: 1, b: 2 };
console.log(Object.hasOwn(o, "a") === true);        // true
console.log(Object.hasOwn(o, "b") === true);        // true
console.log(Object.hasOwn(o, "c") === false);       // true
console.log(Object.hasOwn(o, "toString") === false); // true - inherited, not own

// Test Object.fromEntries
console.log("=== Object.fromEntries ===");
var entries = [["x", 1], ["y", 2], ["z", 3]];
var result = Object.fromEntries(entries);
console.log(result.x === 1);  // true
console.log(result.y === 2);  // true
console.log(result.z === 3);  // true

// fromEntries with Map
var map = new Map();
map.set("a", 10);
map.set("b", 20);
var fromMap = Object.fromEntries(map);
console.log(fromMap.a === 10);  // true
console.log(fromMap.b === 20);  // true

// Test Object.getOwnPropertyDescriptors
console.log("=== Object.getOwnPropertyDescriptors ===");
var target = { foo: 42 };
var descs = Object.getOwnPropertyDescriptors(target);
console.log(descs.foo.value === 42);              // true
console.log(descs.foo.writable === true);         // true
console.log(descs.foo.enumerable === true);       // true
console.log(descs.foo.configurable === true);     // true

// With defineProperty
var obj2 = {};
Object.defineProperty(obj2, "bar", {
  value: 99,
  writable: false,
  enumerable: false,
  configurable: true
});
var descs2 = Object.getOwnPropertyDescriptors(obj2);
console.log(descs2.bar.value === 99);             // true
console.log(descs2.bar.writable === false);       // true
console.log(descs2.bar.enumerable === false);     // true
console.log(descs2.bar.configurable === true);    // true
