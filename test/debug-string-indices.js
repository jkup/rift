// Correct test using string indices directly
console.log("=== Correct Array Index Test ===");

var test = [];

// Test by setting properties with string indices directly
test["1000000"] = "million";
console.log('test["1000000"] =', test["1000000"]);
console.log("test.length =", test.length);

test["4294967294"] = "max-valid";
console.log('test["4294967294"] =', test["4294967294"]);
console.log("test.length =", test.length);

// Test that our validation correctly rejects invalid indices
test["4294967295"] = "invalid";
console.log('test["4294967295"] =', test["4294967295"]);
console.log("test.length after invalid =", test.length);
