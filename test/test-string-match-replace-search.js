// Test String.prototype.search, match, and replace

var passed = 0;
var failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.log("FAIL: " + message);
    }
}

function assertEquals(actual, expected, message) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        console.log("FAIL: " + message + " (expected " + expected + ", got " + actual + ")");
    }
}

// ============ String.prototype.search ============

// search with string argument
assertEquals("hello world".search("world"), 6, "search string found");
assertEquals("hello world".search("xyz"), -1, "search string not found");
assertEquals("hello world".search("hello"), 0, "search string at start");

// search with RegExp argument
assertEquals("hello world".search(new RegExp("world")), 6, "search RegExp found");
assertEquals("hello world".search(new RegExp("xyz")), -1, "search RegExp not found");
assertEquals("hello world".search(new RegExp("o")), 4, "search RegExp first match");

// search with case-insensitive RegExp
assertEquals("Hello World".search(new RegExp("hello", "i")), 0, "search case-insensitive");

// search with undefined
assertEquals("hello".search(), 0, "search with no args");

// ============ String.prototype.match ============

// match non-global: returns array with index/input
var m1 = "hello".match(new RegExp("l+"));
assert(m1 !== null, "match non-global not null");
assertEquals(m1[0], "ll", "match non-global full match");
assertEquals(m1.index, 2, "match non-global index");
assertEquals(m1.input, "hello", "match non-global input");

// match with capture groups
var m2 = "2025-01-15".match(new RegExp("(\\d{4})-(\\d{2})-(\\d{2})"));
assert(m2 !== null, "match with groups not null");
assertEquals(m2[0], "2025-01-15", "match groups full match");
assertEquals(m2[1], "2025", "match group 1");
assertEquals(m2[2], "01", "match group 2");
assertEquals(m2[3], "15", "match group 3");
assertEquals(m2.index, 0, "match groups index");

// match global: returns array of all matches
var m3 = "abc 123 def 456".match(new RegExp("[0-9]+", "g"));
assert(m3 !== null, "match global not null");
assertEquals(m3.length, 2, "match global length");
assertEquals(m3[0], "123", "match global first");
assertEquals(m3[1], "456", "match global second");

// match no match returns null
var m4 = "hello".match(new RegExp("xyz"));
assertEquals(m4, null, "match no match returns null");

// match with string argument (treated as regex pattern)
var m5 = "hello".match("l+");
assert(m5 !== null, "match string arg not null");
assertEquals(m5[0], "ll", "match string arg result");

// match undefined
var m6 = "hello".match();
assert(m6 !== null, "match undefined not null");
assertEquals(m6[0], "", "match undefined matches empty string");

// ============ String.prototype.replace ============

// replace with string search and string replacement
assertEquals("hello".replace("l", "r"), "herlo", "replace string first only");
assertEquals("hello world".replace("world", "there"), "hello there", "replace string word");

// replace with no match
assertEquals("hello".replace("xyz", "abc"), "hello", "replace no match");

// replace with RegExp non-global
assertEquals("hello".replace(new RegExp("l"), "r"), "herlo", "replace regexp non-global");

// replace with RegExp global
assertEquals("hello".replace(new RegExp("l", "g"), "r"), "herro", "replace regexp global");

// replace with $& substitution
assertEquals("hello".replace(new RegExp("ll"), "($&)"), "he(ll)o", "replace $& substitution");

// replace with $1 backreference
assertEquals(
    "John Smith".replace(new RegExp("(\\w+) (\\w+)"), "$2, $1"),
    "Smith, John",
    "replace $1 $2 backreference"
);

// replace with $$ literal dollar
assertEquals("price".replace("price", "$$100"), "$100", "replace $$ literal dollar");

// replace with function (string search)
var result1 = "hello".replace("l", function(match, offset, str) {
    return match.toUpperCase();
});
assertEquals(result1, "heLlo", "replace function with string search");

// replace with function (RegExp search)
var result2 = "hello world".replace(new RegExp("(\\w+)", "g"), function(match) {
    return match.charAt(0).toUpperCase() + match.slice(1);
});
assertEquals(result2, "Hello World", "replace function with global regexp");

// replace with function receives correct arguments
var capturedArgs = [];
"abc".replace(new RegExp("(b)"), function(match, group1, offset, str) {
    capturedArgs.push(match);
    capturedArgs.push(group1);
    capturedArgs.push(offset);
    capturedArgs.push(str);
    return "X";
});
assertEquals(capturedArgs[0], "b", "replace function arg: match");
assertEquals(capturedArgs[1], "b", "replace function arg: group1");
assertEquals(capturedArgs[2], 1, "replace function arg: offset");
assertEquals(capturedArgs[3], "abc", "replace function arg: string");

// replace empty string match
assertEquals("hello".replace("", "X"), "Xhello", "replace empty string");

// replace with no arguments
assertEquals("hello".replace(), "hello", "replace no args");

// ============ RegExp.prototype.exec ============

// exec basic
var r1 = new RegExp("(\\d+)");
var e1 = r1.exec("abc 123 def");
assert(e1 !== null, "exec basic not null");
assertEquals(e1[0], "123", "exec full match");
assertEquals(e1[1], "123", "exec group 1");
assertEquals(e1.index, 4, "exec index");
assertEquals(e1.input, "abc 123 def", "exec input");

// exec no match
var r2 = new RegExp("xyz");
var e2 = r2.exec("hello");
assertEquals(e2, null, "exec no match");

// exec global with lastIndex
var r3 = new RegExp("\\d+", "g");
var e3 = r3.exec("12 34 56");
assertEquals(e3[0], "12", "exec global first match");
var e4 = r3.exec("12 34 56");
assertEquals(e4[0], "34", "exec global second match");
var e5 = r3.exec("12 34 56");
assertEquals(e5[0], "56", "exec global third match");
var e6 = r3.exec("12 34 56");
assertEquals(e6, null, "exec global past end");

// Summary
console.log("");
console.log("Results: " + passed + " passed, " + failed + " failed out of " + (passed + failed));
if (failed === 0) {
    console.log("All tests passed!");
} else {
    console.log("Some tests FAILED!");
}
