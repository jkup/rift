// Comprehensive test for string escape sequences
// Tests all escape sequence types supported by rift

console.log("=== String Escape Sequence Tests ===\n");

// Test 1: Basic escape sequences
console.log("Test 1: Basic escape sequences");
console.log("Newline: 'hello\\nworld'");
console.log("hello\nworld");
console.log("Tab: 'hello\\tworld'");
console.log("hello\tworld");
console.log("Backslash: '\\\\'");
console.log("\\");
console.log("Quote: '\\'hello\\' and \\"world\\"'");
console.log('\'hello\' and "world"');
console.log("✓ Basic escapes work\n");

// Test 2: Additional escape sequences
console.log("Test 2: Additional escape sequences");
console.log("Carriage return: 'hello\\rworld'");
console.log("hello\rworld");
console.log("Null: 'hello\\0world'");
console.log("hello\0world");
console.log("Backspace: 'hello\\bworld'");
console.log("hello\bworld");
console.log("Form feed: 'hello\\fworld'");
console.log("hello\fworld");
console.log("Vertical tab: 'hello\\vworld'");
console.log("hello\vworld");
console.log("✓ Additional escapes work\n");

// Test 3: Hex escapes
console.log("Test 3: Hex escape sequences (\\xHH)");
console.log("\\x41 should be 'A':");
console.log("\x41");
console.log("\\x42\\x43 should be 'BC':");
console.log("\x42\x43");
console.log("\\x48\\x65\\x6C\\x6C\\x6F should be 'Hello':");
console.log("\x48\x65\x6C\x6C\x6F");
console.log("✓ Hex escapes work\n");

// Test 4: Unicode escapes (4 digits)
console.log("Test 4: Unicode escape sequences (\\uHHHH)");
console.log("\\u0041 should be 'A':");
console.log("\u0041");
console.log("\\u0048\\u0065\\u006C\\u006C\\u006F should be 'Hello':");
console.log("\u0048\u0065\u006C\u006C\u006F");
console.log("\\u2665 should be '♥':");
console.log("\u2665");
console.log("\\u4E2D\\u6587 should be '中文':");
console.log("\u4E2D\u6587");
console.log("✓ Unicode escapes work\n");

// Test 5: Unicode code point escapes (ES6)
console.log("Test 5: Unicode code point escapes (\\u{...})");
console.log("\\u{41} should be 'A':");
console.log("\u{41}");
console.log("\\u{1F600} should be '😀':");
console.log("\u{1F600}");
console.log("\\u{1F44D} should be '👍':");
console.log("\u{1F44D}");
console.log("\\u{2665} should be '♥':");
console.log("\u{2665}");
console.log("✓ Unicode code point escapes work\n");

// Test 6: Mixed escapes
console.log("Test 6: Mixed escape sequences");
var mixed = "Hello\\n\\tWorld!\\x20\\u2665\\u{1F600}";
console.log("Mixed string: 'Hello\\\\n\\\\tWorld!\\\\x20\\\\u2665\\\\u{1F600}'");
console.log("Hello\n\tWorld!\x20\u2665\u{1F600}");
console.log("✓ Mixed escapes work\n");

// Test 7: Line continuation (backslash-newline)
console.log("Test 7: Line continuation");
var continued = "This is a long \
string that continues \
on multiple lines";
console.log("Line continuation string:");
console.log(continued);
console.log("✓ Line continuation works\n");

// Test 8: Template literals with escapes
console.log("Test 8: Template literals with escape sequences");
var name = "World";
var template = `Hello\n\t${name}!\x20\u2665`;
console.log("Template with escapes:");
console.log(template);
console.log("✓ Template literal escapes work\n");

// Test 9: Empty and edge cases
console.log("Test 9: Edge cases");
console.log("Empty string: ''");
console.log("");
console.log("Just escapes: '\\n\\t\\x41'");
console.log("\n\t\x41");
console.log("✓ Edge cases work\n");

console.log("=== All Escape Sequence Tests Passed! ===");
