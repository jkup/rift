// Basic try-catch functionality test
console.log("=== Basic Try-Catch Test ===");

// Test 1: Basic string throwing and catching
console.log("Test 1: Basic string throwing and catching");
var caught1 = false;
var error1 = "";
try {
    throw "This is a test error";
} catch (e) {
    caught1 = true;
    error1 = e;
}
if (caught1 && error1 == "This is a test error") {
    console.log("PASS: String throwing and catching works");
} else {
    console.log("FAIL: String throwing and catching works");
}

// Test 2: Basic number throwing and catching
console.log("Test 2: Basic number throwing and catching");
var caught2 = false;
var error2 = 0;
try {
    throw 42;
} catch (e) {
    caught2 = true;
    error2 = e;
}
if (caught2 && error2 == 42) {
    console.log("PASS: Number throwing and catching works");
} else {
    console.log("FAIL: Number throwing and catching works");
}

// Test 3: Basic boolean throwing and catching
console.log("Test 3: Basic boolean throwing and catching");
var caught3 = false;
var error3 = false;
try {
    throw true;
} catch (e) {
    caught3 = true;
    error3 = e;
}
if (caught3 && error3 == true) {
    console.log("PASS: Boolean throwing and catching works");
} else {
    console.log("FAIL: Boolean throwing and catching works");
}

// Test 4: Try block without exception
console.log("Test 4: Try block without exception");
var normalExecution = false;
var catchExecuted = false;
try {
    var result = 10 + 20;
    normalExecution = true;
} catch (e) {
    catchExecuted = true;
}
if (normalExecution && !catchExecuted && result == 30) {
    console.log("PASS: Try block without exception works");
} else {
    console.log("FAIL: Try block without exception works");
}

// Test 5: Catch variable scope
console.log("Test 5: Catch variable scope");
var outsideVar = "outside";
var insideValue = "";
try {
    throw "test exception";
} catch (outsideVar) {
    insideValue = outsideVar;
}
if (insideValue == "test exception" && outsideVar == "outside") {
    console.log("PASS: Catch variable scope works correctly");
} else {
    console.log("FAIL: Catch variable scope works correctly");
}

// Test 6: Execution continues after try-catch
console.log("Test 6: Execution continues after try-catch");
var continueAfter = false;
try {
    throw "error";
} catch (e) {
    // Catch the error
}
continueAfter = true;
if (continueAfter) {
    console.log("PASS: Execution continues after try-catch");
} else {
    console.log("FAIL: Execution continues after try-catch");
}

console.log("=== Basic Try-Catch Test Complete ==="); 