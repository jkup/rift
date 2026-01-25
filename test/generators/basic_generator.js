// Test: Basic Generator Infrastructure (Phase 2)
// Verifies that calling a generator function returns an iterator object

function* simpleGenerator() {
    yield 1;
    yield 2;
    yield 3;
}

// Calling a generator function should return an iterator object
const gen = simpleGenerator();

// Verify we got an object back
console.log("Generator returned:", typeof gen); // should be "object"

// The generator object should have a next method
console.log("Has next method:", typeof gen.next); // should be "function"

// The generator object should have a return method
console.log("Has return method:", typeof gen.return); // should be "function"

// The generator object should have a throw method
console.log("Has throw method:", typeof gen.throw); // should be "function"

// Call next() - for Phase 2, this will immediately complete
// Phase 3 will implement actual yield/resume
const result = gen.next();
console.log("next() returned object:", typeof result); // should be "object"
console.log("result.done:", result.done); // true for Phase 2 placeholder
console.log("result.value:", result.value); // undefined for Phase 2 placeholder

// Calling next() again on completed generator should also work
const result2 = gen.next();
console.log("Second next() done:", result2.done); // should be true

console.log("Phase 2 generator infrastructure test passed!");
