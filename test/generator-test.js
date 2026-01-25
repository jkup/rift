// Generator Built-in Tests
// Tests for ECMAScript Generator implementation

var passed = 0;
var failed = 0;

function test(name, condition) {
    if (condition) {
        console.log("PASS: " + name);
        passed = passed + 1;
    } else {
        console.log("FAIL: " + name);
        failed = failed + 1;
    }
}

// ============================================================================
// Basic Generator
// ============================================================================

function* basicGenerator() {
    yield 1;
    yield 2;
    yield 3;
}

var g = basicGenerator();
var r1 = g.next();
test("basic generator first yield value", r1.value === 1);
test("basic generator first done", r1.done === false);

var r2 = g.next();
test("basic generator second yield value", r2.value === 2);
test("basic generator second done", r2.done === false);

var r3 = g.next();
test("basic generator third yield value", r3.value === 3);
test("basic generator third done", r3.done === false);

var r4 = g.next();
test("basic generator after completion value", r4.value === undefined);
test("basic generator completed", r4.done === true);

// ============================================================================
// Generator with Return
// ============================================================================

function* genWithReturn() {
    yield 1;
    return "finished";
}

var g2 = genWithReturn();
test("gen with return first yield", g2.next().value === 1);
var ret = g2.next();
test("gen with return value", ret.value === "finished");
test("gen with return done", ret.done === true);

// ============================================================================
// Generator Receiving Values via next()
// ============================================================================

function* genReceive() {
    var x = yield 1;
    var y = yield x + 10;
    return x + y;
}

var g3 = genReceive();
test("receive first yield", g3.next().value === 1);
test("receive second yield (5+10)", g3.next(5).value === 15);
var result = g3.next(20);
test("receive return (5+20)", result.value === 25);
test("receive done", result.done === true);

// ============================================================================
// Generator with While Loop
// ============================================================================

function* counter(start) {
    var n = start;
    while (n < start + 3) {
        yield n;
        n = n + 1;
    }
}

var g4 = counter(10);
test("while loop first", g4.next().value === 10);
test("while loop second", g4.next().value === 11);
test("while loop third", g4.next().value === 12);
test("while loop done", g4.next().done === true);

// ============================================================================
// Generator with For Loop
// ============================================================================

function* range(start, end) {
    for (var i = start; i < end; i = i + 1) {
        yield i;
    }
}

var g5 = range(0, 3);
test("for loop first", g5.next().value === 0);
test("for loop second", g5.next().value === 1);
test("for loop third", g5.next().value === 2);
test("for loop done", g5.next().done === true);

// ============================================================================
// Multiple Independent Generators
// ============================================================================

function* counter2(start) {
    var n = start;
    while (true) {
        yield n;
        n = n + 1;
        if (n > start + 10) break;
    }
}

var a = counter2(1);
var b = counter2(100);
test("multi a first", a.next().value === 1);
test("multi b first", b.next().value === 100);
test("multi a second", a.next().value === 2);
test("multi a third", a.next().value === 3);
test("multi b second", b.next().value === 101);

// ============================================================================
// Generator.return()
// ============================================================================

var g6 = basicGenerator();
g6.next();
var retResult = g6['return'](42);
test("return value", retResult.value === 42);
test("return done", retResult.done === true);
test("after return done", g6.next().done === true);

// ============================================================================
// Generator.throw()
// ============================================================================

var g7 = basicGenerator();
g7.next();
var threwCorrectly = false;
try {
    g7['throw'](new Error("test error"));
} catch (e) {
    threwCorrectly = e.message === "test error";
}
test("throw error message", threwCorrectly);
test("after throw done", g7.next().done === true);

// ============================================================================
// Fibonacci Generator
// ============================================================================

function* fibonacci(max) {
    var a = 0;
    var b = 1;
    while (a < max) {
        yield a;
        var temp = a;
        a = b;
        b = temp + b;
    }
}

var fib = fibonacci(100);
test("fib 0", fib.next().value === 0);
test("fib 1", fib.next().value === 1);
test("fib 1 (again)", fib.next().value === 1);
test("fib 2", fib.next().value === 2);
test("fib 3", fib.next().value === 3);
test("fib 5", fib.next().value === 5);
test("fib 8", fib.next().value === 8);
test("fib 13", fib.next().value === 13);
test("fib done", fib.next().value === 21);

// ============================================================================
// Generator with for...of
// ============================================================================

var sum = 0;
for (var n of range(1, 5)) {
    sum = sum + n;
}
test("for...of with generator (1+2+3+4=10)", sum === 10);

// ============================================================================
// yield* with Array
// ============================================================================

function* yieldStarArray() {
    yield 1;
    yield* [2, 3, 4];
    yield 5;
}

var ga = yieldStarArray();
test("yield* array first", ga.next().value === 1);
test("yield* array delegated 1", ga.next().value === 2);
test("yield* array delegated 2", ga.next().value === 3);
test("yield* array delegated 3", ga.next().value === 4);
test("yield* array last", ga.next().value === 5);
test("yield* array done", ga.next().done === true);

// ============================================================================
// yield* with Generator
// ============================================================================

function* inner() {
    yield "a";
    yield "b";
    yield "c";
}

function* outer() {
    yield "start";
    yield* inner();
    yield "end";
}

var go = outer();
test("yield* generator first", go.next().value === "start");
test("yield* generator delegated a", go.next().value === "a");
test("yield* generator delegated b", go.next().value === "b");
test("yield* generator delegated c", go.next().value === "c");
test("yield* generator last", go.next().value === "end");
test("yield* generator done", go.next().done === true);

// ============================================================================
// yield* Completion Value
// ============================================================================

function* innerWithReturn() {
    yield 1;
    yield 2;
    return "inner done";
}

function* outerWithCompletion() {
    var result = yield* innerWithReturn();
    yield result;
}

var gc = outerWithCompletion();
test("yield* completion first", gc.next().value === 1);
test("yield* completion second", gc.next().value === 2);
test("yield* completion result", gc.next().value === "inner done");
test("yield* completion done", gc.next().done === true);

// ============================================================================
// Nested yield* Delegation
// ============================================================================

function* level3() {
    yield "L3";
}

function* level2() {
    yield "L2-start";
    yield* level3();
    yield "L2-end";
}

function* level1() {
    yield "L1-start";
    yield* level2();
    yield "L1-end";
}

var gn = level1();
test("nested yield* L1 start", gn.next().value === "L1-start");
test("nested yield* L2 start", gn.next().value === "L2-start");
test("nested yield* L3", gn.next().value === "L3");
test("nested yield* L2 end", gn.next().value === "L2-end");
test("nested yield* L1 end", gn.next().value === "L1-end");
test("nested yield* done", gn.next().done === true);

// ============================================================================
// Summary
// ============================================================================

console.log("");
console.log("Generator tests: " + passed + " passed, " + failed + " failed");
