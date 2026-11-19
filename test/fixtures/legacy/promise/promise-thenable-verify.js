// Promise Thenable Verification Test
// This test verifies actual values after microtasks drain

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

// Test values that will be set by promise callbacks
var thenable1Value = null;
var thenable2Value = null;
var constructorValue = null;
var handlerValue = null;
var chainedValue = null;
var notThenableValue = null;
var threwValue = null;

// Set up all the promises
var t1 = { then: function(res, rej) { res("thenable1"); } };
Promise.resolve(t1).then(function(v) { thenable1Value = v; });

var t2 = { then: function(res, rej) { rej("rejected"); } };
// Note: Using ['catch'] because Rift's parser doesn't support obj.catch (reserved keyword)
Promise.resolve(t2)['catch'](function(v) { thenable2Value = v; });

var t3 = { then: function(res, rej) { res(42); } };
var pConstructor = new Promise(function(resolve, reject) {
    resolve(t3);
});
pConstructor.then(function(v) { constructorValue = v; });

var t4 = { then: function(res, rej) { res("from handler"); } };
var pBase = Promise.resolve("start");
var pHandler = pBase.then(function(v) { return t4; });
pHandler.then(function(v) { handlerValue = v; });

var t5a = { then: function(res, rej) {
    var t5b = { then: function(res2, rej2) { res2("deeply nested"); } };
    res(t5b);
} };
Promise.resolve(t5a).then(function(v) { chainedValue = v; });

var notThenable = { then: "not a function" };
Promise.resolve(notThenable).then(function(v) { notThenableValue = v; });

var throwingThenable = { then: function(res, rej) { throw new Error("boom"); } };
Promise.resolve(throwingThenable)['catch'](function(e) { threwValue = "caught"; });

// Thenable adoption creates multiple rounds of microtasks:
// 1. Promise.resolve(thenable) enqueues a microtask to call thenable.then()
// 2. thenable.then() calls resolve() which triggers reactions
// 3. Reactions are enqueued as more microtasks
// So we need multiple rounds of .then() to wait for everything

Promise.resolve()
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() {
        console.log("");
        console.log("=== Verification Results ===");

        test("Thenable resolve value", "thenable1", thenable1Value);
        test("Thenable reject value", "rejected", thenable2Value);
        test("Constructor thenable value", 42, constructorValue);
        test("Handler returning thenable", "from handler", handlerValue);
        test("Chained thenables", "deeply nested", chainedValue);
        test("Non-function .then (not thenable)", notThenable, notThenableValue);
        test("Throwing thenable caught", "caught", threwValue);

        console.log("");
        console.log("Passed: " + passCount + "/" + testCount);
    });

console.log("Tests queued, waiting for microtasks...");
