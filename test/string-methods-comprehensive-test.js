// Test for the newly added String prototype methods
console.log("=== String Methods Comprehensive Test ===");

// Test string
var testStr = "  hello world test  ";
var result;

// Test concat method
console.log("\n--- Testing concat ---");
result = "hello".concat(" ", "world", "!");
console.log("'hello'.concat(' ', 'world', '!'): " + result);
console.log("Expected: 'hello world!'");

// Test lastIndexOf method  
console.log("\n--- Testing lastIndexOf ---");
var str = "hello world hello";
result = str.lastIndexOf("hello");
console.log("'hello world hello'.lastIndexOf('hello'): " + result);
console.log("Expected: 12");

result = str.lastIndexOf("hello", 10);
console.log("'hello world hello'.lastIndexOf('hello', 10): " + result);
console.log("Expected: 0");

result = str.lastIndexOf("xyz");
console.log("'hello world hello'.lastIndexOf('xyz'): " + result);
console.log("Expected: -1");

// Test slice method
console.log("\n--- Testing slice ---");
result = testStr.slice(2, 7);
console.log("'  hello world test  '.slice(2, 7): '" + result + "'");
console.log("Expected: 'hello'");

result = testStr.slice(-6, -2);
console.log("'  hello world test  '.slice(-6, -2): '" + result + "'");
console.log("Expected: 'test'");

result = testStr.slice(7);
console.log("'  hello world test  '.slice(7): '" + result + "'");
console.log("Expected: 'world test  '");

// Test trim method
console.log("\n--- Testing trim ---");
result = testStr.trim();
console.log("'  hello world test  '.trim(): '" + result + "'");
console.log("Expected: 'hello world test'");

var whitespaceStr = "   \t\n  spaced  \n\t   ";
result = whitespaceStr.trim();
console.log("Whitespace string trim(): '" + result + "'");
console.log("Expected: 'spaced'");

// Test split method
console.log("\n--- Testing split ---");
result = "a,b,c,d".split(",");
console.log("'a,b,c,d'.split(','):");
if (result && typeof result === 'object' && result.length !== undefined) {
    console.log("  Length: " + result.length);
    for (var i = 0; i < result.length; i++) {
        console.log("  [" + i + "]: '" + result[i] + "'");
    }
} else {
    console.log("  ERROR: Not a proper array-like object");
}
console.log("Expected: Array with ['a', 'b', 'c', 'd']");

result = "hello".split("");
console.log("'hello'.split(''):");
if (result && typeof result === 'object' && result.length !== undefined) {
    console.log("  Length: " + result.length);
    for (var i = 0; i < result.length; i++) {
        console.log("  [" + i + "]: '" + result[i] + "'");
    }
} else {
    console.log("  ERROR: Not a proper array-like object");
}
console.log("Expected: Array with ['h', 'e', 'l', 'l', 'o']");

result = "no separator".split();
console.log("'no separator'.split():");
if (result && typeof result === 'object' && result.length !== undefined) {
    console.log("  Length: " + result.length);
    for (var i = 0; i < result.length; i++) {
        console.log("  [" + i + "]: '" + result[i] + "'");
    }
} else {
    console.log("  ERROR: Not a proper array-like object");
}
console.log("Expected: Array with ['no separator']");

// Test method chaining
console.log("\n--- Testing method chaining ---");
result = "  Hello World  ".trim().toLowerCase().slice(0, 5);
console.log("'  Hello World  '.trim().toLowerCase().slice(0, 5): '" + result + "'");
console.log("Expected: 'hello'");

console.log("\n=== All String Methods Tests Complete ==="); 