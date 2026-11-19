// Test Object.keys() and Object.values() (working version)

console.log("=== Object.keys() and Object.values() Tests ===");

// Test 1: Object.keys() with array
var arr = [10, 20, 30];
var arrKeys = Object.keys(arr);
console.log("Array keys length:", arrKeys.length);
if (arrKeys.length > 0) console.log("PASS: Object.keys() works with arrays");
if (arrKeys.length == 0) console.log("FAIL: Object.keys() with arrays");

// Test 2: Object.values() with array
var arrValues = Object.values(arr);  
console.log("Array values length:", arrValues.length);
if (arrValues.length > 0) console.log("PASS: Object.values() works with arrays");
if (arrValues.length == 0) console.log("FAIL: Object.values() with arrays");

// Test 3: Object.keys() with createArray result
var obj = createArray();
obj.name = "test";
obj.count = 42;

var objKeys = Object.keys(obj);
console.log("Object keys length:", objKeys.length);
if (objKeys.length > 0) console.log("PASS: Object.keys() works with objects");
if (objKeys.length == 0) console.log("FAIL: Object.keys() with objects");

// Test 4: Object.values() with createArray result
var objValues = Object.values(obj);
console.log("Object values length:", objValues.length);
if (objValues.length > 0) console.log("PASS: Object.values() works with objects");
if (objValues.length == 0) console.log("FAIL: Object.values() with objects");

// Test 5: Test with non-object types (should handle gracefully)
var stringKeys = Object.keys("hello");
if (stringKeys.length == 0) console.log("PASS: Object.keys() handles strings gracefully");
if (stringKeys.length != 0) console.log("FAIL: Object.keys() with string should return empty array");

var numberValues = Object.values(42);
if (numberValues.length == 0) console.log("PASS: Object.values() handles numbers gracefully");
if (numberValues.length != 0) console.log("FAIL: Object.values() with number should return empty array");

console.log("=== Tests completed ==="); 