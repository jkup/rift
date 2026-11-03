// Direct dispatch on genuine class instances: diagnostic control, not a fix.
let view: Receiver;
class Receiver {
    check(): boolean { return this === view; }
}
view = new Receiver();
console.log(view.check());
const other = new Receiver();
console.log(other.check());
