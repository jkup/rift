// Test array methods specifically

console.log("=== Testing Array Methods ===");

var arr = [1, 2];
if (arr.length == 2) {
    console.log("PASS: Initial array length is correct");
} else {
    console.log("FAIL: Initial array length expected 2, got", arr.length);
}

// Test push method
console.log("Testing push method:");
var result = arr.push(3);
if (result == 3) {
    console.log("PASS: Push returns new length");
} else {
    console.log("FAIL: Push expected to return 3, got", result);
}

if (arr.length == 3) {
    console.log("PASS: Array length after push is correct");
} else {
    console.log("FAIL: Array length after push expected 3, got", arr.length);
}

// Test pop method
console.log("Testing pop method:");
var popped = arr.pop();
if (popped == 3) {
    console.log("PASS: Pop returns correct element");
} else {
    console.log("FAIL: Pop expected to return 3, got", popped);
}

if (arr.length == 2) {
    console.log("PASS: Array length after pop is correct");
} else {
    console.log("FAIL: Array length after pop expected 2, got", arr.length);
}

// Test toString method
console.log("Testing toString method:");
var str = arr.toString();
if (str == "1,2") {
    console.log("PASS: toString returns correct format");
} else {
    console.log("FAIL: toString expected '1,2', got", str);
}

console.log("=== Method Test Complete ===");
