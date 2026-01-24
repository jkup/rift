// Spread Operator Test
// Tests ES6 spread operator (...) in array literals and function calls

console.log("=== Spread Operator Test ===");

// Test 1: Basic spread in array literal
console.log("Test 1: Basic spread in array literal");
var arr1 = [1, 2, 3];
var arr2 = [...arr1];
console.log("arr2.length:", arr2.length);
console.log("arr2[0]:", arr2[0]);
console.log("arr2[2]:", arr2[2]);

// Test 2: Spread with other elements before
console.log("Test 2: Spread with elements before");
var arr3 = [0, ...arr1];
console.log("arr3.length:", arr3.length);
console.log("arr3[0]:", arr3[0]);
console.log("arr3[1]:", arr3[1]);

// Test 3: Spread with other elements after
console.log("Test 3: Spread with elements after");
var arr4 = [...arr1, 4, 5];
console.log("arr4.length:", arr4.length);
console.log("arr4[3]:", arr4[3]);
console.log("arr4[4]:", arr4[4]);

// Test 4: Spread in the middle
console.log("Test 4: Spread in the middle");
var arr5 = [0, ...arr1, 4];
console.log("arr5.length:", arr5.length);
console.log("arr5[0]:", arr5[0]);
console.log("arr5[2]:", arr5[2]);
console.log("arr5[4]:", arr5[4]);

// Test 5: Multiple spreads
console.log("Test 5: Multiple spreads");
var a = [1, 2];
var b = [3, 4];
var combined = [...a, ...b];
console.log("combined.length:", combined.length);
console.log("combined[0]:", combined[0]);
console.log("combined[3]:", combined[3]);

// Test 6: Spread empty array
console.log("Test 6: Spread empty array");
var empty = [];
var withEmpty = [1, ...empty, 2];
console.log("withEmpty.length:", withEmpty.length);
console.log("withEmpty[0]:", withEmpty[0]);
console.log("withEmpty[1]:", withEmpty[1]);

// Test 7: Spread in function call
console.log("Test 7: Spread in function call");
function sum3(a, b, c) {
    return a + b + c;
}
var nums = [1, 2, 3];
console.log("sum3(...nums):", sum3(...nums));

// Test 8: Spread with extra arguments
console.log("Test 8: Spread with extra args");
function sum2(a, b) {
    return a + b;
}
var manyNums = [10, 20, 30, 40];
console.log("sum2(...manyNums):", sum2(...manyNums)); // Uses first two

// Test 9: Mixed spread and regular arguments
console.log("Test 9: Mixed spread and regular args");
function concat4(a, b, c, d) {
    return a + "-" + b + "-" + c + "-" + d;
}
var pair = [2, 3];
console.log("concat4(1, ...pair, 4):", concat4(1, ...pair, 4));

// Test 10: Spread with rest parameter
console.log("Test 10: Spread with rest parameter");
function collectAll(...args) {
    return args.length;
}
var items = [1, 2, 3, 4, 5];
console.log("collectAll(...items):", collectAll(...items));

// Test 11: Spread string into array
console.log("Test 11: Spread string into array");
var str = "abc";
var chars = [...str];
console.log("chars.length:", chars.length);
console.log("chars[0]:", chars[0]);
console.log("chars[1]:", chars[1]);
console.log("chars[2]:", chars[2]);

// Test 12: Array copy is a new array
console.log("Test 12: Array copy is independent");
var original = [1, 2, 3];
var copy = [...original];
original[0] = 99;
console.log("original[0]:", original[0]);
console.log("copy[0]:", copy[0]); // Should still be 1

// Test 13: Spread in nested arrays
console.log("Test 13: Spread creates flat result");
var nested = [[1, 2], [3, 4]];
var flat = [...nested[0], ...nested[1]];
console.log("flat.length:", flat.length);
console.log("flat[0]:", flat[0]);
console.log("flat[3]:", flat[3]);

// Test 14: Multiple spreads in function call
console.log("Test 14: Multiple spreads in function call");
function sum5(a, b, c, d, e) {
    return a + b + c + d + e;
}
var first = [1, 2];
var second = [3, 4, 5];
console.log("sum5(...first, ...second):", sum5(...first, ...second));

// Test 15: Spread with arrow functions
console.log("Test 15: Spread with arrow functions");
var add = (a, b, c) => a + b + c;
var values = [10, 20, 30];
console.log("add(...values):", add(...values));

console.log("=== Spread Operator Test Complete ===");
console.log("All tests passed!");
