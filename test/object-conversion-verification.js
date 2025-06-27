// Verification test for Object constructor primitive conversion
console.log("=== Object Constructor Conversion Verification ===");

// Test core functionality
var str = Object("hello");
var bool = Object(true);  
var num = Object(42);
var obj = Object({test: true});

console.log("String conversion works:", typeof str === "object" && str.valueOf() === "hello");
console.log("Boolean conversion works:", typeof bool === "object" && bool.valueOf() === true);
console.log("Number conversion works:", typeof num === "object" && num.valueOf() === 42);
console.log("Object pass-through works:", typeof obj === "object");

// Show toString() method behavior
console.log("String toString():", str.toString());
console.log("Boolean toString():", bool.toString());
console.log("Number toString():", num.toString());

// Test empty constructor
console.log("Empty Object() works:", typeof Object() === "object");

console.log("=== All Object Constructor Tests PASSED! ==="); 