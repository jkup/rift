// Promise.race() tests - Phase 7.3

var testCount = 0;
var passCount = 0;

function test(name, expected, actual) {
    testCount = testCount + 1;
    if (expected === actual) {
        passCount = passCount + 1;
        console.log("PASS: " + name);
    } else {
        console.log("FAIL: " + name + " (expected: " + expected + ", got: " + actual + ")");
    }
}

// Test values
var test1Result = null;
var test2Result = null;
var test3Result = null;
var test4Result = null;

// Test 1: First fulfilled wins
var p1 = Promise.race([
    Promise.resolve("first"),
    Promise.resolve("second"),
    Promise.resolve("third")
]);
p1.then(function(value) {
    test1Result = value;
});

// Test 2: First rejection wins
var p2 = Promise.race([
    Promise.reject("error"),
    Promise.resolve("success")
]);
p2['catch'](function(reason) {
    test2Result = reason;
});

// Test 3: Mixed - fulfillment first
var p3 = Promise.race([
    Promise.resolve("winner"),
    Promise.reject("loser")
]);
p3.then(function(value) {
    test3Result = value;
});

// Test 4: Single element
var p4 = Promise.race([Promise.resolve(42)]);
p4.then(function(value) {
    test4Result = value;
});

// Verification after microtasks
Promise.resolve()
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() {
        console.log("");
        console.log("=== Promise.race Test Results ===");

        test("first fulfilled wins", "first", test1Result);
        test("first rejection wins", "error", test2Result);
        test("fulfillment before rejection", "winner", test3Result);
        test("single element", 42, test4Result);

        console.log("");
        console.log("Passed: " + passCount + "/" + testCount);
    });

console.log("Tests queued, waiting for microtasks...");
