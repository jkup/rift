// Test: Well-known symbols

// Test 1: Symbol.iterator exists and is a symbol
console.log(typeof Symbol.iterator === 'symbol');  // true

// Test 2: Symbol.toStringTag exists and is a symbol
console.log(typeof Symbol.toStringTag === 'symbol');  // true

// Test 3: Symbol.hasInstance exists and is a symbol
console.log(typeof Symbol.hasInstance === 'symbol');  // true

// Test 4: Symbol.toPrimitive exists and is a symbol
console.log(typeof Symbol.toPrimitive === 'symbol');  // true

// Test 5: Symbol.unscopables exists and is a symbol
console.log(typeof Symbol.unscopables === 'symbol');  // true

// Test 6: Symbol.isConcatSpreadable exists and is a symbol
console.log(typeof Symbol.isConcatSpreadable === 'symbol');  // true

// Test 7: Well-known symbols are always the same
console.log(Symbol.iterator === Symbol.iterator);  // true
console.log(Symbol.toStringTag === Symbol.toStringTag);  // true

// Test 8: Well-known symbols have proper descriptions
console.log(Symbol.iterator.toString() === 'Symbol(Symbol.iterator)');  // true
console.log(Symbol.toStringTag.toString() === 'Symbol(Symbol.toStringTag)');  // true
