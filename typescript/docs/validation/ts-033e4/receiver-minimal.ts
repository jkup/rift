type View = { check: () => boolean };
let view: View;
const check = function(this: View): boolean { return this === view; };
view = { check };
console.log(view.check());
