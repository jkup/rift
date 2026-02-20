// Test change-array-by-copy methods (ES2023)
// Array.prototype.toReversed, toSorted, toSpliced, with

console.log("=== Testing Change-Array-by-Copy Methods ===");

// --- toReversed ---
var arr = [1, 2, 3, 4, 5];
var rev = arr.toReversed();

if (rev.join(',') === '5,4,3,2,1') {
    console.log("PASS: toReversed returns reversed copy");
} else {
    console.log("FAIL: toReversed expected 5,4,3,2,1 got", rev.join(','));
}

if (arr.join(',') === '1,2,3,4,5') {
    console.log("PASS: toReversed does not mutate original");
} else {
    console.log("FAIL: toReversed mutated original to", arr.join(','));
}

if ([].toReversed().length === 0) {
    console.log("PASS: toReversed on empty array");
} else {
    console.log("FAIL: toReversed on empty array");
}

// --- toSorted ---
var sorted = [3, 1, 4, 1, 5].toSorted();
if (sorted.join(',') === '1,1,3,4,5') {
    console.log("PASS: toSorted default sort");
} else {
    console.log("FAIL: toSorted expected 1,1,3,4,5 got", sorted.join(','));
}

var custom = [3, 1, 4].toSorted(function(a, b) { return b - a; });
if (custom.join(',') === '4,3,1') {
    console.log("PASS: toSorted with custom comparefn");
} else {
    console.log("FAIL: toSorted custom expected 4,3,1 got", custom.join(','));
}

var orig = [3, 1, 2];
orig.toSorted();
if (orig.join(',') === '3,1,2') {
    console.log("PASS: toSorted does not mutate original");
} else {
    console.log("FAIL: toSorted mutated original to", orig.join(','));
}

// toSorted TypeError for non-callable comparefn
try {
    [1, 2].toSorted(42);
    console.log("FAIL: toSorted should throw TypeError for non-callable");
} catch (e) {
    console.log("PASS: toSorted throws TypeError for non-callable comparefn");
}

// --- toSpliced ---
var base = [1, 2, 3, 4, 5];
var s1 = base.toSpliced(1, 2);
if (s1.join(',') === '1,4,5') {
    console.log("PASS: toSpliced delete only");
} else {
    console.log("FAIL: toSpliced expected 1,4,5 got", s1.join(','));
}

var s2 = base.toSpliced(1, 2, 10, 20, 30);
if (s2.join(',') === '1,10,20,30,4,5') {
    console.log("PASS: toSpliced delete and insert");
} else {
    console.log("FAIL: toSpliced expected 1,10,20,30,4,5 got", s2.join(','));
}

if (base.join(',') === '1,2,3,4,5') {
    console.log("PASS: toSpliced does not mutate original");
} else {
    console.log("FAIL: toSpliced mutated original to", base.join(','));
}

var s3 = base.toSpliced(0, 0, 99);
if (s3.join(',') === '99,1,2,3,4,5') {
    console.log("PASS: toSpliced insert at beginning");
} else {
    console.log("FAIL: toSpliced expected 99,1,2,3,4,5 got", s3.join(','));
}

// negative start
var s4 = [1, 2, 3, 4].toSpliced(-2, 1);
if (s4.join(',') === '1,2,4') {
    console.log("PASS: toSpliced with negative start");
} else {
    console.log("FAIL: toSpliced negative start expected 1,2,4 got", s4.join(','));
}

// --- with ---
var w1 = [1, 2, 3].with(1, 99);
if (w1.join(',') === '1,99,3') {
    console.log("PASS: with replaces at index");
} else {
    console.log("FAIL: with expected 1,99,3 got", w1.join(','));
}

var w2 = [1, 2, 3].with(-1, 99);
if (w2.join(',') === '1,2,99') {
    console.log("PASS: with negative index");
} else {
    console.log("FAIL: with negative expected 1,2,99 got", w2.join(','));
}

// with does not mutate
var wOrig = [1, 2, 3];
wOrig.with(0, 99);
if (wOrig.join(',') === '1,2,3') {
    console.log("PASS: with does not mutate original");
} else {
    console.log("FAIL: with mutated original to", wOrig.join(','));
}

// with RangeError
try {
    [1, 2, 3].with(5, 99);
    console.log("FAIL: with should throw RangeError");
} catch (e) {
    console.log("PASS: with throws RangeError for out-of-bounds");
}

try {
    [1, 2, 3].with(-4, 99);
    console.log("FAIL: with should throw RangeError for negative out-of-bounds");
} catch (e) {
    console.log("PASS: with throws RangeError for negative out-of-bounds");
}

console.log("=== Change-Array-by-Copy tests complete ===");
