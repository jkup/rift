let p={valueOf:function(){console.log('coerce'); throw 'sentinel';}};
Number.NaN -= p;
