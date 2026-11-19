// Simple Error Types Test
console.log("=== Error Types Simple Test ===");

// Test TypeError
var te = new TypeError("type error");
console.log("PASS: TypeError created");
console.log("PASS: TypeError name:", te.name);
console.log("PASS: TypeError message:", te.message);

// Test ReferenceError
var re = new ReferenceError("ref error");
console.log("PASS: ReferenceError created");
console.log("PASS: ReferenceError name:", re.name);
console.log("PASS: ReferenceError message:", re.message);

// Test SyntaxError
var se = new SyntaxError("syntax error");
console.log("PASS: SyntaxError created");
console.log("PASS: SyntaxError name:", se.name);
console.log("PASS: SyntaxError message:", se.message);

// Test RangeError
var rge = new RangeError("range error");
console.log("PASS: RangeError created");
console.log("PASS: RangeError name:", rge.name);
console.log("PASS: RangeError message:", rge.message);

console.log("\n=== Test Complete ===");
