let trace = '';
let key = { toString: function() { trace = trace + 'C'; return 'x'; }, valueOf: function() { throw 'wrong hint'; } };
let target = { x: 7 };
function base() { trace = trace + 'B'; return target; }
function keyExpression() { trace = trace + 'K'; return key; }
function rhs() { trace = trace + 'R'; return 9; }
function argument() { trace = trace + 'A'; return 3; }
let nested = { toString: function() { return target[key]; } };
let looping = { toString: function() { while (true) {} } };
let recursive = { toString: function() { return target[recursive]; } };
