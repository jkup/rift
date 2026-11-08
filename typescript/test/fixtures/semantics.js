"use strict";
console.log(before(4));
function before(n) { if (n <= 1) return 1; return n * before(n - 1); }
function make(start) { let n = start; return function() { n = n + 1; return n; }; }
let a = make(0);
let b = make(10);
console.log(a(), a(), b(), a());
let saved;
{ let x = 8; saved = function() { x = x + 2; return x; }; }
console.log(saved(), saved());
let o = {x: 1, method: function(n) { this.x = this.x + n; return this.x; }};
let alias = o;
console.log(o === alias, o === {}, o.method(2), (o.method)(3), o["method"](4), alias.x);
let detached = function() { return this; };
o.readThis = detached;
console.log(detached() === undefined, o.readThis() === o);
console.log(o.absent, o["x"] = 12, alias.x);
function args(a, b) { console.log(a, b); }
let calls = 0;
function bump() { calls = calls + 1; return calls; }
args(bump(), bump(), bump());
args(7);
console.log(calls);
let i = 0;
let sum = 0;
while (i < 10) {
    i = i + 1;
    if (i === 2) continue;
    if (i === 5) break;
    sum = sum + i;
}
console.log(i, sum);
function early() { while (true) { { return 19; } } }
console.log(early());
console.log(1 + 2 * 3, (1 + 2) * 3, 7 % 4, 8 / 2, -2 * 3, !0);
console.log(false && missing, true || missing, 0 || 9, 2 && 8);
console.log(null === null, undefined === null, NaN === NaN, 0 === -0);
console.log("hé" + "llo", "let", "}");
let first;
let second;
first = second = 5;
console.log(first, second);
let shadow = 1;
{ let shadow = 2; console.log(shadow); }
console.log(shadow);
