// Test: Basic generator parsing
// This test verifies that generator syntax is parsed correctly

// Generator function declaration
function* simpleGenerator() {
    yield 1;
    yield 2;
    yield 3;
}

// Generator function expression
const genExpr = function*() {
    yield "a";
    yield "b";
};

// Generator with yield* (delegation)
function* delegating() {
    yield* [1, 2, 3];
}

// Generator with empty yield
function* emptyYield() {
    yield;  // yields undefined
}

// Generator with value passing
function* withValue() {
    const x = yield 1;
    yield x;
}

// If we get here without parse errors, the test passes
console.log("Generator parsing test passed!");
