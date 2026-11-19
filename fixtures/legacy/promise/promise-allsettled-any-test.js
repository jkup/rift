// Promise.allSettled() and Promise.any() tests - Phase 7.4

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
var settled1 = null;
var settled2 = null;
var settled3 = null;
var any1 = null;
var any2 = null;
var any3 = null;

// ========== Promise.allSettled tests ==========

// Test 1: allSettled with mixed results
var ps1 = Promise.allSettled([
    Promise.resolve("success"),
    Promise.reject("error"),
    Promise.resolve(42)
]);
ps1.then(function(results) {
    settled1 = results;
});

// Test 2: allSettled with all fulfilled
var ps2 = Promise.allSettled([
    Promise.resolve(1),
    Promise.resolve(2)
]);
ps2.then(function(results) {
    settled2 = results;
});

// Test 3: allSettled with empty array
var ps3 = Promise.allSettled([]);
ps3.then(function(results) {
    settled3 = results;
});

// ========== Promise.any tests ==========

// Test 4: any with first fulfillment
var pa1 = Promise.any([
    Promise.reject("error1"),
    Promise.resolve("winner"),
    Promise.reject("error2")
]);
pa1.then(function(value) {
    any1 = value;
});

// Test 5: any with all rejections
var pa2 = Promise.any([
    Promise.reject("e1"),
    Promise.reject("e2")
]);
pa2['catch'](function(err) {
    any2 = "rejected";
});

// Test 6: any with immediate fulfillment
var pa3 = Promise.any([
    Promise.resolve("first"),
    Promise.resolve("second")
]);
pa3.then(function(value) {
    any3 = value;
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
        console.log("=== Promise.allSettled Tests ===");

        // Test 1: Mixed results
        var t1Pass = settled1 && settled1.length === 3 &&
                     settled1[0].status === "fulfilled" && settled1[0].value === "success" &&
                     settled1[1].status === "rejected" && settled1[1].reason === "error" &&
                     settled1[2].status === "fulfilled" && settled1[2].value === 42;
        test("allSettled mixed results", true, t1Pass);

        // Test 2: All fulfilled
        var t2Pass = settled2 && settled2.length === 2 &&
                     settled2[0].status === "fulfilled" && settled2[0].value === 1 &&
                     settled2[1].status === "fulfilled" && settled2[1].value === 2;
        test("allSettled all fulfilled", true, t2Pass);

        // Test 3: Empty array
        var t3Pass = settled3 && settled3.length === 0;
        test("allSettled empty array", true, t3Pass);

        console.log("");
        console.log("=== Promise.any Tests ===");

        // Test 4: First fulfillment wins
        test("any first fulfillment wins", "winner", any1);

        // Test 5: All rejections
        test("any all rejections", "rejected", any2);

        // Test 6: Immediate fulfillment
        test("any immediate fulfillment", "first", any3);

        console.log("");
        console.log("Passed: " + passCount + "/" + testCount);
    });

console.log("Tests queued, waiting for microtasks...");
