let trace = "";
let o = {x: 0};
function base() { trace = trace + "b"; return o; }
function key() { trace = trace + "k"; return "x"; }
function rhs() { trace = trace + "r"; return 7; }
base()[key()] = rhs();
console.log(trace, o.x);
trace = "";
o.call = function(a, b) { trace = trace + "c"; return this === o; };
function method() { trace = trace + "m"; return "call"; }
console.log(base()[method()](rhs(), rhs()), trace);
trace = "";
let obj = {a: rhs(), b: rhs()};
console.log(trace, obj.a, obj.b);
