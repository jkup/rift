// Test object literal syntax

console.log("=== Object Literal Tests ===");

// Test 1: Empty object literal
var empty = {};
if (typeof empty == "object") console.log("PASS: Empty object literal creates object");
if (typeof empty != "object") console.log("FAIL: Empty object literal should create object");

// Test 2: Simple object literal
var person = {
    name: "Alice",
    age: 30
};

if (typeof person == "object") console.log("PASS: Object literal with properties creates object");
if (typeof person != "object") console.log("FAIL: Object literal with properties should create object");

// Test 3: Accessing properties
if (person.name == "Alice") console.log("PASS: Property access works");
if (person.name != "Alice") console.log("FAIL: Property access - expected Alice, got", person.name);

if (person.age == 30) console.log("PASS: Numeric property works");
if (person.age != 30) console.log("FAIL: Numeric property - expected 30, got", person.age);

// Test 4: Mixed data types
var mixed = {
    str: "hello",
    num: 42,
    bool: true
};

if (mixed.str == "hello") console.log("PASS: String property works");
if (mixed.str != "hello") console.log("FAIL: String property - expected hello, got", mixed.str);

if (mixed.num == 42) console.log("PASS: Number property works");
if (mixed.num != 42) console.log("FAIL: Number property - expected 42, got", mixed.num);

if (mixed.bool == true) console.log("PASS: Boolean property works");
if (mixed.bool != true) console.log("FAIL: Boolean property - expected true, got", mixed.bool);

// Test 5: Object.keys() with object literals
var keys = Object.keys(person);
if (keys.length == 2) console.log("PASS: Object.keys() works with object literals");
if (keys.length != 2) console.log("FAIL: Object.keys() - expected 2 keys, got", keys.length);

// Test 6: Object.values() with object literals
var values = Object.values(person);
if (values.length == 2) console.log("PASS: Object.values() works with object literals");
if (values.length != 2) console.log("FAIL: Object.values() - expected 2 values, got", values.length);

// Test 7: Adding properties to object literals
empty.newProp = "added";
if (empty.newProp == "added") console.log("PASS: Can add properties to object literals");
if (empty.newProp != "added") console.log("FAIL: Adding properties - expected added, got", empty.newProp);

// Test 8: Nested object (if supported)
var nested = {
    inner: {
        value: 123
    }
};

if (typeof nested.inner == "object") console.log("PASS: Nested objects work");
if (typeof nested.inner != "object") console.log("FAIL: Nested objects should work");

if (nested.inner.value == 123) console.log("PASS: Nested property access works");
if (nested.inner.value != 123) console.log("FAIL: Nested property - expected 123, got", nested.inner.value);

console.log("=== Object Literal Tests Complete ==="); 