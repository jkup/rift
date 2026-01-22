// Arguments Object Test
// Tests for the 'arguments' object in functions

console.log("=== Arguments Object Test ===");

// Test 1: Basic arguments access
console.log("Test 1: Basic Arguments Access");
function basicArgs(a, b, c) {
    if (arguments[0] === 1 && arguments[1] === 2 && arguments[2] === 3) {
        console.log("PASS: arguments[0], [1], [2] work correctly");
    } else {
        console.log("FAIL: basic arguments access failed");
    }
}
basicArgs(1, 2, 3);

// Test 2: arguments.length
console.log("Test 2: arguments.length");
function testLength(a, b) {
    if (arguments.length === 5) {
        console.log("PASS: arguments.length = 5 (more args than params)");
    } else {
        console.log("FAIL: arguments.length expected 5, got " + arguments.length);
    }
}
testLength(1, 2, 3, 4, 5);

// Test 3: Variadic sum function
console.log("Test 3: Variadic Sum Function");
function sum() {
    var total = 0;
    var i = 0;
    while (i < arguments.length) {
        total += arguments[i];
        i++;
    }
    return total;
}
var result = sum(1, 2, 3, 4, 5);
if (result === 15) {
    console.log("PASS: sum(1,2,3,4,5) = 15");
} else {
    console.log("FAIL: sum expected 15, got " + result);
}

// Test 4: Arguments with function expression
console.log("Test 4: Function Expression Arguments");
var multiply = function() {
    var product = 1;
    var i = 0;
    while (i < arguments.length) {
        product *= arguments[i];
        i++;
    }
    return product;
};
var prod = multiply(2, 3, 4);
if (prod === 24) {
    console.log("PASS: multiply(2,3,4) = 24");
} else {
    console.log("FAIL: multiply expected 24, got " + prod);
}

// Test 5: Arguments when no arguments passed
console.log("Test 5: No Arguments Passed");
function noArgs() {
    if (arguments.length === 0) {
        console.log("PASS: arguments.length = 0 when no args");
    } else {
        console.log("FAIL: expected length 0, got " + arguments.length);
    }
}
noArgs();

// Test 6: Arguments with fewer args than parameters
console.log("Test 6: Fewer Args Than Parameters");
function fewerArgs(a, b, c, d) {
    if (arguments.length === 2) {
        console.log("PASS: arguments.length = 2 (only 2 args passed)");
    } else {
        console.log("FAIL: expected length 2, got " + arguments.length);
    }
    if (arguments[2] === undefined) {
        console.log("PASS: arguments[2] is undefined");
    } else {
        console.log("FAIL: arguments[2] should be undefined");
    }
}
fewerArgs(1, 2);

// Test 7: Arguments contains actual values, not parameter names
console.log("Test 7: Arguments Values Independence");
function argsVsParams(x) {
    if (arguments[0] === 100 && arguments[1] === 200) {
        console.log("PASS: arguments has all passed values");
    } else {
        console.log("FAIL: arguments values incorrect");
    }
}
argsVsParams(100, 200);

// Test 8: Nested function has own arguments
console.log("Test 8: Nested Function Arguments");
function outer(a) {
    function inner(b) {
        return arguments[0];
    }
    return inner(999);
}
var nested = outer(111);
if (nested === 999) {
    console.log("PASS: inner function has its own arguments");
} else {
    console.log("FAIL: nested expected 999, got " + nested);
}

// Test 9: Arguments in callback
console.log("Test 9: Arguments in Callback");
function withCallback(cb) {
    return cb(10, 20, 30);
}
var cbResult = withCallback(function() {
    return arguments[0] + arguments[1] + arguments[2];
});
if (cbResult === 60) {
    console.log("PASS: callback arguments work (10+20+30=60)");
} else {
    console.log("FAIL: callback expected 60, got " + cbResult);
}

// Test 10: Maximum function
console.log("Test 10: Maximum Function");
function max() {
    if (arguments.length === 0) return undefined;
    var m = arguments[0];
    var i = 1;
    while (i < arguments.length) {
        if (arguments[i] > m) {
            m = arguments[i];
        }
        i++;
    }
    return m;
}
var maxVal = max(3, 7, 2, 9, 4);
if (maxVal === 9) {
    console.log("PASS: max(3,7,2,9,4) = 9");
} else {
    console.log("FAIL: max expected 9, got " + maxVal);
}

console.log("=== Arguments Object Test Complete ===");
