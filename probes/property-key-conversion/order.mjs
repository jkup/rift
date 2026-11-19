// Native JavaScript reference observations only, not guest Rift execution.
import assert from "node:assert/strict";

let trace = "";
const target = {};
const key = { toString() { trace += "C"; return "x"; } };
function base() { trace += "B"; return target; }
function name() { trace += "K"; return key; }
function rhs() { trace += "R"; return 7; }
base()[name()] = rhs();
assert.equal(trace, "BKRC");
assert.equal(target.x, 7);

trace = "";
assert.throws(() => { null[name()] = rhs(); }, TypeError);
assert.equal(trace, "KR"); // Base rejection precedes key conversion, after RHS.

trace = "";
assert.throws(() => { null[name()]; }, TypeError);
assert.equal(trace, "K");

trace = "";
target.x = function (arg) { trace += "M"; assert.equal(this, target); assert.equal(arg, 7); };
base()[name()](rhs());
assert.equal(trace, "BKCRM");

trace = "";
const marker = {};
function stop() { trace += "R"; throw marker; }
let caught;
try { base()[name()] = stop(); } catch (error) { caught = error; }
assert.equal(caught, marker);
assert.equal(trace, "BKR");
console.log("order: 5 expected scenarios passed");
