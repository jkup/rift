let count=0; let rhsCount=0; let p={x:12};
let key={toString:function(){count += 1; return 'x';}};
function rhs(){rhsCount += 1; p.x=99; return 3;}
console.log(p[key] += rhs(), p.x, count, rhsCount);
