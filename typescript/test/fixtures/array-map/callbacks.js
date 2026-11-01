function identity(x) { return x; }
function double(x) { return x * 2; }
function empty(x) { return undefined; }
function receiver(x) { return this; }
function mutate(x, k, o) { if (k === 0) { o["1"] = 20; o["2"] = 30; o["3"] = 40; o.length = 4; } return x; }
function shrink(x, k, o) { if (k === 0) { o.length = 1; } return x; }
function make() { let n = 0; return function(x, k, o) { n = n + 1; host.observe(x, k, o, this, n); return x; }; }
let saved = make();
function throwing(x, k, o) { host.effect(k); if (k === 1) { throw host.sentinel; } return x; }
function recursive(x) { return host.__testMapObjectDefaultArray(host.input, recursive); }
function output(x) { console.log(x); return x; }

