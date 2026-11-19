// Arrow function tests
console.log("=== Arrow Function Tests ===");

// Test 1: Expression body with single param (no parens)
console.log("Test 1: Expression body, single param");
var double = x => x * 2;
console.log("double(5) =", double(5));  // Should be 10

// Test 2: Parenthesized single param
console.log("Test 2: Parenthesized single param");
var triple = (x) => x * 3;
console.log("triple(4) =", triple(4));  // Should be 12

// Test 3: Multiple params
console.log("Test 3: Multiple params");
var add = (a, b) => a + b;
console.log("add(3, 4) =", add(3, 4));  // Should be 7

// Test 4: No params
console.log("Test 4: No params");
var greet = () => "Hello!";
console.log("greet() =", greet());  // Should be "Hello!"

// Test 5: Block body with return
console.log("Test 5: Block body with return");
var multiply = (x, y) => {
    var result = x * y;
    return result;
};
console.log("multiply(3, 5) =", multiply(3, 5));  // Should be 15

// Test 6: Block body without return (undefined)
console.log("Test 6: Block body no return");
var noReturn = x => { x + 1; };
console.log("noReturn(5) =", noReturn(5));  // Should be undefined

// Test 7: Lexical this binding
console.log("Test 7: Lexical this");
var obj = {
    value: 42,
    getValue: function() {
        var arrow = () => this.value;
        return arrow();
    }
};
console.log("obj.getValue() =", obj.getValue());  // Should be 42

// Test 8: Arrow as callback
console.log("Test 8: Arrow as callback");
var numbers = [1, 2, 3, 4, 5];
var doubled = numbers.map(x => x * 2);
console.log("doubled =", doubled);  // Should be [2, 4, 6, 8, 10]

// Test 9: Nested arrows (currying)
console.log("Test 9: Nested arrows");
var addCurried = a => b => a + b;
var add5 = addCurried(5);
console.log("add5(3) =", add5(3));  // Should be 8

// Test 10: Constructor should throw
console.log("Test 10: Arrow constructor throws");
var ArrowFunc = x => x;
try {
    var instance = new ArrowFunc(5);
    console.log("FAIL: Should have thrown");
} catch (e) {
    console.log("PASS: Arrow constructor correctly throws");
}

console.log("=== Arrow Function Tests Complete ===");
