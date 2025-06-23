// Array Literals Success Test - All Working Features

console.log("=== ARRAY LITERALS IMPLEMENTATION SUCCESS ===");

// 1. Array Creation
console.log("1. Array Creation:");
var arr1 = [1, 2, 3];
var arr2 = [];
var arr3 = [1, "hello", true, null, undefined];
if (arr1.length == 3) {
    console.log("PASS: Basic array creation");
} else {
    console.log("FAIL: Basic array creation");
}

if (arr2.length == 0) {
    console.log("PASS: Empty array creation");
} else {
    console.log("FAIL: Empty array creation");
}

if (arr3.length == 5) {
    console.log("PASS: Mixed-type array creation");
} else {
    console.log("FAIL: Mixed-type array creation");
}

// 2. Element Access
console.log("2. Element Access (Bracket Notation):");
var access = [10, 20, 30];
if (access[0] == 10) {
    console.log("PASS: Bracket notation access [0]");
} else {
    console.log("FAIL: Bracket notation access [0]");
}

if (access[1] == 20) {
    console.log("PASS: Bracket notation access [1]");
} else {
    console.log("FAIL: Bracket notation access [1]");
}

if (access[2] == 30) {
    console.log("PASS: Bracket notation access [2]");
} else {
    console.log("FAIL: Bracket notation access [2]");
}

// 3. Element Assignment
console.log("3. Element Assignment:");
var assign = [1, 2, 3];
assign[0] = 100;
assign[1] = 200;
if (assign[0] == 100) {
    console.log("PASS: Element assignment [0]");
} else {
    console.log("FAIL: Element assignment [0]");
}

if (assign[1] == 200) {
    console.log("PASS: Element assignment [1]");
} else {
    console.log("FAIL: Element assignment [1]");
}

// 4. Sparse Arrays
console.log("4. Sparse Arrays:");
var sparse = [];
sparse[5] = "five";
if (sparse[5] == "five") {
    console.log("PASS: Sparse array element access");
} else {
    console.log("FAIL: Sparse array element access");
}

if (sparse.length == 6) {
    console.log("PASS: Sparse array automatic length update");
} else {
    console.log("FAIL: Sparse array automatic length update");
}

// 5. Array Methods
console.log("5. Array Methods:");
var methods = [1, 2];
var pushResult = methods.push(3);
if (pushResult == 3) {
    console.log("PASS: push() return value");
} else {
    console.log("FAIL: push() return value");
}

if (methods[2] == 3) {
    console.log("PASS: push() adds element");
} else {
    console.log("FAIL: push() adds element");
}

var popResult = methods.pop();
if (popResult == 3) {
    console.log("PASS: pop() return value");
} else {
    console.log("FAIL: pop() return value");
}

if (methods.length == 2) {
    console.log("PASS: pop() updates length");
} else {
    console.log("FAIL: pop() updates length");
}

// 6. toString Method
console.log("6. toString Method:");
var str = [1, 2, 3];
var strArray = ["a", "b", "c"];
if (str.toString() == "1,2,3") {
    console.log("PASS: Array toString() method");
} else {
    console.log("FAIL: Array toString() method");
}

if (strArray.toString() == "a,b,c") {
    console.log("PASS: String array toString() method");
} else {
    console.log("FAIL: String array toString() method");
}

// 7. Nested Arrays
console.log("7. Nested Arrays:");
var nested = [[1, 2], [3, 4]];
if (nested.length == 2) {
    console.log("PASS: Nested array creation");
} else {
    console.log("FAIL: Nested array creation");
}

if (nested[0][0] == 1) {
    console.log("PASS: Chained array access [0][0]");
} else {
    console.log("FAIL: Chained array access [0][0]");
}

if (nested[0][1] == 2) {
    console.log("PASS: Chained array access [0][1]");
} else {
    console.log("FAIL: Chained array access [0][1]");
}

console.log("=== ARRAY SUCCESS TEST COMPLETE ===");
