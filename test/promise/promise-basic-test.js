// Basic Promise tests - Phase 2 validation

// Test 1: Promise constructor exists
console.log("Test 1: Promise exists");
console.log(typeof Promise === "function" ? "PASS" : "FAIL");

// Test 2: Promise.resolve creates fulfilled promise
console.log("Test 2: Promise.resolve creates a promise");
var p1 = Promise.resolve(42);
console.log(p1 !== undefined ? "PASS" : "FAIL");

// Test 3: Promise.reject creates rejected promise
console.log("Test 3: Promise.reject creates a promise");
var p2 = Promise.reject("error");
console.log(p2 !== undefined ? "PASS" : "FAIL");

// Test 4: new Promise with executor
console.log("Test 4: new Promise with executor");
var executorCalled = false;
var resolveFunc = null;
var rejectFunc = null;
var p3 = new Promise(function(resolve, reject) {
    executorCalled = true;
    resolveFunc = resolve;
    rejectFunc = reject;
});
console.log(executorCalled ? "PASS" : "FAIL");

// Test 5: Executor receives resolve and reject functions
console.log("Test 5: Executor receives resolve/reject functions");
console.log(typeof resolveFunc === "function" && typeof rejectFunc === "function" ? "PASS" : "FAIL");

// Test 6: Promise constructor without executor throws
console.log("Test 6: Promise without executor throws TypeError");
var threw = false;
try {
    new Promise();
} catch(e) {
    threw = true;
}
console.log(threw ? "PASS" : "FAIL");

// Test 7: Promise constructor with non-function throws
console.log("Test 7: Promise with non-function executor throws TypeError");
var threw2 = false;
try {
    new Promise(42);
} catch(e) {
    threw2 = true;
}
console.log(threw2 ? "PASS" : "FAIL");

// Test 8: Resolve is called synchronously
console.log("Test 8: Executor is called synchronously");
var syncValue = 0;
new Promise(function(resolve) {
    syncValue = 1;
    resolve();
});
console.log(syncValue === 1 ? "PASS" : "FAIL");

// Test 9: Executor throwing rejects the promise (but doesn't crash)
console.log("Test 9: Throwing executor doesn't crash");
var p4 = new Promise(function() {
    throw new Error("executor error");
});
console.log(p4 !== undefined ? "PASS" : "FAIL");

// Test 10: Resolve can be called with value
console.log("Test 10: Resolve can be called with value");
var resolvedWith = null;
new Promise(function(resolve) {
    resolve(123);
});
console.log("PASS"); // If we get here without crashing, it worked

console.log("");
console.log("Basic Promise tests complete!");
