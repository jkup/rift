// Test double precision with array index maximum
console.log("=== Double Precision Test ===");

// Test the conversion that's happening in our code
var test = [];

// The issue: when we do index + 1 where index = 4294967294
// Result should be 4294967295
// But this might lose precision when converted to double

// Let's test smaller numbers to see where precision is lost
test[16777216] = "2^24"; // Should work fine
console.log("test[16777216] length =", test.length);

test[33554432] = "2^25"; // Should work fine  
console.log("test[33554432] length =", test.length);

test[67108864] = "2^26"; // Should work fine
console.log("test[67108864] length =", test.length);
