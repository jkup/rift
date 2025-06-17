// Comprehensive Array.isArray test
// Tests all important cases while avoiding unsupported syntax

console.log("=== Array.isArray Comprehensive Test ===");

// Test 1: Array literals should return true
console.log("--- Testing Array Literals ---");
var arr1 = [1, 2, 3];
if (Array.isArray(arr1)) {
    console.log("PASS: Array.isArray([1, 2, 3]) returns true");
} else {
    console.log("FAIL: Array.isArray([1, 2, 3]) should return true");
}

var arr2 = [];
if (Array.isArray(arr2)) {
    console.log("PASS: Array.isArray([]) returns true");
} else {
    console.log("FAIL: Array.isArray([]) should return true");
}

var arr3 = [1, "hello", 3.14, true, null];
if (Array.isArray(arr3)) {
    console.log("PASS: Array.isArray(mixed type array) returns true");
} else {
    console.log("FAIL: Array.isArray(mixed type array) should return true");
}

// Test 2: Primitive types should return false
console.log("--- Testing Primitive Types ---");
if (!Array.isArray("hello")) {
    console.log("PASS: Array.isArray('hello') returns false");
} else {
    console.log("FAIL: Array.isArray('hello') should return false");
}

if (!Array.isArray(42)) {
    console.log("PASS: Array.isArray(42) returns false");
} else {
    console.log("FAIL: Array.isArray(42) should return false");
}

if (!Array.isArray(3.14)) {
    console.log("PASS: Array.isArray(3.14) returns false");
} else {
    console.log("FAIL: Array.isArray(3.14) should return false");
}

if (!Array.isArray(true)) {
    console.log("PASS: Array.isArray(true) returns false");
} else {
    console.log("FAIL: Array.isArray(true) should return false");
}

if (!Array.isArray(false)) {
    console.log("PASS: Array.isArray(false) returns false");
} else {
    console.log("FAIL: Array.isArray(false) should return false");
}

if (!Array.isArray(null)) {
    console.log("PASS: Array.isArray(null) returns false");
} else {
    console.log("FAIL: Array.isArray(null) should return false");
}

if (!Array.isArray(undefined)) {
    console.log("PASS: Array.isArray(undefined) returns false");
} else {
    console.log("FAIL: Array.isArray(undefined) should return false");
}

// Test 3: Edge cases
console.log("--- Testing Edge Cases ---");
if (!Array.isArray()) {
    console.log("PASS: Array.isArray() with no args returns false");
} else {
    console.log("FAIL: Array.isArray() with no args should return false");
}

// Test 4: Arrays after modification should still be arrays
console.log("--- Testing Arrays After Modification ---");
var modArray = [1, 2];
modArray.push(3);
if (Array.isArray(modArray)) {
    console.log("PASS: Array.isArray still true after push");
} else {
    console.log("FAIL: Array.isArray should still be true after push");
}

modArray.pop();
if (Array.isArray(modArray)) {
    console.log("PASS: Array.isArray still true after pop");
} else {
    console.log("FAIL: Array.isArray should still be true after pop");
}

// Test 5: Integration with array methods
console.log("--- Testing Integration with Array Methods ---");
var integrationArray = ["a", "b", "c"];
if (Array.isArray(integrationArray)) {
    console.log("PASS: Array.isArray works with string array");
} else {
    console.log("FAIL: Array.isArray should work with string array");
}

// Test 6: Helper function demonstrating practical usage
console.log("--- Testing Practical Usage ---");
function safeArrayOperation(value) {
    if (Array.isArray(value)) {
        return "Array with " + value.length + " elements";
    } else {
        return "Not an array";
    }
}

var testResult1 = safeArrayOperation([1, 2, 3, 4]);
if (testResult1 === "Array with 4 elements") {
    console.log("PASS: Practical usage with array works");
} else {
    console.log("FAIL: Practical usage with array failed, got:", testResult1);
}

var testResult2 = safeArrayOperation("hello");
if (testResult2 === "Not an array") {
    console.log("PASS: Practical usage with string works");
} else {
    console.log("FAIL: Practical usage with string failed, got:", testResult2);
}

// Test 7: Nested arrays
console.log("--- Testing Nested Arrays ---");
var nestedArray = [[1, 2], [3, 4], [5]];
if (Array.isArray(nestedArray)) {
    console.log("PASS: Array.isArray works with nested arrays");
} else {
    console.log("FAIL: Array.isArray should work with nested arrays");
}

// Test 8: Empty vs populated arrays
console.log("--- Testing Empty vs Populated Arrays ---");
var emptyArr = [];
var populatedArr = [1];
if (Array.isArray(emptyArr)) {
    console.log("PASS: Array.isArray works for empty arrays");
} else {
    console.log("FAIL: Array.isArray should work for empty arrays");
}

if (Array.isArray(populatedArr)) {
    console.log("PASS: Array.isArray works for populated arrays");
} else {
    console.log("FAIL: Array.isArray should work for populated arrays");
}

console.log("=== Array.isArray Comprehensive Test Complete ==="); 