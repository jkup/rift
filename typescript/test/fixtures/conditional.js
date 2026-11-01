// Distinguish right association from (true ? 0 : false) ? 2 : 3.
console.log(true ? 0 : false ? 2 : 3);
console.log(false ? 1 : true ? 2 : 3);
console.log(true ? false ? 4 : 5 : 6);
let a = 0;
let b = 0;
console.log(true ? a = 7 : b = 8, a, b);
console.log(false ? a = 9 : b = 10, a, b);
a = false ? 11 : b = 12;
console.log(a, b);
console.log(true || false ? 13 : 14, false || true ? 15 : 16);
console.log(false && true ? 17 : 18, 1 + 2 * 3 === 7 ? 19 : 20);
console.log(-2 * 3, !true ? 21 : 22, true ? 2 + 3 * 4 : 0);
console.log(true ? 0 : 1 || 2, false ? 0 : false || 23);
function identity(value) { return value; }
console.log(identity(false ? 24 : true ? 25 : 26), identity(true ? false ? 27 : 28 : 29));
let effects = "";
function mark(label, value) { effects = effects + label; return value; }
console.log(mark("t", true) ? mark("a", 30) : mark("b", 31), effects);
console.log(mark("f", false) ? mark("c", 32) : mark("d", 33), effects);
function stop() { throw "not chosen"; }
console.log(true ? 34 : stop(), false ? stop() : 35);
console.log(true ? 36 : missing, false ? missing : 37);
console.log(undefined ? 1 : 0, null ? 1 : 0, false ? 1 : 0, 0 ? 1 : 0, -0 ? 1 : 0, NaN ? 1 : 0, "" ? 1 : 0);
console.log(1 ? 1 : 0, -1 ? 1 : 0, Infinity ? 1 : 0, "x" ? 1 : 0, {} ? 1 : 0, identity ? 1 : 0);
let object = { value: 38, method: function() { return this; } };
console.log((true ? object : null) === object, (false ? null : object).value);
// Conditional expressions produce values, so choosing a method detaches it.
console.log((true ? object.method : identity)() === undefined);
console.log((false ? identity : object.method)() === undefined);
console.log((true ? { value: false ? 0 : 39 } : null).value);
