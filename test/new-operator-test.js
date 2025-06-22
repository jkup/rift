// Test new operator implementation

console.log("=== Testing new operator ===");

// Test 1: new Array() - basic constructor
console.log("Test 1: new Array()");
var arr1 = new Array();
console.log("Array length:", arr1.length);
if (arr1.length === 0) {
    console.log("PASS: new Array() created empty array");
} else {
    console.log("FAIL: new Array() length should be 0");
}

// Test 2: new Array(3) - constructor with size
console.log("Test 2: new Array(3)");  
var arr2 = new Array(3);
console.log("Array length:", arr2.length);
if (arr2.length === 3) {
    console.log("PASS: new Array(3) created array with length 3");
} else {
    console.log("FAIL: new Array(3) length should be 3");
}

// Test 3: new Array(1, 2, 3) - constructor with elements
console.log("Test 3: new Array(1, 2, 3)");
var arr3 = new Array(1, 2, 3);
console.log("Array length:", arr3.length);
if (arr3.length === 3) {
    console.log("PASS: new Array(1, 2, 3) created array with length 3");
} else {
    console.log("FAIL: new Array(1, 2, 3) length should be 3");
}

// Test 4: new Object() - basic object constructor
console.log("Test 4: new Object()");
var obj1 = new Object();
if (obj1) {
    console.log("PASS: new Object() created object");
} else {
    console.log("FAIL: new Object() should create object");
}

// Test 5: Array methods work on new arrays
console.log("Test 5: Array methods on new arrays");
var arr4 = new Array();
arr4.push("hello");
arr4.push("world");
if (arr4.length === 2) {
    console.log("PASS: Array methods work on new arrays");
} else {
    console.log("FAIL: Array methods should work on new arrays");
}

// Test 6: Compare with old createArray function
console.log("Test 6: Compare new vs old");
var oldArray = createArray();
var newArray = new Array();
console.log("Old array length:", oldArray.length);
console.log("New array length:", newArray.length);
if (oldArray.length === newArray.length) {
    console.log("PASS: new Array() behaves like createArray()");
} else {
    console.log("FAIL: new Array() should behave like createArray()");
}

console.log("=== new operator tests complete ==="); 