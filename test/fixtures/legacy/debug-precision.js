// Simple debug for large number precision
console.log("=== Large Number Precision Debug ===");

var arr = [];
console.log("Starting length:", arr.length);

// Set a large index
arr[4294967294] = "test";
console.log("After setting arr[4294967294]:");
console.log("arr[4294967294] =", arr[4294967294]);
console.log("Array length =", arr.length);

// Let's try a smaller large number
var arr2 = [];
arr2[1000000] = "million";
console.log("arr2[1000000] =", arr2[1000000]);
console.log("arr2.length =", arr2.length);
