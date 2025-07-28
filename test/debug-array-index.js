// Debug test for large array index
console.log("=== Debug Large Array Index ===");

var test = [];
test[4294967294] = "max-valid";
console.log("test[4294967294] =", test[4294967294]);
console.log("test.length =", test.length);

// Let's test smaller numbers
test[100] = "hundred";
console.log("test[100] =", test[100]);
console.log("test.length after 100 =", test.length);
