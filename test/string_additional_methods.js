// Tests for newly added String methods:
// codePointAt, fromCodePoint, toLocaleLowerCase, toLocaleUpperCase, localeCompare, substr

console.log("=== Testing String.prototype.codePointAt ===");

if ("abc".codePointAt(0) === 97) {
    console.log("PASS: codePointAt(0) returns 97 for 'a'");
} else {
    console.log("FAIL: codePointAt(0) expected 97, got", "abc".codePointAt(0));
}

if ("abc".codePointAt(2) === 99) {
    console.log("PASS: codePointAt(2) returns 99 for 'c'");
} else {
    console.log("FAIL: codePointAt(2) expected 99, got", "abc".codePointAt(2));
}

if ("abc".codePointAt(3) === undefined) {
    console.log("PASS: codePointAt out of bounds returns undefined");
} else {
    console.log("FAIL: codePointAt(3) expected undefined, got", "abc".codePointAt(3));
}

if ("abc".codePointAt(-1) === undefined) {
    console.log("PASS: codePointAt negative returns undefined");
} else {
    console.log("FAIL: codePointAt(-1) expected undefined, got", "abc".codePointAt(-1));
}

console.log("=== Testing String.fromCodePoint ===");

if (String.fromCodePoint(65) === "A") {
    console.log("PASS: fromCodePoint(65) returns 'A'");
} else {
    console.log("FAIL: fromCodePoint(65) expected 'A', got", String.fromCodePoint(65));
}

if (String.fromCodePoint(65, 66, 67) === "ABC") {
    console.log("PASS: fromCodePoint(65,66,67) returns 'ABC'");
} else {
    console.log("FAIL: fromCodePoint multiple args expected 'ABC', got", String.fromCodePoint(65, 66, 67));
}

var threw = false;
try { String.fromCodePoint(-1); } catch (e) { threw = true; }
if (threw) {
    console.log("PASS: fromCodePoint(-1) throws");
} else {
    console.log("FAIL: fromCodePoint(-1) should throw");
}

threw = false;
try { String.fromCodePoint(3.14); } catch (e) { threw = true; }
if (threw) {
    console.log("PASS: fromCodePoint(3.14) throws");
} else {
    console.log("FAIL: fromCodePoint(3.14) should throw");
}

threw = false;
try { String.fromCodePoint(Infinity); } catch (e) { threw = true; }
if (threw) {
    console.log("PASS: fromCodePoint(Infinity) throws");
} else {
    console.log("FAIL: fromCodePoint(Infinity) should throw");
}

console.log("=== Testing String.prototype.toLocaleLowerCase ===");

if ("HELLO".toLocaleLowerCase() === "hello") {
    console.log("PASS: toLocaleLowerCase basic");
} else {
    console.log("FAIL: toLocaleLowerCase expected 'hello', got", "HELLO".toLocaleLowerCase());
}

if ("Hello World".toLocaleLowerCase() === "hello world") {
    console.log("PASS: toLocaleLowerCase mixed case");
} else {
    console.log("FAIL: toLocaleLowerCase mixed case");
}

if ("".toLocaleLowerCase() === "") {
    console.log("PASS: toLocaleLowerCase empty string");
} else {
    console.log("FAIL: toLocaleLowerCase empty string");
}

console.log("=== Testing String.prototype.toLocaleUpperCase ===");

if ("hello".toLocaleUpperCase() === "HELLO") {
    console.log("PASS: toLocaleUpperCase basic");
} else {
    console.log("FAIL: toLocaleUpperCase expected 'HELLO', got", "hello".toLocaleUpperCase());
}

if ("Hello World".toLocaleUpperCase() === "HELLO WORLD") {
    console.log("PASS: toLocaleUpperCase mixed case");
} else {
    console.log("FAIL: toLocaleUpperCase mixed case");
}

console.log("=== Testing String.prototype.localeCompare ===");

if ("abc".localeCompare("abc") === 0) {
    console.log("PASS: localeCompare equal strings");
} else {
    console.log("FAIL: localeCompare equal strings expected 0, got", "abc".localeCompare("abc"));
}

if ("abc".localeCompare("def") < 0) {
    console.log("PASS: localeCompare less than");
} else {
    console.log("FAIL: localeCompare less than");
}

if ("def".localeCompare("abc") > 0) {
    console.log("PASS: localeCompare greater than");
} else {
    console.log("FAIL: localeCompare greater than");
}

console.log("=== Testing String.prototype.substr ===");

if ("hello".substr(1, 3) === "ell") {
    console.log("PASS: substr(1, 3) returns 'ell'");
} else {
    console.log("FAIL: substr(1, 3) expected 'ell', got", "hello".substr(1, 3));
}

if ("hello".substr(0) === "hello") {
    console.log("PASS: substr(0) returns full string");
} else {
    console.log("FAIL: substr(0) expected 'hello', got", "hello".substr(0));
}

if ("hello".substr(-3) === "llo") {
    console.log("PASS: substr(-3) returns 'llo'");
} else {
    console.log("FAIL: substr(-3) expected 'llo', got", "hello".substr(-3));
}

if ("hello".substr(0, 0) === "") {
    console.log("PASS: substr(0, 0) returns empty string");
} else {
    console.log("FAIL: substr(0, 0) expected '', got", "hello".substr(0, 0));
}

if ("hello".substr(10) === "") {
    console.log("PASS: substr(10) past end returns empty string");
} else {
    console.log("FAIL: substr(10) expected '', got '" + "hello".substr(10) + "'");
}

if ("hello".substr(-10) === "hello") {
    console.log("PASS: substr(-10) clamped to 0");
} else {
    console.log("FAIL: substr(-10) expected 'hello', got", "hello".substr(-10));
}

if ("hello".substr(-3, 2) === "ll") {
    console.log("PASS: substr(-3, 2) returns 'll'");
} else {
    console.log("FAIL: substr(-3, 2) expected 'll', got", "hello".substr(-3, 2));
}

if ("hello".substr(1) === "ello") {
    console.log("PASS: substr(1) returns 'ello'");
} else {
    console.log("FAIL: substr(1) expected 'ello', got", "hello".substr(1));
}

console.log("=== Testing method existence and lengths ===");

if (typeof String.prototype.codePointAt === "function") {
    console.log("PASS: codePointAt is a function");
} else {
    console.log("FAIL: codePointAt should be a function");
}

if (typeof String.fromCodePoint === "function") {
    console.log("PASS: fromCodePoint is a function");
} else {
    console.log("FAIL: fromCodePoint should be a function");
}

if (typeof String.prototype.toLocaleLowerCase === "function") {
    console.log("PASS: toLocaleLowerCase is a function");
} else {
    console.log("FAIL: toLocaleLowerCase should be a function");
}

if (typeof String.prototype.toLocaleUpperCase === "function") {
    console.log("PASS: toLocaleUpperCase is a function");
} else {
    console.log("FAIL: toLocaleUpperCase should be a function");
}

if (typeof String.prototype.localeCompare === "function") {
    console.log("PASS: localeCompare is a function");
} else {
    console.log("FAIL: localeCompare should be a function");
}

if (typeof String.prototype.substr === "function") {
    console.log("PASS: substr is a function");
} else {
    console.log("FAIL: substr should be a function");
}

if (String.prototype.codePointAt.length === 1) {
    console.log("PASS: codePointAt.length === 1");
} else {
    console.log("FAIL: codePointAt.length expected 1, got", String.prototype.codePointAt.length);
}

if (String.fromCodePoint.length === 1) {
    console.log("PASS: fromCodePoint.length === 1");
} else {
    console.log("FAIL: fromCodePoint.length expected 1, got", String.fromCodePoint.length);
}

if (String.prototype.localeCompare.length === 1) {
    console.log("PASS: localeCompare.length === 1");
} else {
    console.log("FAIL: localeCompare.length expected 1, got", String.prototype.localeCompare.length);
}

if (String.prototype.substr.length === 2) {
    console.log("PASS: substr.length === 2");
} else {
    console.log("FAIL: substr.length expected 2, got", String.prototype.substr.length);
}
