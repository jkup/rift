// Basic RegExp functionality tests

// Test 1: RegExp constructor
console.log("Test 1: RegExp constructor");
var regex1 = new RegExp("hello");
console.log(regex1);
console.log(regex1.toString());

// Test 2: RegExp with flags
console.log("\nTest 2: RegExp with flags");
var regex2 = new RegExp("HELLO", "i");
console.log(regex2.toString());
console.log("ignoreCase:", regex2.ignoreCase);
console.log("global:", regex2.global);
console.log("multiline:", regex2.multiline);

// Test 3: test() method - simple matching
console.log("\nTest 3: test() method");
var regex3 = new RegExp("world");
console.log("'hello world'.test(/world/):", regex3.test("hello world"));
console.log("'goodbye'.test(/world/):", regex3.test("goodbye"));

// Test 4: test() method - case insensitive
console.log("\nTest 4: test() with case insensitive flag");
var regex4 = new RegExp("HELLO", "i");
console.log("'hello'.test(/HELLO/i):", regex4.test("hello"));
console.log("'HELLO'.test(/HELLO/i):", regex4.test("HELLO"));
console.log("'HeLLo'.test(/HELLO/i):", regex4.test("HeLLo"));

// Test 5: test() method - pattern matching
console.log("\nTest 5: Pattern matching");
var regex5 = new RegExp("[0-9]+");
console.log("'abc123def'.test(/[0-9]+/):", regex5.test("abc123def"));
console.log("'abcdef'.test(/[0-9]+/):", regex5.test("abcdef"));

// Test 6: Properties
console.log("\nTest 6: RegExp properties");
var regex6 = new RegExp("test", "gim");
console.log("source:", regex6.source);
console.log("flags:", regex6.flags);
console.log("global:", regex6.global);
console.log("ignoreCase:", regex6.ignoreCase);
console.log("multiline:", regex6.multiline);
console.log("lastIndex:", regex6.lastIndex);

// Test 7: Different patterns
console.log("\nTest 7: Different patterns");
var emailRegex = new RegExp("@");
console.log(
  "'test@example.com'.test(/@/):",
  emailRegex.test("test@example.com")
);

var digitRegex = new RegExp("\\d");
console.log("'abc5def'.test(/\\d/):", digitRegex.test("abc5def"));

console.log("\nAll basic RegExp tests completed!");
