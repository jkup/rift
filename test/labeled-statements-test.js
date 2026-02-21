// Test: Labeled Statements
// Tests labeled break, labeled continue, and labeled statement semantics.

var passed = 0;
var failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.log("FAIL: " + message);
    }
}

// Test 1: Labeled break from nested for loops
(function() {
    var result = 0;
    outer: for (var i = 0; i < 5; i++) {
        for (var j = 0; j < 5; j++) {
            if (j === 2) break outer;
            result++;
        }
    }
    assert(result === 2, "labeled break from nested for loops: expected 2, got " + result);
    assert(i === 0, "labeled break - outer loop variable: expected 0, got " + i);
})();

// Test 2: Labeled continue on outer loop
(function() {
    var result = 0;
    outer: for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            if (j === 1) continue outer;
            result++;
        }
    }
    assert(result === 3, "labeled continue on outer loop: expected 3, got " + result);
})();

// Test 3: Labeled break from block statement (non-loop)
(function() {
    var result = 0;
    block: {
        result = 1;
        break block;
        result = 2;
    }
    assert(result === 1, "labeled break from block: expected 1, got " + result);
})();

// Test 4: Labeled break through switch statement
(function() {
    var result = 0;
    outer: for (var i = 0; i < 3; i++) {
        switch (i) {
            case 1:
                break outer;
            default:
                result++;
        }
    }
    assert(result === 1, "labeled break through switch: expected 1, got " + result);
})();

// Test 5: Labeled while loop
(function() {
    var result = 0;
    var i = 0;
    outer: while (i < 5) {
        i++;
        var j = 0;
        while (j < 5) {
            j++;
            if (j === 2) continue outer;
            result++;
        }
    }
    assert(result === 5, "labeled continue on outer while: expected 5, got " + result);
})();

// Test 6: Labeled do-while loop
(function() {
    var result = 0;
    var i = 0;
    outer: do {
        i++;
        var j = 0;
        do {
            j++;
            if (j === 2) continue outer;
            result++;
        } while (j < 5);
    } while (i < 3);
    assert(result === 3, "labeled continue on outer do-while: expected 3, got " + result);
})();

// Test 7: Labeled for-in loop
(function() {
    var result = [];
    var obj1 = { a: 1, b: 2, c: 3 };
    var obj2 = { x: 10, y: 20 };
    outer: for (var key1 in obj1) {
        for (var key2 in obj2) {
            if (key2 === "y") continue outer;
            result.push(key1 + "-" + key2);
        }
    }
    assert(result.length === 3, "labeled for-in: expected 3 results, got " + result.length);
    assert(result[0] === "a-x", "labeled for-in first: expected a-x, got " + result[0]);
})();

// Test 8: Labeled for-of loop
(function() {
    var result = [];
    var arr1 = [1, 2, 3];
    var arr2 = [10, 20, 30];
    outer: for (var a of arr1) {
        for (var b of arr2) {
            if (b === 20) continue outer;
            result.push(a * 100 + b);
        }
    }
    assert(result.length === 3, "labeled for-of: expected 3 results, got " + result.length);
    assert(result[0] === 110, "labeled for-of first: expected 110, got " + result[0]);
    assert(result[1] === 210, "labeled for-of second: expected 210, got " + result[1]);
})();

// Test 9: Nested labels (break inner vs outer)
(function() {
    var result = 0;
    outer: for (var i = 0; i < 3; i++) {
        inner: for (var j = 0; j < 3; j++) {
            if (j === 1) break inner;
            result++;
        }
    }
    assert(result === 3, "break inner label: expected 3, got " + result);

    result = 0;
    outer2: for (var i = 0; i < 3; i++) {
        inner2: for (var j = 0; j < 3; j++) {
            if (j === 1) break outer2;
            result++;
        }
    }
    assert(result === 1, "break outer label: expected 1, got " + result);
})();

// Test 10: Unlabeled break/continue still work (regression check)
(function() {
    var result = 0;
    for (var i = 0; i < 5; i++) {
        if (i === 3) break;
        result++;
    }
    assert(result === 3, "unlabeled break still works: expected 3, got " + result);

    result = 0;
    for (var i = 0; i < 5; i++) {
        if (i === 2) continue;
        result++;
    }
    assert(result === 4, "unlabeled continue still works: expected 4, got " + result);
})();

// Test 11: Labeled break from deeply nested loops
(function() {
    var count = 0;
    outer: for (var i = 0; i < 10; i++) {
        for (var j = 0; j < 10; j++) {
            for (var k = 0; k < 10; k++) {
                count++;
                if (count === 5) break outer;
            }
        }
    }
    assert(count === 5, "labeled break from 3-deep loops: expected 5, got " + count);
})();

// Test 12: Labeled continue with for loop update expression
(function() {
    var result = [];
    outer: for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            if (j === 1) continue outer;
            result.push(i + "," + j);
        }
    }
    assert(result.length === 3, "labeled continue with update: expected 3, got " + result.length);
    assert(result[0] === "0,0", "first pair: expected 0,0, got " + result[0]);
    assert(result[1] === "1,0", "second pair: expected 1,0, got " + result[1]);
    assert(result[2] === "2,0", "third pair: expected 2,0, got " + result[2]);
})();

console.log("Labeled statements tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
    console.log("SOME TESTS FAILED");
} else {
    console.log("ALL TESTS PASSED");
}
