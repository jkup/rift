// Comprehensive RegExp test suite

console.log("=== RegExp Comprehensive Test Suite ===\n");

var passed = 0;
var failed = 0;

function test(description, condition) {
  if (condition) {
    console.log("✓ " + description);
    passed = passed + 1;
  } else {
    console.log("✗ " + description);
    failed = failed + 1;
  }
}

// Test 1: Constructor
console.log("1. Constructor Tests:");
var re1 = new RegExp("test");
test("Constructor creates object", re1 !== undefined);
test("Constructor without flags", re1.source === "test");

var re2 = new RegExp("test", "gi");
test("Constructor with flags", re2.flags === "gi");

// Test 2: Properties
console.log("\n2. Property Tests:");
test("source property", re2.source === "test");
test("flags property", re2.flags === "gi");
test("global flag true", re2.global === true);
test("ignoreCase flag true", re2.ignoreCase === true);
test("multiline flag false", re2.multiline === false);
test("lastIndex initial value", re2.lastIndex === 0);

// Test 3: test() method - basic
console.log("\n3. test() Method - Basic:");
var re3 = new RegExp("hello");
test("Match found", re3.test("hello world") === true);
test("Match not found", re3.test("goodbye") === false);
test("Partial match", re3.test("say hello!") === true);

// Test 4: test() method - case sensitivity
console.log("\n4. test() Method - Case Sensitivity:");
var re4a = new RegExp("HELLO");
var re4b = new RegExp("HELLO", "i");
test("Case sensitive - no match", re4a.test("hello") === false);
test("Case insensitive - match", re4b.test("hello") === true);
test("Case insensitive - HELLO match", re4b.test("HELLO") === true);
test("Case insensitive - HeLLo match", re4b.test("HeLLo") === true);

// Test 5: Character classes
console.log("\n5. Character Classes:");
var re5a = new RegExp("[0-9]");
var re5b = new RegExp("[a-z]");
var re5c = new RegExp("[A-Z]");
test("Digit class matches", re5a.test("abc3def") === true);
test("Digit class no match", re5a.test("abcdef") === false);
test("Lowercase class matches", re5b.test("ABC") === false);
test(
  "Lowercase class with i flag",
  new RegExp("[a-z]", "i").test("ABC") === true
);

// Test 6: Quantifiers
console.log("\n6. Quantifiers:");
var re6a = new RegExp("a+");
var re6b = new RegExp("a*");
var re6c = new RegExp("a?");
var re6d = new RegExp("a{2,4}");
test("+ (one or more)", re6a.test("aaa") === true);
test("+ (zero)", re6a.test("bbb") === false);
test("* (zero or more)", re6b.test("bbb") === true);
test("? (optional)", re6c.test("b") === true);

// Test 7: Anchors
console.log("\n7. Anchors:");
var re7a = new RegExp("^hello");
var re7b = new RegExp("world$");
test("^ start anchor match", re7a.test("hello world") === true);
test("^ start anchor no match", re7a.test("say hello") === false);
test("$ end anchor match", re7b.test("hello world") === true);
test("$ end anchor no match", re7b.test("world hello") === false);

// Test 8: Special characters
console.log("\n8. Special Characters:");
var re8a = new RegExp("\\d");
var re8b = new RegExp("\\w");
var re8c = new RegExp("\\s");
test("\\d digit", re8a.test("abc5") === true);
test("\\w word character", re8b.test("_test") === true);
test("\\s whitespace", re8c.test("hello world") === true);

// Test 9: Groups (without backreferences)
console.log("\n9. Groups:");
var re9a = new RegExp("(hello|goodbye)");
var re9b = new RegExp("(ab)+");
test("Alternation hello", re9a.test("hello world") === true);
test("Alternation goodbye", re9a.test("goodbye world") === true);
test("Grouped quantifier", re9b.test("ababab") === true);

// Test 10: toString()
console.log("\n10. toString() Method:");
var re10a = new RegExp("test");
var re10b = new RegExp("test", "gi");
test("toString no flags", re10a.toString() === "/test/");
test("toString with flags", re10b.toString() === "/test/gi");

// Test 11: Multiple flags
console.log("\n11. Multiple Flags:");
var re11 = new RegExp("test", "gim");
test("Multiple flags - global", re11.global === true);
test("Multiple flags - ignoreCase", re11.ignoreCase === true);
test("Multiple flags - multiline", re11.multiline === true);

// Test 12: Email and URL patterns
console.log("\n12. Practical Patterns:");
var emailRe = new RegExp("@");
var urlRe = new RegExp("http");
test("Simple email check", emailRe.test("user@example.com") === true);
test("Simple URL check", urlRe.test("https://example.com") === true);

// Test 13: Escaped characters
console.log("\n13. Escaped Characters:");
var re13a = new RegExp("\\.");
var re13b = new RegExp("\\*");
test("Escaped dot", re13a.test("file.txt") === true);
test("Escaped asterisk", re13b.test("x*y") === true);

// Summary
console.log("\n=== Test Summary ===");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
console.log("Total: " + (passed + failed));

if (failed === 0) {
  console.log("\n✓ All tests passed!");
} else {
  console.log("\n✗ Some tests failed");
}
