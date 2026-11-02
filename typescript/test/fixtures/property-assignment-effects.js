let k = {toString: function() { console.log('key'); return 'x'; }}; function rhs() { console.log('rhs'); return 7; }
true[k] = rhs();