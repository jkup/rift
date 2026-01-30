// Test Array.reduce() and Array.reduceRight() on empty arrays
// Regression test: reduce() on empty array with no initial value
// returned undefined instead of throwing TypeError

console.log("=== Testing Array.reduce() edge cases ===");

// Normal reduce works
var sum = [1, 2, 3].reduce(function(a, b) { return a + b; });
if (sum === 6) {
    console.log("PASS: reduce sums [1,2,3] to 6");
} else {
    console.log("FAIL: reduce expected 6, got", sum);
}

// Reduce with initial value
var sumInit = [1, 2, 3].reduce(function(a, b) { return a + b; }, 10);
if (sumInit === 16) {
    console.log("PASS: reduce with initial value 10 gives 16");
} else {
    console.log("FAIL: reduce with initial value expected 16, got", sumInit);
}

// Empty array with initial value should return that value
var emptyResult = [].reduce(function(a, b) { return a + b; }, 42);
if (emptyResult === 42) {
    console.log("PASS: reduce on empty array with initial value returns initial value");
} else {
    console.log("FAIL: reduce on empty array expected 42, got", emptyResult);
}

// Empty array with no initial value should throw TypeError
var threwError = false;
try {
    [].reduce(function(a, b) { return a + b; });
} catch (e) {
    threwError = true;
}
if (threwError) {
    console.log("PASS: reduce on empty array with no initial value throws");
} else {
    console.log("FAIL: reduce on empty array should throw TypeError");
}

// Single element, no initial value - returns that element
var single = [42].reduce(function(a, b) { return a + b; });
if (single === 42) {
    console.log("PASS: reduce on single-element array returns that element");
} else {
    console.log("FAIL: reduce on single-element expected 42, got", single);
}
