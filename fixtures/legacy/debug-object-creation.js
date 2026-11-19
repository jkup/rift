// Test object creation methods with assertions

console.log("=== Debug Object Creation Test ===");

// Test 1: Array literal creation
var arr = [1, 2, 3];
if (arr.length == 3) {
    console.log("PASS: Array literal creation works");
} else {
    console.log("FAIL: Array literal creation works");
}

// Test 2: createArray function
var obj2 = createArray();
if (typeof obj2 == "object") {
    console.log("PASS: createArray() function works");
} else {
    console.log("FAIL: createArray() function works");
}

// Test 3: Object.keys functionality
var keys = Object.keys(arr);
if (typeof keys == "object") {
    console.log("PASS: Object.keys returns object");
} else {
    console.log("FAIL: Object.keys returns object");
}

// Test 4: Array element access
if (arr[0] == 1) {
    console.log("PASS: Array element access works");
} else {
    console.log("FAIL: Array element access works");
}

if (arr[2] == 3) {
    console.log("PASS: Array last element access works");
} else {
    console.log("FAIL: Array last element access works");
}

console.log("=== Debug Object Creation Test Complete ==="); 