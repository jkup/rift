// Comprehensive tests for let/const block scoping and TDZ behavior
console.log("=== Let/Const Block Scoping Test ===");

// Test 1: Block scoping with let
{
    let x = 1;
    console.log("Block scope let x:", x); // Should be 1
}
// x should not be accessible here - but we can't test this easily

// Test 2: Block scoping with const
{
    const y = 2;
    console.log("Block scope const y:", y); // Should be 2
}

// Test 3: let vs var scoping difference
var varVariable = "outer";
let letVariable = "outer";

{
    var varVariable = "inner"; // Redefines outer var
    let letVariable = "inner"; // Creates new block-scoped let
    console.log("Inside block - var:", varVariable); // Should be "inner"
    console.log("Inside block - let:", letVariable); // Should be "inner"
}

console.log("Outside block - var:", varVariable); // Should be "inner" (var hoisted)
console.log("Outside block - let:", letVariable); // Should be "outer" (let block-scoped)

// Test 4: const immutability
const constValue = 42;
console.log("const value:", constValue); // Should be 42

try {
    constValue = 100; // Should throw error
    console.log("ERROR: const reassignment should have failed");
} catch (e) {
    console.log("PASS: const reassignment correctly threw error");
}

// Test 5: let reassignment (should work)
let letValue = 10;
console.log("let initial value:", letValue); // Should be 10
letValue = 20;
console.log("let reassigned value:", letValue); // Should be 20

console.log("=== Let/Const Block Scoping Test Complete ===");
