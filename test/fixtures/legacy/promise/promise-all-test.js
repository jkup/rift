// Promise.all() tests - Phase 7.2

var results = [];
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

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// Test values
var test1Result = null;
var test2Result = null;
var test3Result = null;
var test4Result = null;
var test5Result = null;
var test6Result = null;

// Test 1: Promise.all with all fulfilled promises
var p1 = Promise.all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
p1.then(function(values) {
    test1Result = values;
});

// Test 2: Promise.all with mixed values and promises
var p2 = Promise.all([1, Promise.resolve(2), 3]);
p2.then(function(values) {
    test2Result = values;
});

// Test 3: Promise.all with empty array
var p3 = Promise.all([]);
p3.then(function(values) {
    test3Result = values;
});

// Test 4: Promise.all rejects on first rejection
var p4 = Promise.all([
    Promise.resolve(1),
    Promise.reject("error"),
    Promise.resolve(3)
]);
p4['catch'](function(reason) {
    test4Result = reason;
});

// Test 5: Promise.all preserves order (not completion order)
var p5 = Promise.all([
    Promise.resolve("first"),
    Promise.resolve("second"),
    Promise.resolve("third")
]);
p5.then(function(values) {
    test5Result = values;
});

// Test 6: Promise.all with single element
var p6 = Promise.all([Promise.resolve(42)]);
p6.then(function(values) {
    test6Result = values;
});

// Verification after microtasks
Promise.resolve()
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() {
        console.log("");
        console.log("=== Promise.all Test Results ===");

        // Test 1: All fulfilled
        var t1Pass = test1Result && test1Result.length === 3 &&
                     test1Result[0] === 1 && test1Result[1] === 2 && test1Result[2] === 3;
        test("all fulfilled resolves with array", true, t1Pass);

        // Test 2: Mixed values
        var t2Pass = test2Result && test2Result.length === 3 &&
                     test2Result[0] === 1 && test2Result[1] === 2 && test2Result[2] === 3;
        test("mixed values and promises", true, t2Pass);

        // Test 3: Empty array
        var t3Pass = test3Result && test3Result.length === 0;
        test("empty array resolves immediately", true, t3Pass);

        // Test 4: First rejection
        test("rejects on first rejection", "error", test4Result);

        // Test 5: Order preserved
        var t5Pass = test5Result && test5Result.length === 3 &&
                     test5Result[0] === "first" && test5Result[1] === "second" && test5Result[2] === "third";
        test("order is preserved", true, t5Pass);

        // Test 6: Single element
        var t6Pass = test6Result && test6Result.length === 1 && test6Result[0] === 42;
        test("single element array", true, t6Pass);

        console.log("");
        console.log("Passed: " + passCount + "/" + testCount);
    });

console.log("Tests queued, waiting for microtasks...");
