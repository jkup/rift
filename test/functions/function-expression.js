// Test function expression
let add = function(a, b) {
    return a + b;
};

console.log("PASS: Function expression");
if (add(1, 2) !== 3) {
    console.log("FAIL: Function expression failed");
}

// Test function expression in object
let calculator = {
    add: function(a, b) {
        return a + b;
    },
    subtract: function(a, b) {
        return a - b;
    }
};

console.log("PASS: Function expression in object");
if (calculator.add(5, 3) !== 8 || calculator.subtract(5, 3) !== 2) {
    console.log("FAIL: Function expression in object failed");
}

// Test function expression as argument
function callFunction(fn, a, b) {
    return fn(a, b);
}

console.log("PASS: Function expression as argument");
if (callFunction(function(x, y) { return x * y; }, 4, 2) !== 8) {
    console.log("FAIL: Function expression as argument failed");
}

// Test function expression with closure
function createCounter() {
    let count = 0;
    return function() {
        return ++count;
    };
}

let counter = createCounter();

console.log("PASS: Function expression with closure");
if (counter() !== 1 || counter() !== 2 || counter() !== 3) {
    console.log("FAIL: Function expression with closure failed");
}

// Test function expression with multiple returns
let getOperation = function(op) {
    if (op === "add") {
        return function(a, b) { return a + b; };
    } else if (op === "subtract") {
        return function(a, b) { return a - b; };
    }
    return function(a, b) { return 0; };
};

console.log("PASS: Function expression with multiple returns");
if (getOperation("add")(5, 3) !== 8 || 
    getOperation("subtract")(5, 3) !== 2 || 
    getOperation("multiply")(5, 3) !== 0) {
    console.log("FAIL: Function expression with multiple returns failed");
} 