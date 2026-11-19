// Debug variable handling with assertions

console.log("=== Debug Object Variables Test ===");

// Test array variable creation
var arr = [1, 2, 3];
if (arr.length == 3) {
    console.log("PASS: Array variable creation works");
} else {
    console.log("FAIL: Array variable creation works");
}

// Test empty object creation
var obj = {};
if (typeof obj == "object") {
    console.log("PASS: Empty object variable creation works");
} else {
    console.log("FAIL: Empty object variable creation works");
}

// Test property assignment
obj.name = "test";
if (obj.name == "test") {
    console.log("PASS: Property assignment works");
} else {
    console.log("FAIL: Property assignment works");
}

// Test variable type checking
if (typeof obj == "object") {
    console.log("PASS: Object variable type is correct");
} else {
    console.log("FAIL: Object variable type is correct");
}

if (typeof arr == "object") {
    console.log("PASS: Array variable type is correct");
} else {
    console.log("FAIL: Array variable type is correct");
}

// Test property access after assignment
if (obj.name == "test") {
    console.log("PASS: Property access after assignment works");
} else {
    console.log("FAIL: Property access after assignment works");
}

console.log("=== Debug Object Variables Test Complete ==="); 