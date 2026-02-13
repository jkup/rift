// Test new Math methods

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

function approxEqual(a, b, epsilon) {
    if (epsilon === undefined) epsilon = 1e-10;
    if (isNaN(a) && isNaN(b)) return true;
    if (a === b) return true;
    return Math.abs(a - b) < epsilon;
}

// --- acos ---
assert(approxEqual(Math.acos(1), 0), "Math.acos(1) === 0");
assert(approxEqual(Math.acos(0), Math.PI / 2), "Math.acos(0) === PI/2");
assert(approxEqual(Math.acos(-1), Math.PI), "Math.acos(-1) === PI");
assert(isNaN(Math.acos(2)), "Math.acos(2) is NaN");
assert(isNaN(Math.acos()), "Math.acos() is NaN");

// --- asin ---
assert(approxEqual(Math.asin(0), 0), "Math.asin(0) === 0");
assert(approxEqual(Math.asin(1), Math.PI / 2), "Math.asin(1) === PI/2");
assert(isNaN(Math.asin(2)), "Math.asin(2) is NaN");

// --- atan ---
assert(approxEqual(Math.atan(0), 0), "Math.atan(0) === 0");
assert(approxEqual(Math.atan(1), Math.PI / 4), "Math.atan(1) === PI/4");
assert(isNaN(Math.atan()), "Math.atan() is NaN");

// --- atan2 ---
assert(approxEqual(Math.atan2(0, 0), 0), "Math.atan2(0, 0) === 0");
assert(approxEqual(Math.atan2(1, 1), Math.PI / 4), "Math.atan2(1, 1) === PI/4");
assert(approxEqual(Math.atan2(1, 0), Math.PI / 2), "Math.atan2(1, 0) === PI/2");

// --- cosh ---
assert(approxEqual(Math.cosh(0), 1), "Math.cosh(0) === 1");
assert(isNaN(Math.cosh()), "Math.cosh() is NaN");

// --- sinh ---
assert(approxEqual(Math.sinh(0), 0), "Math.sinh(0) === 0");
assert(isNaN(Math.sinh()), "Math.sinh() is NaN");

// --- tanh ---
assert(approxEqual(Math.tanh(0), 0), "Math.tanh(0) === 0");
assert(approxEqual(Math.tanh(Infinity), 1), "Math.tanh(Infinity) === 1");
assert(approxEqual(Math.tanh(-Infinity), -1), "Math.tanh(-Infinity) === -1");

// --- acosh ---
assert(approxEqual(Math.acosh(1), 0), "Math.acosh(1) === 0");
assert(isNaN(Math.acosh(0.5)), "Math.acosh(0.5) is NaN");

// --- asinh ---
assert(approxEqual(Math.asinh(0), 0), "Math.asinh(0) === 0");

// --- atanh ---
assert(approxEqual(Math.atanh(0), 0), "Math.atanh(0) === 0");
assert(Math.atanh(1) === Infinity, "Math.atanh(1) === Infinity");
assert(Math.atanh(-1) === -Infinity, "Math.atanh(-1) === -Infinity");
assert(isNaN(Math.atanh(2)), "Math.atanh(2) is NaN");

// --- exp ---
assert(approxEqual(Math.exp(0), 1), "Math.exp(0) === 1");
assert(approxEqual(Math.exp(1), Math.E), "Math.exp(1) === E");
assert(isNaN(Math.exp()), "Math.exp() is NaN");

// --- expm1 ---
assert(approxEqual(Math.expm1(0), 0), "Math.expm1(0) === 0");
assert(approxEqual(Math.expm1(1), Math.E - 1), "Math.expm1(1) === E - 1");

// --- log ---
assert(approxEqual(Math.log(1), 0), "Math.log(1) === 0");
assert(approxEqual(Math.log(Math.E), 1), "Math.log(E) === 1");
assert(Math.log(0) === -Infinity, "Math.log(0) === -Infinity");
assert(isNaN(Math.log(-1)), "Math.log(-1) is NaN");

// --- log1p ---
assert(approxEqual(Math.log1p(0), 0), "Math.log1p(0) === 0");
assert(approxEqual(Math.log1p(Math.E - 1), 1), "Math.log1p(E-1) === 1");
assert(Math.log1p(-1) === -Infinity, "Math.log1p(-1) === -Infinity");

// --- log2 ---
assert(approxEqual(Math.log2(1), 0), "Math.log2(1) === 0");
assert(approxEqual(Math.log2(2), 1), "Math.log2(2) === 1");
assert(approxEqual(Math.log2(8), 3), "Math.log2(8) === 3");

// --- log10 ---
assert(approxEqual(Math.log10(1), 0), "Math.log10(1) === 0");
assert(approxEqual(Math.log10(10), 1), "Math.log10(10) === 1");
assert(approxEqual(Math.log10(1000), 3), "Math.log10(1000) === 3");

// --- cbrt ---
assert(approxEqual(Math.cbrt(27), 3), "Math.cbrt(27) === 3");
assert(approxEqual(Math.cbrt(-8), -2), "Math.cbrt(-8) === -2");
assert(approxEqual(Math.cbrt(0), 0), "Math.cbrt(0) === 0");
assert(approxEqual(Math.cbrt(1), 1), "Math.cbrt(1) === 1");

// --- clz32 ---
assert(Math.clz32(1) === 31, "Math.clz32(1) === 31");
assert(Math.clz32(0) === 32, "Math.clz32(0) === 32");
assert(Math.clz32(1000) === 22, "Math.clz32(1000) === 22");
assert(Math.clz32(-1) === 0, "Math.clz32(-1) === 0");

// --- fround ---
assert(Math.fround(0) === 0, "Math.fround(0) === 0");
assert(Math.fround(1) === 1, "Math.fround(1) === 1");
assert(Math.fround(1.5) === 1.5, "Math.fround(1.5) === 1.5");
assert(isNaN(Math.fround()), "Math.fround() is NaN");

// --- hypot ---
assert(Math.hypot() === 0, "Math.hypot() === 0");
assert(Math.hypot(3, 4) === 5, "Math.hypot(3, 4) === 5");
assert(Math.hypot(5) === 5, "Math.hypot(5) === 5");
assert(Math.hypot(-5) === 5, "Math.hypot(-5) === 5");
assert(Math.hypot(3, 4, 0) === 5, "Math.hypot(3, 4, 0) === 5");
assert(Math.hypot(Infinity, 1) === Infinity, "Math.hypot(Infinity, 1) === Infinity");
assert(isNaN(Math.hypot(NaN, 1)), "Math.hypot(NaN, 1) is NaN");

// --- imul ---
assert(Math.imul(2, 4) === 8, "Math.imul(2, 4) === 8");
assert(Math.imul(-1, 8) === -8, "Math.imul(-1, 8) === -8");
assert(Math.imul(0, 5) === 0, "Math.imul(0, 5) === 0");
assert(Math.imul(0xffffffff, 5) === -5, "Math.imul(0xffffffff, 5) === -5");

console.log("Math methods test: " + passed + " passed, " + failed + " failed");

if (failed > 0) {
    throw new Error(failed + " tests failed");
}
