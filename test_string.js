// Test String builtin functionality

// Test String.fromCharCode
console.log("Testing String.fromCharCode:");
console.log(String.fromCharCode(72, 101, 108, 108, 111)); // Should print "Hello"

// Test String.prototype methods
console.log("\nTesting String prototype methods:");

// Test charAt
console.log("hello".charAt(1)); // Should print "e"

// Test charCodeAt
console.log("hello".charCodeAt(0)); // Should print 104 (ASCII for 'h')

// Test indexOf
console.log("hello world".indexOf("world")); // Should print 6

// Test slice
console.log("hello world".slice(0, 5)); // Should print "hello"

// Test toUpperCase
console.log("hello".toUpperCase()); // Should print "HELLO"

// Test toLowerCase
console.log("HELLO".toLowerCase()); // Should print "hello"

// Test trim
console.log("  hello  ".trim()); // Should print "hello"

// Test concat
console.log("hello".concat(" ", "world")); // Should print "hello world"
