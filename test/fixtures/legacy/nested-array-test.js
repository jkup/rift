// Test multi-line array literal

console.log("Testing multi-line array literal:");

var nested = [
  [1, 2],
  [3, 4],
];

console.log("Multi-line nested array created:", nested.length);
if (nested.length == 2) console.log("PASS: Multi-line nested array has correct length");
if (nested.length != 2) console.log("FAIL: Multi-line nested array length incorrect");

// Test single-line for comparison
var nestedSingle = [
  [1, 2],
  [3, 4],
];
console.log("Single-line nested array created:", nestedSingle.length);
if (nestedSingle.length == 2) console.log("PASS: Single-line nested array has correct length");
if (nestedSingle.length != 2) console.log("FAIL: Single-line nested array length incorrect");

// Test nested element access
if (nested[0] && nested[0].length == 2) console.log("PASS: Nested array element access works");
if (!nested[0] || nested[0].length != 2) console.log("FAIL: Nested array element access failed");

console.log("Test complete");
