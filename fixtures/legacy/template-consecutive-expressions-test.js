// Test consecutive expressions in template literals
console.log("=== Consecutive Template Expressions Test ===");

// Test 1: Two consecutive expressions with no text between
console.log("Test 1: Consecutive expressions ${a}${b}");
var a = "Hello";
var b = "World";
var result1 = `${a}${b}`;
console.log("Result:", result1);
console.log("Expected: HelloWorld");

// Test 2: Three consecutive expressions
console.log("\nTest 2: Three consecutive expressions ${x}${y}${z}");
var x = 1;
var y = 2; 
var z = 3;
var result2 = `${x}${y}${z}`;
console.log("Result:", result2);
console.log("Expected: 123");

// Test 3: Mix of consecutive and separated expressions
console.log("\nTest 3: Mixed ${a}${b} and ${c}");
var c = "!";
var result3 = `${a}${b} and ${c}`;
console.log("Result:", result3);
console.log("Expected: HelloWorld and !");

// Test 4: Expression at start and end with consecutive in middle
console.log("\nTest 4: Complex pattern");
var result4 = `Start ${a}${b} middle ${x}${y} end`;
console.log("Result:", result4);
console.log("Expected: Start HelloWorld middle 12 end");

console.log("\n=== Consecutive Template Expressions Test Complete ===");