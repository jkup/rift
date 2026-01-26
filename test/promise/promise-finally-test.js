// Promise.prototype.finally() tests - Phase 6.2

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

// Test values
var test1Value = null;
var test1Finally = false;
var test2Value = null;
var test2Finally = false;
var test3Value = null;
var test4Value = null;
var test5Value = null;
var test6Error = null;

// Test 1: finally() preserves fulfilled value
var p1 = Promise.resolve(42);
var p1Final = p1["finally"](function() {
    test1Finally = true;
    return 999;  // Return value should be ignored
});
p1Final.then(function(v) { test1Value = v; });

// Test 2: finally() preserves rejected reason
var p2 = Promise.reject("error");
var p2Final = p2["finally"](function() {
    test2Finally = true;
    return 888;  // Return value should be ignored
});
p2Final["catch"](function(e) { test2Value = e; });

// Test 3: finally() callback throwing overrides value
var p3 = Promise.resolve(100);
var p3Final = p3["finally"](function() {
    throw new Error("finally threw");
});
p3Final["catch"](function(e) { test3Value = "caught"; });

// Test 4: finally() with non-function is pass-through
var p4 = Promise.resolve(200);
var p4Final = p4["finally"](null);
p4Final.then(function(v) { test4Value = v; });

// Test 5: finally() called on rejected promise, preserves rejection
var p5 = Promise.reject("original error");
var p5Final = p5["finally"](function() {
    // This runs but rejection should propagate
});
p5Final["catch"](function(e) { test5Value = e; });

// Test 6: finally() waits for returned promise
var p6 = Promise.resolve("start");
var p6Final = p6["finally"](function() {
    // Return a promise - finally should wait for it
    return Promise.resolve("ignored");
});
p6Final.then(function(v) { test6Error = v; });

// Verification after microtasks
Promise.resolve()
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() {
        console.log("");
        console.log("=== Finally Test Results ===");

        test("finally preserves fulfilled value", 42, test1Value);
        test("finally callback was called (fulfilled)", true, test1Finally);
        test("finally preserves rejected reason", "error", test2Value);
        test("finally callback was called (rejected)", true, test2Finally);
        test("finally throwing overrides value", "caught", test3Value);
        test("finally non-function is pass-through", 200, test4Value);
        test("finally preserves rejection after callback", "original error", test5Value);
        test("finally waits for returned promise", "start", test6Error);

        console.log("");
        console.log("Passed: " + passCount + "/" + testCount);
    });

console.log("Tests queued, waiting for microtasks...");
