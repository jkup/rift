// Tests for Array length RangeError validation

console.log("=== Testing Array Length RangeError Validation ===");

// --- Array constructor ---

// new Array(-1) should throw RangeError
try {
  new Array(-1);
  console.log("FAIL: new Array(-1) should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: new Array(-1) throws RangeError");
  } else {
    console.log("FAIL: new Array(-1) threw wrong error: " + e);
  }
}

// new Array(4294967296) should throw RangeError (2^32)
try {
  new Array(4294967296);
  console.log("FAIL: new Array(4294967296) should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: new Array(4294967296) throws RangeError");
  } else {
    console.log("FAIL: new Array(4294967296) threw wrong error: " + e);
  }
}

// new Array(1.5) should throw RangeError (non-integer)
try {
  new Array(1.5);
  console.log("FAIL: new Array(1.5) should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: new Array(1.5) throws RangeError");
  } else {
    console.log("FAIL: new Array(1.5) threw wrong error: " + e);
  }
}

// new Array(NaN) should throw RangeError
try {
  new Array(NaN);
  console.log("FAIL: new Array(NaN) should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: new Array(NaN) throws RangeError");
  } else {
    console.log("FAIL: new Array(NaN) threw wrong error: " + e);
  }
}

// new Array(Infinity) should throw RangeError
try {
  new Array(Infinity);
  console.log("FAIL: new Array(Infinity) should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: new Array(Infinity) throws RangeError");
  } else {
    console.log("FAIL: new Array(Infinity) threw wrong error: " + e);
  }
}

// Valid array lengths should work
var a0 = new Array(0);
if (a0.length === 0) {
  console.log("PASS: new Array(0).length === 0");
} else {
  console.log("FAIL: new Array(0).length === " + a0.length);
}

var a10 = new Array(10);
if (a10.length === 10) {
  console.log("PASS: new Array(10).length === 10");
} else {
  console.log("FAIL: new Array(10).length === " + a10.length);
}

// --- Array.length assignment ---

// Setting length to 2^32 should throw RangeError
try {
  var x = [];
  x.length = 4294967296;
  console.log("FAIL: [].length = 4294967296 should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: [].length = 4294967296 throws RangeError");
  } else {
    console.log("FAIL: [].length = 4294967296 threw wrong error: " + e);
  }
}

// Setting length to -1 should throw RangeError
try {
  var x = [];
  x.length = -1;
  console.log("FAIL: [].length = -1 should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: [].length = -1 throws RangeError");
  } else {
    console.log("FAIL: [].length = -1 threw wrong error: " + e);
  }
}

// Setting length to 1.5 should throw RangeError
try {
  var x = [];
  x.length = 1.5;
  console.log("FAIL: [].length = 1.5 should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: [].length = 1.5 throws RangeError");
  } else {
    console.log("FAIL: [].length = 1.5 threw wrong error: " + e);
  }
}

// --- Array.prototype.push overflow ---
var z = [];
z.length = 4294967295;
try {
  z.push("x");
  console.log("FAIL: push past max should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: push past max throws RangeError");
  } else {
    console.log("FAIL: push past max threw wrong error: " + e);
  }
}
// Property should still be set
if (z[4294967295] === "x") {
  console.log("PASS: push sets property before throwing");
} else {
  console.log("FAIL: push should set property before throwing, got: " + z[4294967295]);
}

// --- Array.prototype.map with invalid length ---
try {
  Array.prototype.map.call({0: 9, length: Infinity}, function(v) { return v; });
  console.log("FAIL: map with Infinity length should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: map with Infinity length throws RangeError");
  } else {
    console.log("FAIL: map with Infinity length threw wrong error: " + e);
  }
}

// --- Object.defineProperty with invalid array length ---
try {
  Object.defineProperty([], 'length', { value: -1, configurable: true });
  console.log("FAIL: defineProperty length -1 should throw RangeError");
} catch(e) {
  if (e instanceof RangeError) {
    console.log("PASS: defineProperty length -1 throws RangeError");
  } else {
    console.log("FAIL: defineProperty length -1 threw wrong error: " + e);
  }
}

// --- Plain objects should NOT throw RangeError for .length ---

// Plain object with negative length should be fine
var obj = {};
obj.length = -1;
if (obj.length === -1) {
  console.log("PASS: plain object .length = -1 does not throw");
} else {
  console.log("FAIL: plain object .length = -1 got: " + obj.length);
}

// Plain object with non-integer length should be fine
var obj2 = {};
obj2.length = 1.5;
if (obj2.length === 1.5) {
  console.log("PASS: plain object .length = 1.5 does not throw");
} else {
  console.log("FAIL: plain object .length = 1.5 got: " + obj2.length);
}

// Object.defineProperty on plain object length should not throw
var obj3 = {};
Object.defineProperty(obj3, 'length', { value: -1, configurable: true });
if (obj3.length === -1) {
  console.log("PASS: defineProperty on plain object length = -1 does not throw");
} else {
  console.log("FAIL: defineProperty on plain object length = -1 got: " + obj3.length);
}

console.log("=== Array Range Error Tests Complete ===");
