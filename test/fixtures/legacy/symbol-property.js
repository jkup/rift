// Test: Symbols as property keys

// Test 1: Symbol can be used as object property key
var sym = Symbol('myKey');
var obj = {};
obj[sym] = 'secret value';
console.log(obj[sym] === 'secret value');  // true

// Test 2: Symbol properties are not in Object.keys
var obj2 = {};
obj2.normal = 'visible';
obj2[Symbol('hidden')] = 'invisible';
console.log(Object.keys(obj2).length === 1);  // true - only 'normal'
console.log(Object.keys(obj2)[0] === 'normal');  // true

// Test 3: Different symbols create different properties
var s1 = Symbol('key');
var s2 = Symbol('key');  // Same description, different symbol
var obj3 = {};
obj3[s1] = 'value1';
obj3[s2] = 'value2';
console.log(obj3[s1] === 'value1');  // true
console.log(obj3[s2] === 'value2');  // true
console.log(obj3[s1] !== obj3[s2]);  // true - different properties

// Test 4: Symbol properties can be updated
var key = Symbol('updateable');
var obj4 = {};
obj4[key] = 'initial';
obj4[key] = 'updated';
console.log(obj4[key] === 'updated');  // true

// Test 5: Symbol properties coexist with string properties
var obj5 = {};
obj5['name'] = 'string key';
obj5[Symbol('name')] = 'symbol key';
console.log(obj5['name'] === 'string key');  // true
console.log(obj5.name === 'string key');  // true
