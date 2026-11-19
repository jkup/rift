// Test generator methods exist
function* gen() {
    yield 1;
}

const g = gen();

// Check types (use bracket notation for reserved words)
console.log("Generator type:", typeof g);
console.log("next type:", typeof g.next);
console.log("return type:", typeof g['return']);
console.log("throw type:", typeof g['throw']);

// Test next() method
const result1 = g.next();
console.log("next() result done:", result1.done);

// Test return() method (bracket notation for reserved word)
function* gen2() { yield 1; }
const g2 = gen2();
const result2 = g2['return'](99);
console.log("return() done:", result2.done);
console.log("return() value:", result2.value);

// Test that generator cannot be called with new
let gotError = false;
try {
    new gen();
} catch (e) {
    gotError = true;
    console.log("Correctly threw error for new");
}
if (!gotError) {
    console.log("ERROR: Should have thrown for new");
}

console.log("Methods test passed!");
