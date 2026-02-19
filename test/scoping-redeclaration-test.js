// Sanity tests for parse-time scope tracking and redeclaration detection.
// These test the ALLOWED cases — the SyntaxError cases can't be tested from
// JS since they abort parsing. Run the error cases via the CLI:
//   ./build/rift -e 'let x = 1; let x = 2;'  // SyntaxError

console.log("=== Scoping & Redeclaration Tests ===");

// --- Block scope isolation: same name in different blocks is fine ---
let x = 1;
{
    let x = 2;
    if (x === 2) console.log("PASS: inner block let shadows outer");
}
if (x === 1) console.log("PASS: outer let unchanged after block");

// --- Nested blocks ---
{
    let a = 10;
    {
        let a = 20;
        if (a === 20) console.log("PASS: deeply nested let shadows");
    }
    if (a === 10) console.log("PASS: outer block let unchanged");
}

// --- var hoists through blocks but not functions ---
{
    var hoisted = 42;
}
if (hoisted === 42) console.log("PASS: var hoists out of block");

function checkVarIsolation() {
    var inner = 99;
    return inner;
}
checkVarIsolation();
if (typeof inner === "undefined") console.log("PASS: var does not hoist out of function");

// --- function + function redeclaration (sloppy mode, allowed) ---
function dup() { return 1; }
function dup() { return 2; }
if (dup() === 2) console.log("PASS: duplicate function decl in sloppy mode");

// --- let in for-loop creates per-iteration scope ---
let results = [];
for (let i = 0; i < 3; i++) {
    results.push(i);
}
if (results.length === 3 && results[0] === 0 && results[2] === 2) {
    console.log("PASS: let in for-loop scoping");
}

// --- const in for-of ---
let sum = 0;
for (const val of [10, 20, 30]) {
    sum += val;
}
if (sum === 60) console.log("PASS: const in for-of");

// --- catch parameter scoping ---
let caught = false;
try {
    throw new Error("test");
} catch (e) {
    caught = true;
    // var e is allowed in sloppy mode (Annex B.3.4)
    var e = "shadowed";
    if (e === "shadowed") console.log("PASS: var shadows catch param (Annex B.3.4)");
}
if (caught) console.log("PASS: catch clause executed");

// --- var in nested function doesn't conflict with outer let ---
let outer = "hello";
function inner2() {
    var outer = "world";
    return outer;
}
if (inner2() === "world" && outer === "hello") {
    console.log("PASS: var in nested function isolated from outer let");
}

// --- class name is block-scoped ---
{
    class Foo {
        greet() { return "hi"; }
    }
    let f = new Foo();
    if (f.greet() === "hi") console.log("PASS: class declaration in block");
}

// --- Duplicate params in sloppy function (allowed) ---
function sloppyDup(a, a) { return a; }
if (sloppyDup(1, 2) === 2) console.log("PASS: duplicate params in sloppy function");

// --- Destructuring let ---
let [da, db] = [100, 200];
if (da === 100 && db === 200) console.log("PASS: destructuring let");

let {p: dp, q: dq} = {p: 3, q: 4};
if (dp === 3 && dq === 4) console.log("PASS: object destructuring let");

console.log("=== Scoping & Redeclaration Tests Complete ===");
