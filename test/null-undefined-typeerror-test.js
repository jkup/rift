// Test TypeError for property access on null/undefined
// ES2024 §7.1.18 RequireObjectCoercible — null and undefined are not coercible
console.log("=== null/undefined TypeError Test ===");

var passed = 0;
var total = 0;

function test(name, fn) {
    total++;
    try {
        fn();
        passed++;
        console.log("PASS:", name);
    } catch(e) {
        console.log("FAIL:", name, "-", e.message || e);
    }
}

function expectTypeError(name, fn) {
    total++;
    try {
        fn();
        console.log("FAIL:", name, "- no error thrown");
    } catch(e) {
        if (e instanceof TypeError) {
            passed++;
            console.log("PASS:", name);
        } else {
            console.log("FAIL:", name, "- wrong error type:", typeof e);
        }
    }
}

// Property read on null
expectTypeError("null.foo throws TypeError", function() { null.foo; });
expectTypeError("null['key'] throws TypeError", function() { null['key']; });

// Property read on undefined
expectTypeError("undefined.foo throws TypeError", function() { undefined.foo; });
expectTypeError("undefined['key'] throws TypeError", function() { undefined['key']; });

// Property write on null
expectTypeError("null.foo = 1 throws TypeError", function() { null.foo = 1; });

// Property write on undefined
expectTypeError("undefined.foo = 1 throws TypeError", function() { undefined.foo = 1; });

// Method call on null
expectTypeError("null.toString() throws TypeError", function() { null.toString(); });

// Method call on undefined
expectTypeError("undefined.toString() throws TypeError", function() { undefined.toString(); });

// Chained property access where intermediate is undefined
expectTypeError("({}).a.b throws TypeError", function() { ({}).a.b; });

// Optional chaining should NOT throw
test("null?.foo returns undefined", function() {
    var result = null?.foo;
    if (result !== undefined) throw new Error("Expected undefined, got " + result);
});

test("undefined?.foo returns undefined", function() {
    var result = undefined?.foo;
    if (result !== undefined) throw new Error("Expected undefined, got " + result);
});

test("null?.toString() returns undefined", function() {
    var result = null?.toString();
    if (result !== undefined) throw new Error("Expected undefined, got " + result);
});

// TypeError should be a proper object
test("TypeError has correct constructor", function() {
    try { null.foo; } catch(e) {
        if (e.constructor !== TypeError) throw new Error("Wrong constructor");
        if (typeof e.message !== 'string') throw new Error("No message");
        if (e.name !== 'TypeError') throw new Error("Wrong name: " + e.name);
    }
});

console.log();
console.log(passed + "/" + total + " tests passed");
if (passed === total) {
    console.log("PASSED");
} else {
    console.log("FAILED");
    throw new Error(total - passed + " tests failed");
}
