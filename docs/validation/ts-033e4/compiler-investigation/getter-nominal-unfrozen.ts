// Unfrozen diagnostic control only; fails the E4 immutable-view requirement.
// Same diagnostic with a nominal parameter. Not a permitted API replacement.
let realm = 7;
let steps = 0;
const call = (value: number): number => value;
const tick = (value: number): number => { steps += value; return steps; };
class View {
    #brand = 1;
    get realm(): number { return realm + this.#brand - 1; }
    get call(): (value: number) => number { return call; }
    get tick(): (value: number) => number { return tick; }
}
function use(view: View): number { return view.call(view.realm) + view.tick(2); }
const view = new View();

if (use(view) !== 9) throw new Error("initial getter");
realm = 11;
if (use(view) !== 15) throw new Error("live getter");
console.log("PASS getter live7/11 steps4");
