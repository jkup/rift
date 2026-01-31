// Test eval() basic functionality

// Test 1: eval with arithmetic expression
var result1 = eval('1 + 2');
if (result1 !== 3) throw new Error('Test 1 failed: expected 3, got ' + result1);

// Test 2: eval with string expression
var result2 = eval('"hello"');
if (result2 !== "hello") throw new Error('Test 2 failed: expected "hello", got ' + result2);

// Test 3: eval with non-string argument returns argument as-is
var result3 = eval(42);
if (result3 !== 42) throw new Error('Test 3 failed: expected 42, got ' + result3);

var obj = {a: 1};
var result3b = eval(obj);
if (result3b !== obj) throw new Error('Test 3b failed: expected same object');

// Test 4: eval with undefined/no args
var result4 = eval();
if (result4 !== undefined) throw new Error('Test 4 failed: expected undefined, got ' + result4);

var result4b = eval(undefined);
if (result4b !== undefined) throw new Error('Test 4b failed: expected undefined, got ' + result4b);

// Test 5: eval can access global variables
var globalVar = 100;
var result5 = eval('globalVar + 1');
if (result5 !== 101) throw new Error('Test 5 failed: expected 101, got ' + result5);

// Test 6: eval can declare variables in global scope
eval('var evalDeclared = 42');
if (evalDeclared !== 42) throw new Error('Test 6 failed: expected 42, got ' + evalDeclared);

// Test 7: eval can define functions
eval('function evalFunc() { return "from eval"; }');
var result7 = evalFunc();
if (result7 !== "from eval") throw new Error('Test 7 failed: expected "from eval", got ' + result7);

// Test 8: eval returns completion value of last statement
var result8 = eval('var x = 1; var y = 2; x + y');
if (result8 !== 3) throw new Error('Test 8 failed: expected 3, got ' + result8);

// Test 9: eval propagates runtime errors
var caught = false;
try {
    eval('undeclaredVariable');
} catch (e) {
    caught = true;
}
if (!caught) throw new Error('Test 9 failed: expected ReferenceError');

// Test 10: eval propagates throw statements
var caughtMsg = '';
try {
    eval('throw new Error("eval throw")');
} catch (e) {
    caughtMsg = e.message;
}
if (caughtMsg !== "eval throw") throw new Error('Test 10 failed: expected "eval throw", got ' + caughtMsg);

// Test 11: eval returns object expressions
var result11 = eval('({a: 1, b: 2})');
if (result11.a !== 1 || result11.b !== 2) throw new Error('Test 11 failed');

// Test 12: typeof eval is function
if (typeof eval !== 'function') throw new Error('Test 12 failed: typeof eval is ' + typeof eval);

// Test 13: indirect eval works
var indirectEval = eval;
var result13 = indirectEval('1 + 1');
if (result13 !== 2) throw new Error('Test 13 failed: expected 2, got ' + result13);

// Test 14: eval with boolean returns boolean (non-string passthrough)
var result14 = eval(true);
if (result14 !== true) throw new Error('Test 14 failed: expected true, got ' + result14);

// Test 15: eval with null returns null
var result15 = eval(null);
if (result15 !== null) throw new Error('Test 15 failed: expected null, got ' + result15);

console.log("All eval tests passed! (15 tests)");
