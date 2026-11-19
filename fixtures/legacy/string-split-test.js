// Simple test for String.prototype.split method
console.log("=== String Split Test ===");

// Test basic split
var result = "a,b,c".split(",");
console.log("'a,b,c'.split(','):");
console.log("  Result type:", typeof result);
console.log("  Length:", result.length);
console.log("  [0]:", result[0]);
console.log("  [1]:", result[1]);
console.log("  [2]:", result[2]);

// Test split with empty string
var result2 = "hello".split("");
console.log("'hello'.split(''):");
console.log("  Result type:", typeof result2);
console.log("  Length:", result2.length);
console.log("  [0]:", result2[0]);
console.log("  [1]:", result2[1]);

// Test split with no arguments
var result3 = "no separator".split();
console.log("'no separator'.split():");
console.log("  Result type:", typeof result3);
console.log("  Length:", result3.length);
console.log("  [0]:", result3[0]);

console.log("=== Split Test Complete ==="); 