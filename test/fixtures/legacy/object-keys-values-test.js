// Test Object.keys() and Object.values()

// Test 1: Object.keys() with simple object
var obj1 = {};
obj1.a = 1;
obj1.b = 2;
obj1.c = 3;

var keys1 = Object.keys(obj1);
if (keys1.length == 3) console.log("PASS: Object.keys() returns correct number of keys");
if (keys1.length != 3) console.log("FAIL: Object.keys() - expected 3 keys, got", keys1.length);

// Test 2: Object.values() with simple object
var values1 = Object.values(obj1);
if (values1.length == 3) console.log("PASS: Object.values() returns correct number of values");
if (values1.length != 3) console.log("FAIL: Object.values() - expected 3 values, got", values1.length);

// Test 3: Object.keys() with empty object
var emptyObj = {};
var emptyKeys = Object.keys(emptyObj);
if (emptyKeys.length == 0) console.log("PASS: Object.keys() with empty object returns empty array");
if (emptyKeys.length != 0) console.log("FAIL: Object.keys() with empty object - expected 0 keys, got", emptyKeys.length);

// Test 4: Object.values() with empty object
var emptyValues = Object.values(emptyObj);
if (emptyValues.length == 0) console.log("PASS: Object.values() with empty object returns empty array");
if (emptyValues.length != 0) console.log("FAIL: Object.values() with empty object - expected 0 values, got", emptyValues.length);

// Test 5: Object.keys() with array
var arr = [10, 20, 30];
var arrKeys = Object.keys(arr);
if (arrKeys.length >= 1) console.log("PASS: Object.keys() with array returns keys");
if (arrKeys.length < 1) console.log("FAIL: Object.keys() with array - expected at least 1 key, got", arrKeys.length);

// Test 6: Object.values() with array
var arrValues = Object.values(arr);
if (arrValues.length >= 1) console.log("PASS: Object.values() with array returns values");
if (arrValues.length < 1) console.log("FAIL: Object.values() with array - expected at least 1 value, got", arrValues.length);

// Test 7: Object.keys() with string (should handle gracefully)
var stringKeys = Object.keys("hello");
if (stringKeys.length == 0) console.log("PASS: Object.keys() with string handled gracefully");
if (stringKeys.length != 0) console.log("FAIL: Object.keys() with string - expected empty array, got", stringKeys.length);

// Test 8: Object.values() with string (should handle gracefully)
var stringValues = Object.values("hello");
if (stringValues.length == 0) console.log("PASS: Object.values() with string handled gracefully");
if (stringValues.length != 0) console.log("FAIL: Object.values() with string - expected empty array, got", stringValues.length);

// Test 9: Object.keys() with number (should handle gracefully)
var numberKeys = Object.keys(42);
if (numberKeys.length == 0) console.log("PASS: Object.keys() with number handled gracefully");
if (numberKeys.length != 0) console.log("FAIL: Object.keys() with number - expected empty array, got", numberKeys.length);

// Test 10: Object.values() with number (should handle gracefully)
var numberValues = Object.values(42);
if (numberValues.length == 0) console.log("PASS: Object.values() with number handled gracefully");
if (numberValues.length != 0) console.log("FAIL: Object.values() with number - expected empty array, got", numberValues.length);

// Test 11: Mixed property types
var mixedObj = {};
mixedObj.name = "test";
mixedObj.count = 42;
mixedObj.active = true;

var mixedKeys = Object.keys(mixedObj);
if (mixedKeys.length == 3) console.log("PASS: Object.keys() with mixed property types");
if (mixedKeys.length != 3) console.log("FAIL: Object.keys() with mixed property types - expected 3 keys, got", mixedKeys.length);

var mixedValues = Object.values(mixedObj);
if (mixedValues.length == 3) console.log("PASS: Object.values() with mixed property types");
if (mixedValues.length != 3) console.log("FAIL: Object.values() with mixed property types - expected 3 values, got", mixedValues.length);

console.log("Object.keys() and Object.values() tests completed"); 