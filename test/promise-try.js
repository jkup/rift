// Test Promise.try

// Basic: synchronous value wrapped in resolved promise
var p1 = Promise.try(function() { return 42; });
if (!(p1 instanceof Promise)) throw new Error("Expected Promise instance");
p1.then(function(v) {
    if (v !== 42) throw new Error("Expected 42, got " + v);
    console.log("Promise.try sync value: OK");
});

// Exception wrapped in rejected promise
var p2 = Promise.try(function() { throw new Error("test error"); });
p2.catch(function(e) {
    if (e.message !== "test error") throw new Error("Expected 'test error', got " + e.message);
    console.log("Promise.try sync throw: OK");
});

// With extra arguments
var p3 = Promise.try(function(a, b) { return a + b; }, 10, 20);
p3.then(function(v) {
    if (v !== 30) throw new Error("Expected 30, got " + v);
    console.log("Promise.try with args: OK");
});

// Returns a promise even if callback returns a promise
var p4 = Promise.try(function() { return Promise.resolve(99); });
p4.then(function(v) {
    if (v !== 99) throw new Error("Expected 99, got " + v);
    console.log("Promise.try returning promise: OK");
});

// TypeError for non-function
try {
    Promise.try(42);
    throw new Error("Expected TypeError");
} catch (e) {
    if (!e.toString().includes("TypeError")) throw new Error("Wrong error: " + e);
}

// Function length should be 1
if (Promise.try.length !== 1) throw new Error("Promise.try.length should be 1, got " + Promise.try.length);

console.log("All Promise.try tests passed");
