// Basic tests for let/const parsing support (temporarily mirrors var behavior)
console.log("=== Let/Const Parser Support Test ===");

// let behaves like var for now
let a = 1;
if (a === 1) console.log("PASS: let declaration with initializer");

let b; // uninitialized
b = 2;
if (b === 2) console.log("PASS: let uninitialized then assigned");

// const behaves like var for now (no enforcement yet)
const c = 3;
if (c === 3) console.log("PASS: const declaration with initializer");

console.log("=== Let/Const Parser Test Complete ===");


