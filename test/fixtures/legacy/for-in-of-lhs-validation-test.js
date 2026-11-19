// Test: for-in/for-of LHS validation and suppress-in parsing
// Verifies: SyntaxError for invalid LHS, proper 'in' disambiguation in for-init,
// and correct [+In] reset in enclosed expression contexts (parens, brackets, etc.)

var assert = (function() {
  var count = 0;
  return function(cond, msg) {
    count++;
    if (!cond) throw new Error("FAIL: " + msg);
    console.log("OK " + count + ": " + msg);
  };
})();

// --- SyntaxError for invalid LHS ---

try { eval('for (1 in {}) {}'); assert(false, 'should throw'); }
catch(e) { assert(typeof e === 'string' && e.indexOf('SyntaxError') !== -1, 'literal for-in throws SyntaxError'); }

try { eval('for (1 of []) {}'); assert(false, 'should throw'); }
catch(e) { assert(typeof e === 'string' && e.indexOf('SyntaxError') !== -1, 'literal for-of throws SyntaxError'); }

try { eval('for (1+1 in {}) {}'); assert(false, 'should throw'); }
catch(e) { assert(typeof e === 'string' && e.indexOf('SyntaxError') !== -1, 'expr for-in throws SyntaxError'); }

try { eval('for (true in {}) {}'); assert(false, 'should throw'); }
catch(e) { assert(typeof e === 'string' && e.indexOf('SyntaxError') !== -1, 'bool for-in throws SyntaxError'); }

// --- Valid LHS patterns ---

var key;
var keys = [];
for (key in {a: 1, b: 2}) { keys.push(key); }
assert(keys.length === 2, 'bare identifier for-in works');

var obj = {};
for (obj.k in {x: 1, y: 2}) {}
assert(obj.k === 'y' || obj.k === 'x', 'member expression for-in assigns keys');

var arr = [];
for (arr[0] in {p: 1}) {}
assert(arr[0] === 'p', 'computed member for-in assigns key');

var vals = [];
var val;
for (val of [10, 20, 30]) { vals.push(val); }
assert(vals.join(',') === '10,20,30', 'bare identifier for-of works');

var res = {};
for (res.v of [42]) {}
assert(res.v === 42, 'member expression for-of assigns value');

// --- 'in' re-enabled inside enclosed expression contexts ---

// Parenthesized expression
var x = 0;
for (x = ('a' in {a: 1}) ? 10 : 20; false; ) {}
assert(x === 10, 'in works inside parens in for-init');

// Array literal
var a1;
for (a1 = ['a' in {a:1}]; false; ) {}
assert(a1[0] === true, 'in works inside array literal in for-init');

// Object literal
var o1;
for (o1 = {v: 'x' in {x:1}}; false; ) {}
assert(o1.v === true, 'in works inside object literal in for-init');

// Function call arguments
function id(x) { return x; }
var r;
for (r = id('a' in {a:1}); false; ) {}
assert(r === true, 'in works inside function call args in for-init');

// Arrow function expression body
var f;
for (f = (x) => x in {a:1}; false; ) {}
assert(f('a') === true, 'in works inside arrow body in for-init');

// Ternary consequent (always [+In] per spec)
var t;
for (t = true ? 'a' in {a:1} : false; false; ) {}
assert(t === true, 'in works in ternary consequent in for-init');

// --- var/let/const declarations still work ---

var result1 = [];
for (var k1 in {a: 1, b: 2}) { result1.push(k1); }
assert(result1.length === 2, 'for-in with var declaration works');

var result2 = [];
for (let k2 of [1, 2, 3]) { result2.push(k2); }
assert(result2.join(',') === '1,2,3', 'for-of with let declaration works');

// --- Regular for loop unaffected ---

var sum = 0;
for (var i = 0; i < 5; i++) { sum += i; }
assert(sum === 10, 'regular for loop still works');

console.log("\nAll for-in/of LHS validation tests passed!");
