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

// === Phase 2: Direct eval with proper scoping ===

// Test 16: Direct eval can read local variables
function testDirectEvalReadsLocals() {
    var x = 10;
    return eval('x');
}
var result16 = testDirectEvalReadsLocals();
if (result16 !== 10) throw new Error('Test 16 failed: expected 10, got ' + result16);

// Test 17: Direct eval can write to local scope (sloppy mode)
function testDirectEvalWritesLocals() {
    eval('var y = 5');
    return y;
}
var result17 = testDirectEvalWritesLocals();
if (result17 !== 5) throw new Error('Test 17 failed: expected 5, got ' + result17);

// Test 18: Indirect eval uses global scope (cannot see local variables)
var indirectEval2 = eval;
function testIndirectEvalGlobalScope() {
    var localOnlyVar18 = 10;
    return indirectEval2('typeof localOnlyVar18');
}
var result18 = testIndirectEvalGlobalScope();
if (result18 !== "undefined") throw new Error('Test 18 failed: expected "undefined", got ' + result18);

// Test 19: Indirect eval via variable assignment uses global scope
function testIndirectEvalViaAssignment() {
    var e = eval;
    var localVar19 = 999;
    return e('typeof localVar19');
}
var result19 = testIndirectEvalViaAssignment();
if (result19 !== "undefined") throw new Error('Test 19 failed: expected "undefined", got ' + result19);

// Test 20: Direct eval in strict mode doesn't leak var declarations
function testStrictEvalNoLeak() {
    'use strict';
    eval('var z = 1');
    return typeof z;
}
var result20 = testStrictEvalNoLeak();
if (result20 !== "undefined") throw new Error('Test 20 failed: expected "undefined", got ' + result20);

// Test 21: Eval'd code with "use strict" doesn't leak vars
function testEvalCodeUseStrict() {
    eval('"use strict"; var w = 42');
    return typeof w;
}
var result21 = testEvalCodeUseStrict();
if (result21 !== "undefined") throw new Error('Test 21 failed: expected "undefined", got ' + result21);

// Test 22: Direct eval can modify existing local variables
function testDirectEvalModifiesLocals() {
    var a = 1;
    eval('a = 20');
    return a;
}
var result22 = testDirectEvalModifiesLocals();
if (result22 !== 20) throw new Error('Test 22 failed: expected 20, got ' + result22);

// Test 23: Direct eval can access function parameters
function testDirectEvalWithParams(p) {
    return eval('p + 1');
}
var result23 = testDirectEvalWithParams(41);
if (result23 !== 42) throw new Error('Test 23 failed: expected 42, got ' + result23);

// Test 24: Nested direct eval still uses caller's scope
function testNestedScope() {
    var outer = 'hello';
    function inner() {
        var innerVal = 'world';
        return eval('outer + " " + innerVal');
    }
    return inner();
}
var result24 = testNestedScope();
if (result24 !== "hello world") throw new Error('Test 24 failed: expected "hello world", got ' + result24);

// === Phase 3: eval() edge cases + new Function() ===

// Test 25: Function hoisting in sloppy eval
var result25 = eval('var x25 = foo25(); function foo25() { return 1; } x25');
if (result25 !== 1) throw new Error('Test 25 failed: expected 1, got ' + result25);

// Test 26: Nested eval
var result26 = eval("eval('1 + 2')");
if (result26 !== 3) throw new Error('Test 26 failed: expected 3, got ' + result26);

// Test 27: new Function with body only
var fn27 = new Function("return 42");
var result27 = fn27();
if (result27 !== 42) throw new Error('Test 27 failed: expected 42, got ' + result27);

// Test 28: new Function with params and body
var fn28 = new Function("a", "b", "return a + b");
var result28 = fn28(1, 2);
if (result28 !== 3) throw new Error('Test 28 failed: expected 3, got ' + result28);

// Test 29: Function() called without new
var fn29 = Function("return 10");
var result29 = fn29();
if (result29 !== 10) throw new Error('Test 29 failed: expected 10, got ' + result29);

// Test 30: Function constructor creates function in global scope (no access to local vars)
var fn30result = (function() {
    var localSecret = 999;
    var fn = new Function("return typeof localSecret");
    return fn();
})();
if (fn30result !== "undefined") throw new Error('Test 30 failed: expected "undefined", got ' + fn30result);

console.log("All eval tests passed! (30 tests)");
