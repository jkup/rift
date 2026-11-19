// Test Array.sort() with comparator function
// Regression test: sort() previously ignored the comparator argument entirely

console.log("=== Testing Array.sort() with comparator ===");

// Test 1: Numeric ascending sort
var nums = [3, 1, 4, 1, 5, 9, 2, 6];
nums.sort(function(a, b) { return a - b; });
if (nums[0] === 1 && nums[1] === 1 && nums[2] === 2 && nums[3] === 3 &&
    nums[4] === 4 && nums[5] === 5 && nums[6] === 6 && nums[7] === 9) {
    console.log("PASS: Numeric ascending sort works");
} else {
    console.log("FAIL: Numeric ascending sort expected [1,1,2,3,4,5,6,9], got",
                nums[0], nums[1], nums[2], nums[3], nums[4], nums[5], nums[6], nums[7]);
}

// Test 2: Numeric descending sort
var desc = [3, 1, 2];
desc.sort(function(a, b) { return b - a; });
if (desc[0] === 3 && desc[1] === 2 && desc[2] === 1) {
    console.log("PASS: Numeric descending sort works");
} else {
    console.log("FAIL: Numeric descending sort expected [3,2,1], got", desc[0], desc[1], desc[2]);
}

// Test 3: Default sort (no comparator) is lexicographic
var lex = [10, 9, 2, 1];
lex.sort();
if (lex[0] === 1 && lex[1] === 10 && lex[2] === 2 && lex[3] === 9) {
    console.log("PASS: Default sort is lexicographic");
} else {
    console.log("FAIL: Default sort expected [1,10,2,9], got", lex[0], lex[1], lex[2], lex[3]);
}

// Test 4: String sort with default comparator
var fruits = ["banana", "apple", "cherry"];
fruits.sort();
if (fruits[0] === "apple" && fruits[1] === "banana" && fruits[2] === "cherry") {
    console.log("PASS: Default string sort works");
} else {
    console.log("FAIL: Default string sort expected [apple,banana,cherry], got",
                fruits[0], fruits[1], fruits[2]);
}

// Test 5: Sort returns the same array (mutates in place)
var original = [3, 1, 2];
var returned = original.sort(function(a, b) { return a - b; });
if (original[0] === 1 && original[1] === 2 && original[2] === 3) {
    console.log("PASS: Sort mutates the original array");
} else {
    console.log("FAIL: Sort should mutate the original array");
}

// Test 6: Single element array
var single = [42];
single.sort(function(a, b) { return a - b; });
if (single[0] === 42 && single.length === 1) {
    console.log("PASS: Single element sort is no-op");
} else {
    console.log("FAIL: Single element sort should be no-op");
}

// Test 7: Empty array
var empty = [];
empty.sort(function(a, b) { return a - b; });
if (empty.length === 0) {
    console.log("PASS: Empty array sort is no-op");
} else {
    console.log("FAIL: Empty array sort should be no-op");
}

// Test 8: Two element sort with comparator
var pair = [5, 3];
pair.sort(function(a, b) { return a - b; });
if (pair[0] === 3 && pair[1] === 5) {
    console.log("PASS: Two element comparator sort works");
} else {
    console.log("FAIL: Two element sort expected [3,5], got", pair[0], pair[1]);
}
