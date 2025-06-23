// Test bracket notation access specifically

console.log("=== Testing Bracket Notation ===");

var arr = [10, 20, 30];
console.log("Array created with length:", arr.length);

// Test if the issue is with bracket notation parsing
console.log("Testing bracket access:");

// Test bracket access with assertions
if (arr[0] == 10) {
    console.log("PASS: arr[0] returns correct value");
} else {
    console.log("FAIL: arr[0] expected 10, got", arr[0]);
}

if (arr[1] == 20) {
    console.log("PASS: arr[1] returns correct value");
} else {
    console.log("FAIL: arr[1] expected 20, got", arr[1]);
}

if (arr[2] == 30) {
    console.log("PASS: arr[2] returns correct value");
} else {
    console.log("FAIL: arr[2] expected 30, got", arr[2]);
}

if (arr[3] === undefined) {
    console.log("PASS: arr[3] returns undefined for out-of-bounds");
} else {
    console.log("FAIL: arr[3] expected undefined, got", arr[3]);
}

// Test bracket assignment
arr[0] = 100;
if (arr[0] == 100) {
    console.log("PASS: Bracket assignment works");
} else {
    console.log("FAIL: Bracket assignment failed, arr[0] =", arr[0]);
}

console.log("=== Test Complete ===");
