// Test: Generator function destructuring parameters
// Tests that destructuring patterns work in generator function parameters

function assert(condition, message) {
  if (!condition) {
    throw new Error("Assertion failed: " + message);
  }
}

// Array destructuring in generator declaration
function* genArray([x, y, z]) {
  yield x;
  yield y;
  yield z;
}

var it = genArray([10, 20, 30]);
assert(it.next().value === 10, "array destr: x should be 10");
assert(it.next().value === 20, "array destr: y should be 20");
assert(it.next().value === 30, "array destr: z should be 30");
assert(it.next().done === true, "array destr: should be done");

// Object destructuring in generator declaration
function* genObj({a, b}) {
  yield a;
  yield b;
}

var it2 = genObj({a: "hello", b: "world"});
assert(it2.next().value === "hello", "obj destr: a should be hello");
assert(it2.next().value === "world", "obj destr: b should be world");

// Generator expression with array destructuring
var genExpr = function*([first, second]) {
  yield first + second;
};

var it3 = genExpr([100, 200]);
assert(it3.next().value === 300, "gen expr destr: should be 300");

// Generator expression with object destructuring
var genExpr2 = function*({name, value}) {
  yield name + "=" + value;
};

var it4 = genExpr2({name: "x", value: "42"});
assert(it4.next().value === "x=42", "gen expr obj destr: should be x=42");

// Mixed: regular params and destructuring
function* genMixed(a, [b, c]) {
  yield a;
  yield b;
  yield c;
}

var it5 = genMixed(1, [2, 3]);
assert(it5.next().value === 1, "mixed: a should be 1");
assert(it5.next().value === 2, "mixed: b should be 2");
assert(it5.next().value === 3, "mixed: c should be 3");

// Nested destructuring
function* genNested([a, [b, c]]) {
  yield a;
  yield b;
  yield c;
}

var it6 = genNested([1, [2, 3]]);
assert(it6.next().value === 1, "nested: a should be 1");
assert(it6.next().value === 2, "nested: b should be 2");
assert(it6.next().value === 3, "nested: c should be 3");
