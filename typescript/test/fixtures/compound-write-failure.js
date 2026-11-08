"use strict";
let p={valueOf:function(){console.log('coerce'); return 3;}};
Number.NaN += p;
