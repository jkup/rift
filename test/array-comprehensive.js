// Comprehensive Array test

console.log("=== Array Comprehensive Test ===");

var arr = createArray();
console.log("Created array, length:", arr.length);

// Test multiple pushes
console.log("Pushing 10...");
arr.push(10);
console.log("Length:", arr.length);

console.log("Pushing 20...");
arr.push(20);
console.log("Length:", arr.length);

console.log("Pushing 30...");
arr.push(30);
console.log("Length:", arr.length);

// Test pops
console.log("Popping...");
var val1 = arr.pop();
console.log("Popped:", val1, "Length:", arr.length);

console.log("Popping again...");
var val2 = arr.pop();
console.log("Popped:", val2, "Length:", arr.length);

// Test pushing different types
console.log("Pushing string...");
arr.push("hello");
console.log("Length:", arr.length);

console.log("Pushing boolean...");
arr.push(true);
console.log("Length:", arr.length);

console.log("Final pop test...");
var finalVal = arr.pop();
console.log("Final popped:", finalVal, "Length:", arr.length);

console.log("=== All tests completed! ===");
