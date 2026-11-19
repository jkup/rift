// Test: Basic Symbol creation and behavior

// Test 1: Symbol creation and uniqueness
var s1 = Symbol();
var s2 = Symbol();
console.log(s1 !== s2);  // true - every symbol is unique

// Test 2: Symbol with description
var s3 = Symbol('mySymbol');
console.log(s3.toString() === 'Symbol(mySymbol)');  // true

// Test 3: typeof returns 'symbol'
console.log(typeof Symbol() === 'symbol');  // true
console.log(typeof s3 === 'symbol');  // true

// Test 4: new Symbol() should throw TypeError
var threw = false;
try {
    new Symbol();
} catch (e) {
    threw = true;
}
console.log(threw);  // true

// Test 5: Symbols are truthy
console.log(!!Symbol());  // true
console.log(Boolean(Symbol()));  // true

// Test 6: Symbols with same description are still different
var a = Symbol('test');
var b = Symbol('test');
console.log(a !== b);  // true

// Test 7: Symbol strict equality
var sym = Symbol('x');
console.log(sym === sym);  // true - same symbol equals itself

// Test 8: Empty description
var empty = Symbol();
console.log(empty.toString() === 'Symbol()');  // true
