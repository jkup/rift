// Test getter/setter support in object literals

// Test 1: Basic getter
var obj1 = { get x() { return 42; } };
if (obj1.x === 42) { console.log("PASS - basic getter"); }
else { console.log("FAIL - basic getter, got: " + obj1.x); }

// Test 2: Basic setter
var obj2 = { _val: 0, set x(v) { this._val = v; } };
obj2.x = 10;
if (obj2._val === 10) { console.log("PASS - basic setter"); }
else { console.log("FAIL - basic setter, got: " + obj2._val); }

// Test 3: Getter + setter pair
var obj3 = {
    _v: 0,
    get v() { return this._v; },
    set v(x) { this._v = x * 2; }
};
obj3.v = 5;
if (obj3.v === 10) { console.log("PASS - getter/setter pair"); }
else { console.log("FAIL - getter/setter pair, got: " + obj3.v); }

// Test 4: this inside getter
var obj4 = {
    name: "rift",
    get greeting() { return "hello " + this.name; }
};
if (obj4.greeting === "hello rift") { console.log("PASS - this in getter"); }
else { console.log("FAIL - this in getter, got: " + obj4.greeting); }

// Test 5: 'get' as a regular property name (not a getter)
var obj5 = { get: 1 };
if (obj5.get === 1) { console.log("PASS - get as property name"); }
else { console.log("FAIL - get as property name, got: " + obj5.get); }

// Test 6: 'set' as a regular property name (not a setter)
var obj6 = { set: 2 };
if (obj6.set === 2) { console.log("PASS - set as property name"); }
else { console.log("FAIL - set as property name, got: " + obj6.set); }

// Test 7: 'get' as method shorthand name
var obj7 = { get() { return "method"; } };
if (obj7.get() === "method") { console.log("PASS - get as method shorthand"); }
else { console.log("FAIL - get as method shorthand"); }

// Test 8: 'set' as method shorthand name
var obj8 = { set() { return "method"; } };
if (obj8.set() === "method") { console.log("PASS - set as method shorthand"); }
else { console.log("FAIL - set as method shorthand"); }

// Test 9: String key getter
var obj9 = { get "foo"() { return "bar"; } };
if (obj9.foo === "bar") { console.log("PASS - string key getter"); }
else { console.log("FAIL - string key getter, got: " + obj9.foo); }

// Test 10: Number key getter
var obj10 = { get 0() { return "zero"; } };
if (obj10[0] === "zero") { console.log("PASS - number key getter"); }
else { console.log("FAIL - number key getter, got: " + obj10[0]); }

// Test 11: Object.getOwnPropertyDescriptor for accessor
var obj11 = { get x() { return 1; } };
var desc = Object.getOwnPropertyDescriptor(obj11, "x");
if (typeof desc.get === "function") { console.log("PASS - getOwnPropertyDescriptor get"); }
else { console.log("FAIL - getOwnPropertyDescriptor get, got: " + typeof desc.get); }
if (desc.set === undefined) { console.log("PASS - getOwnPropertyDescriptor set undefined"); }
else { console.log("FAIL - getOwnPropertyDescriptor set"); }

// Test 12: Object.defineProperty with getter/setter
var obj12 = {};
Object.defineProperty(obj12, "x", {
    get: function() { return 99; },
    enumerable: true,
    configurable: true
});
if (obj12.x === 99) { console.log("PASS - defineProperty getter"); }
else { console.log("FAIL - defineProperty getter, got: " + obj12.x); }

// Test 13: Compound assignment with getter/setter
var obj13 = {
    _count: 10,
    get count() { return this._count; },
    set count(v) { this._count = v; }
};
obj13.count += 5;
if (obj13.count === 15) { console.log("PASS - compound assignment with accessor"); }
else { console.log("FAIL - compound assignment with accessor, got: " + obj13.count); }

// Test 14: Increment with getter/setter
var obj14 = {
    _n: 5,
    get n() { return this._n; },
    set n(v) { this._n = v; }
};
obj14.n++;
if (obj14.n === 6) { console.log("PASS - postfix increment with accessor"); }
else { console.log("FAIL - postfix increment with accessor, got: " + obj14.n); }

// Test 15: Prefix increment with getter/setter
var obj15 = {
    _n: 5,
    get n() { return this._n; },
    set n(v) { this._n = v; }
};
var result = ++obj15.n;
if (result === 6) { console.log("PASS - prefix increment result"); }
else { console.log("FAIL - prefix increment result, got: " + result); }
if (obj15.n === 6) { console.log("PASS - prefix increment stored value"); }
else { console.log("FAIL - prefix increment stored value, got: " + obj15.n); }
