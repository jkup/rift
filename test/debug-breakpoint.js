// Find where the array length breaks
console.log("=== Finding Array Length Breakpoint ===");

var test = [];

// Test with progressively larger numbers
var numbers = [
    1000000,      // 1 million
    10000000,     // 10 million  
    100000000,    // 100 million
    1000000000,   // 1 billion
    2147483647,   // max signed 32-bit
    4294967294    // max array index
];

for (var i = 0; i < numbers.length; i++) {
    var num = numbers[i];
    var arr = [];
    arr[num] = "test-" + num;
    console.log("arr[" + num + "] = " + arr[num] + ", length = " + arr.length);
}
