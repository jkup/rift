// Debug test for double conversion issues
console.log("=== Debug Double Conversion ===");

var test = [];

// Test progressively larger numbers to find where it breaks
test[1000] = "thousand";
console.log("test[1000] length =", test.length);

test[1000000] = "million";
console.log("test[1000000] length =", test.length);

test[1000000000] = "billion";
console.log("test[1000000000] length =", test.length);

test[2147483647] = "max-int32";
console.log("test[2147483647] length =", test.length);

test[4294967293] = "near-max";
console.log("test[4294967293] length =", test.length);
