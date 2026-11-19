// Promise.withResolvers() tests - ES2024

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
var test2Value = null;
var test3Value = null;

// Test 1: withResolvers returns object with promise, resolve, reject
console.log("Test 1: withResolvers returns correct structure");
var resolvers1 = Promise.withResolvers();
test("has promise property", true, resolvers1.promise !== undefined);
test("has resolve property", true, typeof resolvers1.resolve === "function");
test("has reject property", true, typeof resolvers1.reject === "function");

// Test 2: resolve function works
var resolvers2 = Promise.withResolvers();
resolvers2.promise.then(function(v) { test1Value = v; });
resolvers2.resolve(42);

// Test 3: reject function works
var resolvers3 = Promise.withResolvers();
resolvers3.promise['catch'](function(e) { test2Value = e; });
resolvers3.reject("error");

// Test 4: Can be used externally (the main use case)
var resolvers4 = Promise.withResolvers();
var externalResolve = resolvers4.resolve;
var externalPromise = resolvers4.promise;
externalPromise.then(function(v) { test3Value = v; });
// Resolve from outside
externalResolve("external resolve works!");

// Verification
Promise.resolve()
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() { return Promise.resolve(); })
    .then(function() {
        console.log("");
        console.log("=== Promise.withResolvers Results ===");

        test("resolve function resolves promise", 42, test1Value);
        test("reject function rejects promise", "error", test2Value);
        test("external resolve works", "external resolve works!", test3Value);

        console.log("");
        console.log("Passed: " + passCount + "/" + testCount);
    });

console.log("Tests queued, waiting for microtasks...");
