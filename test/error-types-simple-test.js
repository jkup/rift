// Simple Error Types Test
console.log("=== Error Types Simple Test ===");

// Test TypeError
const te = new TypeError("type error");
console.log("TypeError name:", te.name);
console.log("TypeError message:", te.message);
console.log("TypeError toString:", te.toString());

// Test ReferenceError
const re = new ReferenceError("ref error");
console.log("ReferenceError name:", re.name);
console.log("ReferenceError message:", re.message);
console.log("ReferenceError toString:", re.toString());

// Test SyntaxError
const se = new SyntaxError("syntax error");
console.log("SyntaxError name:", se.name);
console.log("SyntaxError message:", se.message);
console.log("SyntaxError toString:", se.toString());

// Test RangeError
const rge = new RangeError("range error");
console.log("RangeError name:", rge.name);
console.log("RangeError message:", rge.message);
console.log("RangeError toString:", rge.toString());

console.log("\n=== Test Complete ===");
