// Working JavaScript Features Test
// Tests all the features that are currently working in Rift

console.log("=== Working JavaScript Features Test ===");

// ✅ Test 1: Variables and basic operations
console.log("Test 1: Variables and basic operations");
var a = 5;
var b = 3;
console.log("a + b =", a + b); // 8
console.log("a * b =", a * b); // 15
console.log("a - b =", a - b); // 2

// ✅ Test 2: Function declarations
console.log("Test 2: Function declarations");
function add(x, y) {
    return x + y;
}
console.log("add(10, 20) =", add(10, 20)); // 30

// ✅ Test 3: Function expressions (FIXED!)
console.log("Test 3: Function expressions");
var multiply = function(a, b) {
    return a * b;
};
console.log("multiply(6, 7) =", multiply(6, 7)); // 42

// ✅ Test 4: Objects and properties
console.log("Test 4: Objects and properties");
var person = {
    name: "Alice",
    age: 30
};
console.log("person.name =", person.name); // Alice
console.log("person.age =", person.age); // 30

// ✅ Test 5: Arrays
console.log("Test 5: Arrays");
var numbers = [1, 2, 3, 4];
console.log("numbers.length =", numbers.length); // 4
console.log("numbers[2] =", numbers[2]); // 3

// ✅ Test 6: Control flow - if/else
console.log("Test 6: Control flow - if/else");
var x = 10;
if (x > 5) {
    console.log("x is greater than 5");
} else {
    console.log("x is not greater than 5");
}

// ✅ Test 7: Control flow - for loops
console.log("Test 7: Control flow - for loops");
for (var i = 0; i < 3; i = i + 1) {
    console.log("Loop iteration:", i);
}

// ✅ Test 8: Constructor functions with 'new'
console.log("Test 8: Constructor functions with 'new'");
function Car(brand) {
    this.brand = brand;
}
var myCar = new Car("Toyota");
console.log("myCar.brand =", myCar.brand); // Toyota

// ✅ Test 9: Error handling
console.log("Test 9: Error handling");
try {
    throw new Error("Test error");
} catch (e) {
    console.log("Caught error:", e.message);
}

// ✅ Test 10: Boolean operations
console.log("Test 10: Boolean operations");
var p = true;
var q = false;
console.log("p && q =", p && q); // false
console.log("p || q =", p || q); // true

// ✅ Test 11: Template literals (WORKING!)
console.log("Test 11: Template literals");
var name = "World";
var greeting = `Hello, ${name}!`;
console.log("Template result:", greeting); // Hello, World!

console.log("=== Working JavaScript Features Test Complete ===");
console.log("✅ Most core JavaScript features are working!");
