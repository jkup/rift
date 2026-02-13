// Test Object.defineProperties

// Basic: define multiple data properties at once
var obj = {};
Object.defineProperties(obj, {
  x: { value: 1, writable: true, enumerable: true, configurable: true },
  y: { value: 2, writable: true, enumerable: true, configurable: true }
});
console.log(obj.x === 1); // true
console.log(obj.y === 2); // true

// Returns the modified object
var obj2 = {};
var result = Object.defineProperties(obj2, {
  a: { value: 10 }
});
console.log(result === obj2); // true

// Non-enumerable properties
var obj3 = {};
Object.defineProperties(obj3, {
  hidden: { value: 42, enumerable: false },
  visible: { value: 99, enumerable: true }
});
console.log(obj3.hidden === 42); // true
console.log(obj3.visible === 99); // true
var keys = Object.keys(obj3);
console.log(keys.length === 1); // true
console.log(keys[0] === "visible"); // true

// Non-writable properties
var obj4 = {};
Object.defineProperties(obj4, {
  readonly: { value: "constant", writable: false }
});
console.log(obj4.readonly === "constant"); // true

// Non-configurable properties
var obj5 = {};
Object.defineProperties(obj5, {
  locked: { value: 5, configurable: false }
});
console.log(obj5.locked === 5); // true

// Accessor properties (get/set)
var obj6 = {};
var backing = 0;
Object.defineProperties(obj6, {
  prop: {
    get: function() { return backing; },
    set: function(v) { backing = v; },
    enumerable: true,
    configurable: true
  }
});
console.log(obj6.prop === 0); // true
obj6.prop = 42;
console.log(obj6.prop === 42); // true
console.log(backing === 42); // true

// Mixed data and accessor properties
var obj7 = {};
var store = "hello";
Object.defineProperties(obj7, {
  data: { value: 100, writable: true, enumerable: true },
  accessor: {
    get: function() { return store; },
    set: function(v) { store = v; },
    enumerable: true,
    configurable: true
  }
});
console.log(obj7.data === 100); // true
console.log(obj7.accessor === "hello"); // true
obj7.accessor = "world";
console.log(obj7.accessor === "world"); // true

// Error: non-object first argument
var threw = false;
try {
  Object.defineProperties(42, { x: { value: 1 } });
} catch (e) {
  threw = true;
}
console.log(threw); // true

// Error: non-object second argument
var threw2 = false;
try {
  Object.defineProperties({}, 42);
} catch (e) {
  threw2 = true;
}
console.log(threw2); // true

// Empty properties object
var obj8 = { existing: 1 };
Object.defineProperties(obj8, {});
console.log(obj8.existing === 1); // true
