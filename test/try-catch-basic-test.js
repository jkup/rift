// Basic try-catch functionality test
console.log("=== Basic Try-Catch Test ===");

// Test 1: Basic string throwing and catching
console.log("Test 1: Basic string throwing and catching");
try {
    console.log("About to throw a string");
    throw "This is a test error";
    console.log("ERROR: This should not execute");
} catch (e) {
    console.log("Caught error:", e);
}
console.log("Execution continued after try-catch");

// Test 2: Basic number throwing and catching
console.log("Test 2: Basic number throwing and catching");
try {
    console.log("About to throw a number");
    throw 42;
    console.log("ERROR: This should not execute");
} catch (e) {
    console.log("Caught number:", e);
}

// Test 3: Basic boolean throwing and catching
console.log("Test 3: Basic boolean throwing and catching");
try {
    console.log("About to throw a boolean");
    throw true;
    console.log("ERROR: This should not execute");
} catch (e) {
    console.log("Caught boolean:", e);
}

// Test 4: Try block without exception
console.log("Test 4: Try block without exception");
try {
    console.log("Normal execution in try block");
    var result = 10 + 20;
    console.log("Result:", result);
} catch (e) {
    console.log("ERROR: Catch block should not execute");
}
console.log("Execution continued normally");

// Test 5: Catch variable scope
console.log("Test 5: Catch variable scope");
var outsideVar = "outside";
try {
    throw "test exception";
} catch (outsideVar) {
    console.log("Inside catch, outsideVar:", outsideVar);
}
console.log("Outside catch, outsideVar:", outsideVar);

console.log("=== Basic Try-Catch Test Complete ==="); 