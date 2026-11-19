// Ordinary class method extracted onto a structural view; no bind or arrow.
type View = { check: () => boolean };
let view: View;
class Receiver {
    check(): boolean { return this === view; }
}
const origin = new Receiver();
const check = origin.check;
view = { check };
console.log(view.check());
const clone: View = { check };
console.log(clone.check());
