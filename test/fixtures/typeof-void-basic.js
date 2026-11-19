if (typeof null !== 'object') { throw 1; }
if (typeof 7 !== 'number') { throw 2; }
if (typeof true !== 'boolean') { throw 3; }
if (typeof '' !== 'string') { throw 4; }
if (typeof undefined !== 'undefined') { throw 5; }
if (typeof missing !== 'undefined') { throw 6; }
if (typeof Number !== 'object') { throw 7; }
if (typeof console.log !== 'function') { throw 8; }
if ((void 0) !== undefined) { throw 9; }
let counter = 0;
let conversions = 0;
let poison = {valueOf: function() { conversions = conversions + 1; throw 10; }, toString: function() { conversions = conversions + 1; throw 11; }};
function effect() { counter = counter + 1; return poison; }
if (typeof effect() !== 'object') { throw 12; }
if (void effect() !== undefined) { throw 13; }
if (counter !== 2 || conversions !== 0) { throw 14; }
