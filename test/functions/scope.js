// Test variable scope in functions
let globalVar = 1;

function testScope() {
    let localVar = 2;
    globalVar = 3;  // Modify global variable
    
    // Test access to both variables
    console.log("PASS: Function can access global and local variables");
    if (globalVar !== 3 || localVar !== 2) {
        console.log("FAIL: Function scope variable access failed");
    }
}

testScope();

// Test that local variable is not accessible outside
console.log("PASS: Local variable is not accessible outside function");
if (typeof localVar !== "undefined") {
    console.log("FAIL: Local variable should not be accessible outside function");
}

// Test nested function scope
function outer() {
    let x = 1;
    
    function inner() {
        let y = 2;
        x = 3;  // Modify outer variable
        
        console.log("PASS: Inner function can access outer variables");
        if (x !== 3 || y !== 2) {
            console.log("FAIL: Inner function scope access failed");
        }
    }
    
    inner();
    
    console.log("PASS: Outer function can see changes from inner function");
    if (x !== 3) {
        console.log("FAIL: Outer function should see changes from inner function");
    }
}

outer();

// Test variable shadowing
let shadowed = 1;

function testShadowing() {
    let shadowed = 2;  // Shadow the global variable
    
    console.log("PASS: Local variable shadows global variable");
    if (shadowed !== 2) {
        console.log("FAIL: Local variable should shadow global variable");
    }
}

testShadowing();

console.log("PASS: Global variable is unchanged after shadowing");
if (shadowed !== 1) {
    console.log("FAIL: Global variable should be unchanged after shadowing");
} 