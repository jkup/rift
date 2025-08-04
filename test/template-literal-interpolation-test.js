// Template Literal Interpolation Test
// Testing the new ${expression} interpolation functionality

console.log("=== Template Literal Interpolation Test ===");

// Test 1: Basic variable interpolation
console.log("Test 1: Basic variable interpolation");
var name = "World";
var greeting = `Hello ${name}!`;
console.log("Result:", greeting);
console.log("Expected: Hello World!");

// Test 2: Expression interpolation
console.log("\nTest 2: Expression interpolation");
var x = 5;
var y = 10;
var result = `Sum: ${x + y}, Product: ${x * y}`;
console.log("Result:", result);
console.log("Expected: Sum: 15, Product: 50");

// Test 3: Mixed strings and expressions
console.log("\nTest 3: Mixed strings and expressions");
var age = 25;
var message = `I am ${age} years old and next year I'll be ${age + 1}`;
console.log("Result:", message);
console.log("Expected: I am 25 years old and next year I'll be 26");

// Test 4: Nested expressions
console.log("\nTest 4: Function call in template");
var getTime = function() { return "12:34"; };
var timeMessage = `Current time is ${getTime()}`;
console.log("Result:", timeMessage);
console.log("Expected: Current time is 12:34");

// Test 5: Object property access
console.log("\nTest 5: Object property access");
var person = { name: "Alice", age: 30 };
var profile = `Name: ${person.name}, Age: ${person.age}`;
console.log("Result:", profile);
console.log("Expected: Name: Alice, Age: 30");

console.log("\n=== Template Literal Interpolation Test Complete ===");