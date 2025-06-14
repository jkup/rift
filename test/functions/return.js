// Test basic return
function testBasicReturn() {
    return 42;
}

console.log("PASS: Basic return value");
if (testBasicReturn() !== 42) {
    console.log("FAIL: Basic return value failed");
}

// Test return with expression
function testReturnExpression() {
    let x = 1;
    let y = 2;
    return x + y;
}

console.log("PASS: Return with expression");
if (testReturnExpression() !== 3) {
    console.log("FAIL: Return with expression failed");
}

// Test early return
function testEarlyReturn() {
    if (true) {
        return "early";
    }
    return "late";
}

console.log("PASS: Early return");
if (testEarlyReturn() !== "early") {
    console.log("FAIL: Early return failed");
}

// Test return undefined
function testReturnUndefined() {
    return;
}

console.log("PASS: Return undefined");
if (testReturnUndefined() !== undefined) {
    console.log("FAIL: Return undefined failed");
}

// Test return in nested blocks
function testNestedReturn() {
    {
        {
            return "nested";
        }
    }
    return "outer";
}

console.log("PASS: Return in nested blocks");
if (testNestedReturn() !== "nested") {
    console.log("FAIL: Return in nested blocks failed");
}

// Test return with no value
function testNoReturn() {
    let x = 1;
}

console.log("PASS: No return statement");
if (testNoReturn() !== undefined) {
    console.log("FAIL: No return statement should return undefined");
} 