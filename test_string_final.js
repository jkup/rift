// Final comprehensive String builtin test

console.log("=== String Builtin Test ===");

// Static method
console.log("String.fromCharCode(72, 101, 108, 108, 111):");
console.log(String.fromCharCode(72, 101, 108, 108, 111));

// Prototype methods on primitives
console.log("String methods on primitives:");
console.log("charAt: " + "world".charAt(0));
console.log("toUpperCase: " + "hello".toUpperCase());
console.log("toLowerCase: " + "WORLD".toLowerCase());
console.log("charCodeAt: " + "A".charCodeAt(0));

console.log("=== All tests complete! ===");
