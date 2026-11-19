// Test: Symbol.for() and Symbol.keyFor() global registry
// Note: Using bracket notation for 'for' because it's a reserved keyword

// Test 1: Symbol.for creates global symbol
var s1 = Symbol['for']('shared');
var s2 = Symbol['for']('shared');
console.log(s1 === s2);  // true - same key returns same symbol

// Test 2: Different keys return different symbols
var s3 = Symbol['for']('other');
console.log(s1 !== s3);  // true

// Test 3: Symbol.keyFor returns key for global symbols
console.log(Symbol.keyFor(s1) === 'shared');  // true
console.log(Symbol.keyFor(s3) === 'other');  // true

// Test 4: Symbol.keyFor returns undefined for local symbols
var local = Symbol('local');
console.log(Symbol.keyFor(local) === undefined);  // true

// Test 5: Symbol.for uses description as both key and description
var registered = Symbol['for']('myKey');
console.log(registered.toString() === 'Symbol(myKey)');  // true

// Test 6: Symbol.for with undefined key
var undefinedKey = Symbol['for']();
var undefinedKey2 = Symbol['for'](undefined);
console.log(undefinedKey === undefinedKey2);  // true - both use 'undefined' as key
