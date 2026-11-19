// Diagnostic JS-source control for receiver-minimal.ts; not a static substitute.
let view;
const check = function() { return this === view; };
view = { check };
console.log(view.check());
