// Test String method chaining
console.log("=== String Method Chaining Test ===");

// Test chaining multiple methods
var result = "  Hello World  ".trim().toLowerCase().slice(0, 5);
console.log("'  Hello World  '.trim().toLowerCase().slice(0, 5):");
console.log("Result:", result);
console.log("Expected: hello");

// Test more complex chaining
var result2 = "HELLO".toLowerCase().concat(" ", "world").slice(2);
console.log("'HELLO'.toLowerCase().concat(' ', 'world').slice(2):");
console.log("Result:", result2);
console.log("Expected: llo world");

// Test with existing methods
var result3 = "hello world".indexOf("world");
console.log("'hello world'.indexOf('world'):");
console.log("Result:", result3);
console.log("Expected: 6");

console.log("=== Chaining Test Complete ==="); 