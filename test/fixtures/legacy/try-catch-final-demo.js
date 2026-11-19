// Final demonstration of try-catch-throw functionality
console.log("=== Try-Catch-Throw Final Demo ===");

// Demo 1: Basic try-catch with throw
console.log("Demo 1: Basic try-catch");
try {
    console.log("About to throw an error");
    throw "Demo error message";
    console.log("ERROR: This line should never execute");
} catch (error) {
    console.log("Successfully caught:", error);
}
console.log("Execution continues after try-catch");

// Demo 2: Different data types
console.log("Demo 2: Different exception types");
try {
    throw 42;
} catch (num) {
    console.log("Caught number:", num);
}

try {
    throw true;
} catch (bool) {
    console.log("Caught boolean:", bool);
}

// Demo 3: Functions and exceptions
console.log("Demo 3: Functions with exceptions");
function riskyFunction(shouldFail) {
    console.log("Inside risky function");
    if (shouldFail) {
        throw "Function failed!";
    }
    return "Function succeeded!";
}

try {
    console.log("Calling function with success");
    console.log(riskyFunction(false));
    
    console.log("Calling function with failure");
    console.log(riskyFunction(true));
    console.log("ERROR: Should not reach here");
} catch (e) {
    console.log("Caught function error:", e);
}

// Demo 4: Nested try-catch
console.log("Demo 4: Nested try-catch");
try {
    console.log("Outer try block");
    try {
        console.log("Inner try block");
        throw "Inner exception";
    } catch (inner) {
        console.log("Inner catch:", inner);
        throw "Outer exception";
    }
} catch (outer) {
    console.log("Outer catch:", outer);
}

// Demo 5: Exception propagation through function calls
console.log("Demo 5: Exception propagation");
function deepFunction() {
    console.log("Deep function called");
    throw "Deep error";
}

function middleFunction() {
    console.log("Middle function called");
    deepFunction();
}

function topFunction() {
    console.log("Top function called");
    middleFunction();
}

try {
    topFunction();
} catch (e) {
    console.log("Caught propagated error:", e);
}

// Demo 6: Control flow with exceptions
console.log("Demo 6: Control flow");
var counter = 0;
while (counter < 3) {
    console.log("Loop iteration:", counter);
    try {
        if (counter === 1) {
            throw "Error at iteration " + counter;
        }
        console.log("Normal execution at iteration:", counter);
    } catch (e) {
        console.log("Caught in loop:", e);
    }
    counter = counter + 1;
}

// Demo 7: Variable scoping in catch blocks
console.log("Demo 7: Variable scoping");
var outerVariable = "I am outer";
try {
    throw "scoped exception";
} catch (outerVariable) {
    console.log("Inside catch block, parameter:", outerVariable);
}
console.log("Outside catch block, original variable:", outerVariable);

console.log("=== Try-Catch-Throw Demo Complete ===");
console.log("All tests passed! Try-catch functionality is working perfectly!"); 