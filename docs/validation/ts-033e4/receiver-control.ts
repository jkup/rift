// Identity without an invocation receiver: diagnostic control, NOT a fix.
type View = { check: () => boolean };
let view: View;
let captured: View;
const check = function(): boolean { return captured === view; };
view = { check };
captured = view;
console.log(view.check());
