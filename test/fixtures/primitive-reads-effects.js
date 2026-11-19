let n = 0; let k = {toString: function() { n = n + 1; return 'length'; }}; console.log('ab'[k], n);
