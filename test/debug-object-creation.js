// Test object creation methods
console.log("Testing object creation");

// Test 1: Array literal (should work)
var arr = [1, 2, 3];
console.log("Array created successfully");
console.log("Array length:", arr.length);

// Test 2: Try creating object using createArray function
var obj2 = createArray();
console.log("createArray() result:", typeof obj2);

// Test 3: Check if {} parsing is the issue
// Let's skip the literal and just try Object.keys directly
console.log("Calling Object.keys with arr:");
var keys = Object.keys(arr);
console.log("Object.keys result:", keys.length); 