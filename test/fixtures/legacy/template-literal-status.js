// Test current template literal status
console.log("=== Template Literal Status Test ===");

// Test 1: Basic template (should work)
var basic = `Hello World`;
console.log("Basic template:", basic);

// Test 2: Single expression (this is what we need to implement)
var name = "Alice";
var greeting = `Hello ${name}!`;
console.log("Interpolation test:", greeting);

// Test 3: Multiple expressions
var x = 5;
var y = 10;
var math = `${x} + ${y} = ${x + y}`;
console.log("Multiple expressions:", math);

console.log("=== Template Literal Test Complete ===");
