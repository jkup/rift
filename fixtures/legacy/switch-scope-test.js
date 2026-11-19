// Tests for switch statement block scope (14.12 CaseBlock scoping)
console.log("=== Switch Statement Scope Tests ===");

// Basic switch works
var result = '';
switch (1) {
  case 1: result = 'one'; break;
  case 2: result = 'two'; break;
  default: result = 'other';
}
if (result === 'one') console.log("PASS: basic switch case matching");
else console.log("FAIL: basic switch case matching, got " + result);

// Fall-through works
result = '';
switch (1) {
  case 1: result += 'a';
  case 2: result += 'b';
  case 3: result += 'c'; break;
  default: result += 'd';
}
if (result === 'abc') console.log("PASS: switch fall-through");
else console.log("FAIL: switch fall-through, got " + result);

// let scoping inside switch with block
switch (1) {
  case 1: {
    let x = 42;
    if (x === 42) console.log("PASS: let in switch case block");
    else console.log("FAIL: let in switch case block");
    break;
  }
}

// let x in switch block scopes correctly (shadows outer)
let outer = 'outside';
switch (1) {
  case 1:
    let inner = 'inside';
    if (inner === 'inside') console.log("PASS: let declaration in switch case");
    else console.log("FAIL: let declaration in switch case");
    break;
}

// Duplicate lexical names across cases should be caught at parse time
// (tested via SyntaxError expectation)
var caught = false;
try {
  eval("switch (0) { case 1: let f = 1; default: let f = 2; }");
} catch (e) {
  caught = true;
  if (String(e).indexOf("SyntaxError") !== -1 || String(e).indexOf("already been declared") !== -1)
    console.log("PASS: duplicate let across cases throws SyntaxError");
  else
    console.log("FAIL: wrong error type for duplicate let: " + e);
}
if (!caught) console.log("FAIL: no error for duplicate let across switch cases");

// var + function conflict in switch should throw
caught = false;
try {
  eval("switch (0) { case 1: function f() {} default: var f; }");
} catch (e) {
  caught = true;
  if (String(e).indexOf("SyntaxError") !== -1 || String(e).indexOf("already been declared") !== -1)
    console.log("PASS: function + var conflict in switch throws SyntaxError");
  else
    console.log("FAIL: wrong error for function + var conflict: " + e);
}
if (!caught) console.log("FAIL: no error for function + var conflict in switch");

// Duplicate async function names in switch should throw
caught = false;
try {
  eval("switch (0) { case 1: async function g() {} default: async function g() {} }");
} catch (e) {
  caught = true;
  if (String(e).indexOf("SyntaxError") !== -1 || String(e).indexOf("already been declared") !== -1)
    console.log("PASS: duplicate async functions in switch throws SyntaxError");
  else
    console.log("FAIL: wrong error for duplicate async functions: " + e);
}
if (!caught) console.log("FAIL: no error for duplicate async functions in switch");

console.log("=== Switch Statement Scope Tests Complete ===");
