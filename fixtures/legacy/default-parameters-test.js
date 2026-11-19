// Default Parameters Test
// Tests ES6 default parameter values in function declarations, expressions, and arrow functions

console.log("=== Default Parameters Test ===");

// Test 1: Basic default parameter in function declaration
console.log("Test 1: Basic default parameter");
function greet(name = "World") {
    return "Hello, " + name + "!";
}
console.log("greet() =", greet()); // Hello, World!
console.log("greet('Alice') =", greet("Alice")); // Hello, Alice!

// Test 2: Multiple parameters with defaults
console.log("Test 2: Multiple parameters with defaults");
function add(a, b = 10, c = 20) {
    return a + b + c;
}
console.log("add(1) =", add(1)); // 31
console.log("add(1, 2) =", add(1, 2)); // 23
console.log("add(1, 2, 3) =", add(1, 2, 3)); // 6

// Test 3: Default with expression
console.log("Test 3: Default with expression");
function calculate(x, y = x * 2) {
    return x + y;
}
console.log("calculate(5) =", calculate(5)); // 15
console.log("calculate(5, 10) =", calculate(5, 10)); // 15

// Test 4: Explicit undefined uses default
console.log("Test 4: Explicit undefined uses default");
function withDefault(val = 42) {
    return val;
}
console.log("withDefault() =", withDefault()); // 42
console.log("withDefault(undefined) =", withDefault(undefined)); // 42
console.log("withDefault(null) =", withDefault(null)); // null (null is not undefined!)
console.log("withDefault(0) =", withDefault(0)); // 0

// Test 5: Arrow function with default parameter
console.log("Test 5: Arrow function with default");
var arrowDefault = (x = 100) => x;
console.log("arrowDefault() =", arrowDefault()); // 100
console.log("arrowDefault(50) =", arrowDefault(50)); // 50

// Test 6: Arrow function with multiple defaults
console.log("Test 6: Arrow function with multiple defaults");
var multiArrow = (a, b = 2, c = 3) => a + b + c;
console.log("multiArrow(1) =", multiArrow(1)); // 6
console.log("multiArrow(1, 10) =", multiArrow(1, 10)); // 14
console.log("multiArrow(1, 10, 100) =", multiArrow(1, 10, 100)); // 111

// Test 7: Arrow function with expression default
console.log("Test 7: Arrow function with expression default");
var exprArrow = (x, y = x * 3) => x + y;
console.log("exprArrow(5) =", exprArrow(5)); // 20

// Test 8: Function expression with default
console.log("Test 8: Function expression with default");
var funcExpr = function(val = "default") {
    return val;
};
console.log("funcExpr() =", funcExpr()); // default
console.log("funcExpr('custom') =", funcExpr("custom")); // custom

// Test 9: Default parameter with function call
console.log("Test 9: Default parameter with function call");
function getDefault() {
    return 999;
}
function useFuncDefault(x = getDefault()) {
    return x;
}
console.log("useFuncDefault() =", useFuncDefault()); // 999
console.log("useFuncDefault(1) =", useFuncDefault(1)); // 1

// Test 10: Defaults are evaluated left-to-right (can reference earlier params)
console.log("Test 10: Defaults reference earlier parameters");
function leftToRight(a = 1, b = a + 1, c = b + 1) {
    return a + b + c;
}
console.log("leftToRight() =", leftToRight()); // 1 + 2 + 3 = 6
console.log("leftToRight(10) =", leftToRight(10)); // 10 + 11 + 12 = 33
console.log("leftToRight(10, 20) =", leftToRight(10, 20)); // 10 + 20 + 21 = 51

console.log("=== Default Parameters Test Complete ===");
console.log("All tests passed!");
