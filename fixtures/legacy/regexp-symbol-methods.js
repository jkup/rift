// Tests for RegExp.prototype Symbol methods (@@match, @@replace, @@search, @@split)
// and String methods dispatching through them.

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

// ============================================================
// Symbol well-known properties exist
// ============================================================
assert(typeof Symbol.match === "symbol", "Symbol.match is a symbol");
assert(typeof Symbol.replace === "symbol", "Symbol.replace is a symbol");
assert(typeof Symbol.search === "symbol", "Symbol.search is a symbol");
assert(typeof Symbol.split === "symbol", "Symbol.split is a symbol");

// ============================================================
// RegExp.prototype[@@match]
// ============================================================

// Non-global match returns array with groups
var m = "hello world".match(/o/);
assertEquals(m[0], "o", "match non-global: m[0]");
assertEquals(m.index, 4, "match non-global: index");
assertEquals(m.input, "hello world", "match non-global: input");

// Global match returns array of all matches
var gm = "hello world".match(/o/g);
assertEquals(gm.length, 2, "match global: length");
assertEquals(gm[0], "o", "match global: gm[0]");
assertEquals(gm[1], "o", "match global: gm[1]");

// Match with capture groups
var cm = "2024-01-15".match(/(\d{4})-(\d{2})-(\d{2})/);
assertEquals(cm[0], "2024-01-15", "match groups: full match");
assertEquals(cm[1], "2024", "match groups: year");
assertEquals(cm[2], "01", "match groups: month");
assertEquals(cm[3], "15", "match groups: day");

// No match returns null
assertEquals("hello".match(/xyz/), null, "match no match returns null");
assertEquals("hello".match(/xyz/g), null, "match global no match returns null");

// ============================================================
// RegExp.prototype[@@search]
// ============================================================

assertEquals("hello".search(/l/), 2, "search finds first l");
assertEquals("hello".search(/o/), 4, "search finds o");
assertEquals("hello".search(/x/), -1, "search returns -1 for no match");
assertEquals("hello world".search(/world/), 6, "search finds word");

// ============================================================
// RegExp.prototype[@@replace]
// ============================================================

// String replacement
assertEquals("hello".replace(/l/, "r"), "herlo", "replace first l");
assertEquals("hello".replace(/l/g, "r"), "herro", "replace all l");

// $& replacement
assertEquals("hello".replace(/ll/, "($&)"), "he(ll)o", "replace with $&");

// Function replacement
assertEquals(
    "hello".replace(/l/g, function(m) { return m.toUpperCase(); }),
    "heLLo",
    "replace with function"
);

// Function replacement with groups
assertEquals(
    "2024-01-15".replace(/(\d{4})-(\d{2})-(\d{2})/, function(m, y, mo, d) {
        return d + "/" + mo + "/" + y;
    }),
    "15/01/2024",
    "replace function with groups"
);

// No match returns original
assertEquals("hello".replace(/xyz/, "replaced"), "hello", "replace no match");

// ============================================================
// RegExp.prototype[@@split]
// ============================================================

// Basic split
var s1 = "a1b2c3d".split(/[0-9]/);
assertEquals(s1.length, 4, "split by digits: length");
assertEquals(s1[0], "a", "split by digits: [0]");
assertEquals(s1[1], "b", "split by digits: [1]");
assertEquals(s1[2], "c", "split by digits: [2]");
assertEquals(s1[3], "d", "split by digits: [3]");

// Split with capture groups included
var s2 = "a1b2c".split(/([0-9])/);
assertEquals(s2.length, 5, "split with capture: length");
assertEquals(s2[0], "a", "split with capture: [0]");
assertEquals(s2[1], "1", "split with capture: [1]");
assertEquals(s2[2], "b", "split with capture: [2]");
assertEquals(s2[3], "2", "split with capture: [3]");
assertEquals(s2[4], "c", "split with capture: [4]");

// Split with limit
var s3 = "a1b2c3d".split(/[0-9]/, 2);
assertEquals(s3.length, 2, "split with limit: length");
assertEquals(s3[0], "a", "split with limit: [0]");
assertEquals(s3[1], "b", "split with limit: [1]");

// ============================================================
// Custom Symbol.match dispatch
// ============================================================
var customMatcher = {};
customMatcher[Symbol.match] = function(str) {
    return "matched: " + str;
};
assertEquals("test".match(customMatcher), "matched: test", "custom Symbol.match dispatch");

// ============================================================
// Custom Symbol.search dispatch
// ============================================================
var customSearcher = {};
customSearcher[Symbol.search] = function(str) {
    return 42;
};
assertEquals("test".search(customSearcher), 42, "custom Symbol.search dispatch");

// ============================================================
// Custom Symbol.replace dispatch
// ============================================================
var customReplacer = {};
customReplacer[Symbol.replace] = function(str, replaceValue) {
    return str + "+" + replaceValue;
};
assertEquals("test".replace(customReplacer, "foo"), "test+foo", "custom Symbol.replace dispatch");

// ============================================================
// Custom Symbol.split dispatch
// ============================================================
var customSplitter = {};
customSplitter[Symbol.split] = function(str, limit) {
    return ["a", "b", "c"];
};
var cs = "test".split(customSplitter);
assertEquals(cs.length, 3, "custom Symbol.split dispatch: length");
assertEquals(cs[0], "a", "custom Symbol.split dispatch: [0]");

// ============================================================
// Summary
// ============================================================
console.log(passed + "/" + (passed + failed) + " assertions passed");
if (failed > 0) {
    console.log(failed + " FAILED");
} else {
    console.log("All tests passed!");
}
