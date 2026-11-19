// Try-catch with functions test
console.log("=== Try-Catch with Functions Test ===");

// Test 1: Function that throws, caught by caller
console.log("Test 1: Function throws, caller catches");
function throwingFunction() {
    console.log("Inside throwing function");
    throw "function exception";
    console.log("ERROR: This should not execute");
}

try {
    console.log("About to call throwing function");
    throwingFunction();
    console.log("ERROR: This should not execute");
} catch (e) {
    console.log("Caught from function:", e);
}

// Test 2: Function with internal try-catch
console.log("Test 2: Function with internal try-catch");
function handlingFunction() {
    console.log("Inside handling function");
    try {
        throw "internal exception";
    } catch (e) {
        console.log("Handled internally:", e);
        return "handled";
    }
}

var result = handlingFunction();
console.log("Function result:", result);

// Test 3: Function that catches and re-throws
console.log("Test 3: Function catches and re-throws");
function rethrowingFunction() {
    try {
        throw "original exception";
    } catch (e) {
        console.log("Caught in function:", e);
        throw "re-thrown exception";
    }
}

try {
    rethrowingFunction();
} catch (e) {
    console.log("Final catch:", e);
}

// Test 4: Nested function calls with exceptions
console.log("Test 4: Nested function calls");
function level1() {
    console.log("Level 1 function");
    level2();
}

function level2() {
    console.log("Level 2 function");
    level3();
}

function level3() {
    console.log("Level 3 function");
    throw "deep function exception";
}

try {
    level1();
} catch (e) {
    console.log("Caught from nested functions:", e);
}

// Test 5: Function parameters and exception handling
console.log("Test 5: Function parameters");
function parameterTest(shouldThrow) {
    if (shouldThrow) {
        throw "parameter-based exception";
    }
    return "success";
}

try {
    var result1 = parameterTest(false);
    console.log("First call result:", result1);
    
    var result2 = parameterTest(true);
    console.log("ERROR: This should not execute");
} catch (e) {
    console.log("Caught parameter exception:", e);
}

console.log("=== Try-Catch with Functions Test Complete ==="); 