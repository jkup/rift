let n = 40;
let saved = function() { n = n + 1; return n; };
console.private = 123;
console.log(saved());
