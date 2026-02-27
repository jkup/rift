// Tests for sparse arrays (elisions) — [,1], [1,,3], [,,,], etc.

// Leading elision
var a = [,1,2];
if (a.length === 3) {
    console.log("PASS: leading elision length is 3");
} else {
    console.log("FAIL: leading elision length expected 3, got", a.length);
}
if (a[0] === undefined && !(0 in a)) {
    console.log("PASS: leading elision creates hole at index 0");
} else {
    console.log("FAIL: leading elision hole at index 0 not correct");
}
if (a[1] === 1 && a[2] === 2) {
    console.log("PASS: leading elision values correct");
} else {
    console.log("FAIL: leading elision values wrong");
}

// Middle elision
var b = [1,,3];
if (b.length === 3) {
    console.log("PASS: middle elision length is 3");
} else {
    console.log("FAIL: middle elision length expected 3, got", b.length);
}
if (b[1] === undefined && !(1 in b)) {
    console.log("PASS: middle elision creates hole at index 1");
} else {
    console.log("FAIL: middle elision hole at index 1 not correct");
}

// Trailing comma is NOT an elision
var c = [1,2,];
if (c.length === 2) {
    console.log("PASS: trailing comma length is 2 (not an elision)");
} else {
    console.log("FAIL: trailing comma length expected 2, got", c.length);
}

// Trailing elision (extra comma after trailing comma)
var d = [1,2,,];
if (d.length === 3 && !(2 in d)) {
    console.log("PASS: trailing elision creates hole at end");
} else {
    console.log("FAIL: trailing elision expected length 3 with hole at 2, got length", d.length);
}

// Multiple consecutive elisions
var e = [,,,];
if (e.length === 3) {
    console.log("PASS: pure elisions [,,,] has length 3");
} else {
    console.log("FAIL: pure elisions expected length 3, got", e.length);
}
if (!(0 in e) && !(1 in e) && !(2 in e)) {
    console.log("PASS: pure elisions has no own properties");
} else {
    console.log("FAIL: pure elisions should have no own properties");
}

// Mixed values and multiple holes
var f = [1,,,4];
if (f.length === 4 && f[0] === 1 && f[3] === 4 && !(1 in f) && !(2 in f)) {
    console.log("PASS: mixed elisions [1,,,4] correct");
} else {
    console.log("FAIL: mixed elisions [1,,,4] wrong");
}

// Spread combined with elision
var g = [1, ...[2,3], ,5];
if (g.length === 5 && g[0] === 1 && g[1] === 2 && g[2] === 3 && g[4] === 5 && !(3 in g)) {
    console.log("PASS: spread with elision correct");
} else {
    console.log("FAIL: spread with elision wrong, length:", g.length, "values:", g[0], g[1], g[2], g[3], g[4]);
}
