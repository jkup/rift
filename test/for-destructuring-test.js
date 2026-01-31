// Test: for-loop destructuring patterns

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

// Test 1: Array destructuring in for-of
var results1 = [];
for (let [a, b] of [[1, 2], [3, 4], [5, 6]]) {
    results1.push(a);
    results1.push(b);
}
assert(results1[0] === 1, "for-of array destructuring a=1");
assert(results1[1] === 2, "for-of array destructuring b=2");
assert(results1[2] === 3, "for-of array destructuring a=3");
assert(results1[3] === 4, "for-of array destructuring b=4");
assert(results1[4] === 5, "for-of array destructuring a=5");
assert(results1[5] === 6, "for-of array destructuring b=6");

// Test 2: Object destructuring in for-of
var names = [];
var ages = [];
for (const {name, age} of [{name: "Alice", age: 30}, {name: "Bob", age: 25}]) {
    names.push(name);
    ages.push(age);
}
assert(names[0] === "Alice", "for-of object destructuring name=Alice");
assert(names[1] === "Bob", "for-of object destructuring name=Bob");
assert(ages[0] === 30, "for-of object destructuring age=30");
assert(ages[1] === 25, "for-of object destructuring age=25");

// Test 3: Rest element in for-of destructuring
var firsts = [];
var rests = [];
for (var [first, ...rest] of [[1, 2, 3], [4, 5, 6]]) {
    firsts.push(first);
    rests.push(rest);
}
assert(firsts[0] === 1, "for-of rest first=1");
assert(firsts[1] === 4, "for-of rest first=4");
assert(rests[0].length === 2, "for-of rest rest.length=2");
assert(rests[0][0] === 2, "for-of rest rest[0]=2");
assert(rests[0][1] === 3, "for-of rest rest[1]=3");

// Test 4: Default values in for-of destructuring
var xs = [];
var ys = [];
for (let [x, y = 0] of [[1, 2], [3]]) {
    xs.push(x);
    ys.push(y);
}
assert(xs[0] === 1, "for-of default x=1");
assert(ys[0] === 2, "for-of default y=2 (provided)");
assert(xs[1] === 3, "for-of default x=3");
assert(ys[1] === 0, "for-of default y=0 (default)");

// Test 5: Nested array destructuring in for-of
var as = [];
var bs = [];
var cs = [];
for (let [a, [b, c]] of [[1, [2, 3]], [4, [5, 6]]]) {
    as.push(a);
    bs.push(b);
    cs.push(c);
}
assert(as[0] === 1, "for-of nested a=1");
assert(bs[0] === 2, "for-of nested b=2");
assert(cs[0] === 3, "for-of nested c=3");
assert(as[1] === 4, "for-of nested a=4");
assert(bs[1] === 5, "for-of nested b=5");
assert(cs[1] === 6, "for-of nested c=6");

// Test 6: Object destructuring with renaming in for-of
var ns = [];
for (const {name: n} of [{name: "Alice"}, {name: "Bob"}]) {
    ns.push(n);
}
assert(ns[0] === "Alice", "for-of rename n=Alice");
assert(ns[1] === "Bob", "for-of rename n=Bob");

// Test 7: var destructuring in for-of (var scoping)
for (var [p, q] of [[10, 20]]) {
    // p and q should be accessible
}
assert(p === 10, "for-of var scoping p=10");
assert(q === 20, "for-of var scoping q=20");

// Test 8: const destructuring in for-of
var constResults = [];
for (const [m, n] of [[7, 8], [9, 10]]) {
    constResults.push(m + n);
}
assert(constResults[0] === 15, "for-of const m+n=15");
assert(constResults[1] === 19, "for-of const m+n=19");

// Test 9: for-in with destructuring (keys are strings, destructuring applies to them)
// This is unusual but syntactically valid - the key string gets destructured
var chars = [];
for (let [c] of ["ab", "cd"]) {
    chars.push(c);
}
assert(chars[0] === "a", "for-of string destructuring c=a");
assert(chars[1] === "c", "for-of string destructuring c=c");

// Print summary
console.log("For-destructuring tests: " + passed + " passed, " + failed + " failed");
if (failed > 0) {
    console.log("SOME TESTS FAILED");
} else {
    console.log("ALL TESTS PASSED");
}
