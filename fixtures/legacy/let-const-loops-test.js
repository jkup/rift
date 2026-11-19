// Test let/const behavior in loops and control structures
console.log("=== Let/Const in Loops Test ===");

// Test 1: let in while loop creates new scope each iteration
var i = 0;
while (i < 3) {
    let loopVar = i * 10;
    console.log("while loop let var:", loopVar);
    i++;
}
// loopVar should not be accessible here

// Test 2: const in while loop
var j = 0;
while (j < 2) {
    const constInLoop = j + 100;
    console.log("while loop const var:", constInLoop);
    j++;
}

// Test 3: let/const in if statements
if (true) {
    let ifLet = "inside if";
    const ifConst = "const in if";
    console.log("if statement let:", ifLet);
    console.log("if statement const:", ifConst);
}

// Test 4: Nested scopes
{
    let outer = "outer";
    {
        let inner = "inner";
        console.log("nested scope - outer:", outer); // Should access outer scope
        console.log("nested scope - inner:", inner); // Should access current scope
    }
    console.log("outer scope - outer:", outer); // Should still work
    // inner should not be accessible here
}

// Test 5: let/const in try-catch
try {
    let tryLet = "in try block";
    const tryConst = "const in try";
    console.log("try block let:", tryLet);
    console.log("try block const:", tryConst);
    throw new Error("test error");
} catch (e) {
    let catchLet = "in catch block";
    console.log("catch block let:", catchLet);
    console.log("PASS: Error properly caught in catch block");
}

console.log("=== Let/Const in Loops Test Complete ===");
