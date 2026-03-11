// Test: Comma operator (SequenceExpression) and destructuring assignment
// ECMAScript §13.16

function assert(cond, msg) {
    if (!cond) throw new Error("FAIL: " + msg);
}

// Basic comma expression — evaluates left-to-right, returns last value
var result = (1, 2, 3);
assert(result === 3, "comma operator should return last value");

// Side effects evaluated left-to-right
var x = 0;
var r = (x = 1, x = 2, x = 3);
assert(r === 3, "comma operator returns last value with side effects");
assert(x === 3, "all side effects should be applied");

// Comma in for-loop update
var sum = 0;
for (var i = 0, j = 10; i < 3; i++, j--) {
    sum += j;
}
assert(sum === 27, "comma in for-loop update: " + sum);

// Indirect eval pattern: (0, eval)
var indirect = (0, eval);
assert(typeof indirect === "function", "indirect eval should be a function");

// Comma doesn't consume in function arguments
function add(a, b) { return a + b; }
assert(add(1, 2) === 3, "comma in args is separator, not operator");

// Comma doesn't consume in array literals
var arr = [1, 2, 3];
assert(arr.length === 3, "comma in array is separator");

// Comma doesn't consume in object literals
var obj = {a: 1, b: 2};
assert(obj.a === 1 && obj.b === 2, "comma in object is separator");

// Destructuring assignment with arrays
var a, b;
[a, b] = [10, 20];
assert(a === 10, "array destructuring assignment a: " + a);
assert(b === 20, "array destructuring assignment b: " + b);

// Destructuring assignment TypeError for null
try {
    [a] = null;
    assert(false, "should have thrown TypeError");
} catch (e) {
    assert(e instanceof TypeError, "should be TypeError, got: " + e);
}

// Destructuring assignment TypeError for undefined
try {
    [a] = undefined;
    assert(false, "should have thrown TypeError");
} catch (e) {
    assert(e instanceof TypeError, "should be TypeError, got: " + e);
}

// Nested comma in parenthesized expression
var v = (1 + 2, 3 * 4);
assert(v === 12, "nested comma with expressions: " + v);

// Comma with assignment returns rightmost value
var c = 0;
var d = (c = 5, c + 1);
assert(d === 6, "comma with assignment: " + d);
assert(c === 5, "assignment in comma: " + c);

console.log("All comma operator and destructuring tests passed!");
