let trace = ''; let lc = 0; let rc = 0; let kc = 0;
let key = {toString: function() { trace = trace + 'C'; kc = kc + 1; return 'x'; }};
function left() { trace = trace + 'L'; lc = lc + 1; return key; }
function right() { trace = trace + 'R'; rc = rc + 1; return {x: undefined}; }
let result = left() in right();
console.log(result, trace, lc, rc, kc);
