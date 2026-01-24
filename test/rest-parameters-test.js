// Rest Parameters Test
// Tests ES6 rest parameters (...args) in function declarations, expressions, and arrow functions

console.log("=== Rest Parameters Test ===");

// Test 1: Basic rest parameter
console.log("Test 1: Basic rest parameter");
function collectArgs(...args) {
    return args;
}
var result = collectArgs(1, 2, 3);
console.log("collectArgs(1,2,3) length:", result.length);
console.log("collectArgs(1,2,3)[0]:", result[0]);
console.log("collectArgs(1,2,3)[2]:", result[2]);

// Test 2: Empty rest parameter
console.log("Test 2: Empty rest parameter");
function noArgs(...args) {
    return args.length;
}
console.log("noArgs() length:", noArgs());

// Test 3: Sum with rest parameter
console.log("Test 3: Sum with rest parameter");
function sum(...nums) {
    var total = 0;
    for (var i = 0; i < nums.length; i++) {
        total = total + nums[i];
    }
    return total;
}
console.log("sum(1,2,3):", sum(1, 2, 3));
console.log("sum(10,20):", sum(10, 20));
console.log("sum():", sum());

// Test 4: Mixed regular and rest parameters
console.log("Test 4: Mixed regular and rest parameters");
function greet(greeting, ...names) {
    var result = greeting;
    for (var i = 0; i < names.length; i++) {
        result = result + " " + names[i];
    }
    return result;
}
console.log("greet('Hello', 'World'):", greet("Hello", "World"));
console.log("greet('Hi', 'A', 'B', 'C'):", greet("Hi", "A", "B", "C"));

// Test 5: Multiple regular params before rest
console.log("Test 5: Multiple regular params before rest");
function format(a, b, ...rest) {
    return a + "-" + b + " [" + rest.length + " more]";
}
console.log("format(1,2):", format(1, 2));
console.log("format(1,2,3,4,5):", format(1, 2, 3, 4, 5));

// Test 6: Rest with default parameters
console.log("Test 6: Rest with default parameters");
function withDefault(a, b = 10, ...rest) {
    return a + b + rest.length;
}
console.log("withDefault(1):", withDefault(1)); // 1 + 10 + 0 = 11
console.log("withDefault(1,2):", withDefault(1, 2)); // 1 + 2 + 0 = 3
console.log("withDefault(1,2,3,4):", withDefault(1, 2, 3, 4)); // 1 + 2 + 2 = 5

// Test 7: Arrow function with rest
console.log("Test 7: Arrow function with rest");
var arrowRest = (...args) => args.length;
console.log("arrowRest():", arrowRest());
console.log("arrowRest(1,2,3):", arrowRest(1, 2, 3));

// Test 8: Arrow function with mixed params
console.log("Test 8: Arrow function with mixed params");
var arrowMixed = (first, ...rest) => first + rest.length;
console.log("arrowMixed(10):", arrowMixed(10)); // 10 + 0 = 10
console.log("arrowMixed(10,20,30):", arrowMixed(10, 20, 30)); // 10 + 2 = 12

// Test 9: Function expression with rest
console.log("Test 9: Function expression with rest");
var funcExpr = function(...items) {
    return items.join("-");
};
console.log("funcExpr(a,b,c):", funcExpr("a", "b", "c"));

// Test 10: Rest array is a real array
console.log("Test 10: Rest array is a real array");
function checkArray(...args) {
    console.log("Is array:", Array.isArray(args));
    console.log("Has push:", typeof args.push);
    args.push(99);
    console.log("After push length:", args.length);
}
checkArray(1, 2, 3);

console.log("=== Rest Parameters Test Complete ===");
console.log("All tests passed!");
