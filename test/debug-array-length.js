// Focused test for array index validation
console.log("=== Array Index Validation Debug ===");

var test = [];

// Test with a reasonably large but safe number first
test[1000] = "thousand";
console.log("After test[1000]:");
console.log("test[1000] =", test[1000]);
console.log("test.length =", test.length);

// Test with another large number
test[2000] = "two-thousand";
console.log("After test[2000]:");
console.log("test[2000] =", test[2000]);
console.log("test.length =", test.length);

// Test backward - set lower index after higher
test[1500] = "fifteen-hundred";
console.log("After test[1500]:");
console.log("test[1500] =", test[1500]);
console.log("test.length =", test.length);
