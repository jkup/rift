// Test: Basic for-of loop with arrays

// Test 1: Sum array elements
var arr = [1, 2, 3];
var sum = 0;
for (var x of arr) {
    sum = sum + x;
}
console.log(sum === 6);  // true

// Test 2: for-of with let
var items = ['a', 'b', 'c'];
var result = '';
for (let item of items) {
    result = result + item;
}
console.log(result === 'abc');  // true

// Test 3: for-of with empty array
var empty = [];
var count = 0;
for (var x of empty) {
    count = count + 1;
}
console.log(count === 0);  // true

// Test 4: for-of collects all values
var nums = [10, 20, 30, 40];
var collected = [];
for (var n of nums) {
    collected.push(n);
}
console.log(collected.length === 4);  // true
console.log(collected[0] === 10);  // true
console.log(collected[3] === 40);  // true

// Test 5: for-of with const
var arr2 = [5, 6, 7];
var total = 0;
for (const val of arr2) {
    total = total + val;
}
console.log(total === 18);  // true

// Test 6: Nested for-of
var matrix = [[1, 2], [3, 4], [5, 6]];
var flatSum = 0;
for (var row of matrix) {
    for (var cell of row) {
        flatSum = flatSum + cell;
    }
}
console.log(flatSum === 21);  // true (1+2+3+4+5+6)
