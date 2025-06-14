// Comprehensive Array Literal Tests
// Testing all aspects of array functionality

console.log("=== ARRAY CREATION TESTS ===");

// Basic array creation
var arr1 = [1, 2, 3];
console.log("Basic array created:", typeof arr1, arr1.length);

// Empty array
var arr2 = [];
console.log("Empty array created:", typeof arr2, arr2.length);

// Mixed types
var arr3 = [1, "hello", true, null, undefined];
console.log("Mixed array created:", typeof arr3, arr3.length);

// Single element
var arr4 = [42];
console.log("Single element array:", typeof arr4, arr4.length);

console.log("\n=== ARRAY ELEMENT ACCESS TESTS ===");

// Element access with bracket notation
var testArr = [10, 20, 30];
console.log("testArr[0]:", testArr[0]);
console.log("testArr[1]:", testArr[1]);
console.log("testArr[2]:", testArr[2]);
console.log("testArr[3]:", testArr[3]); // Should be undefined

// Negative indices (should be undefined in JS)
console.log("testArr[-1]:", testArr[-1]);

console.log("\n=== ARRAY ELEMENT ASSIGNMENT TESTS ===");

// Element assignment
var assignArr = [1, 2, 3];
assignArr[0] = 100;
assignArr[1] = 200;
console.log("After assignment assignArr[0]:", assignArr[0]);
console.log("After assignment assignArr[1]:", assignArr[1]);
console.log("After assignment length:", assignArr.length);

// Sparse array creation
var sparseArr = [];
sparseArr[5] = "five";
console.log("Sparse array length:", sparseArr.length);
console.log("sparseArr[0]:", sparseArr[0]);
console.log("sparseArr[5]:", sparseArr[5]);

console.log("\n=== ARRAY METHOD TESTS ===");

// Push method
var pushArr = [1, 2];
var newLength = pushArr.push(3);
console.log("After push, length:", newLength);
console.log("After push, pushArr[2]:", pushArr[2]);

// Pop method
var popArr = [1, 2, 3];
var popped = popArr.pop();
console.log("Popped element:", popped);
console.log("After pop, length:", popArr.length);

console.log("\n=== ARRAY REPRESENTATION TESTS ===");

// Array toString behavior
var strArr = [1, 2, 3];
console.log("Array toString:", strArr.toString());
console.log("Array direct print:", strArr);

// Array with strings
var strArr2 = ["a", "b", "c"];
console.log("String array:", strArr2.toString());

console.log("\n=== NESTED ARRAY TESTS ===");

// Nested arrays
var nested = [
  [1, 2],
  [3, 4],
];
console.log("Nested array length:", nested.length);
console.log("nested[0]:", nested[0]);
console.log("nested[0][0]:", nested[0][0]);
console.log("nested[0][1]:", nested[0][1]);

console.log("\n=== ARRAY COMPARISON TESTS ===");

// Array equality
var comp1 = [1, 2, 3];
var comp2 = [1, 2, 3];
console.log("Array equality (==):", comp1 == comp2);
console.log("Array equality (===):", comp1 === comp2);

// Array with self
console.log("Array self equality:", comp1 === comp1);

console.log("\n=== ARRAY EDGE CASES ===");

// Very large indices
var largeArr = [];
largeArr[1000] = "large";
console.log("Large index array length:", largeArr.length);
console.log("largeArr[1000]:", largeArr[1000]);

// String indices (should work as properties)
var strIdxArr = [1, 2, 3];
strIdxArr["foo"] = "bar";
console.log("String index access:", strIdxArr["foo"]);
console.log("String index doesn't affect length:", strIdxArr.length);

console.log("\n=== TEST COMPLETE ===");
