// Genuine class context: extracted methods returned by getters on that same view.
// Avoids the minimal probe's distinct plain-object receiver representation.
type Context = { call: (value: number) => number; tick: (amount: number) => number };
let exactView: View;
let calls = 0;
let steps = 0;
class View {
    get call(): (value: number) => number { return this.invokeCall; }
    get tick(): (amount: number) => number { return this.invokeTick; }
    private invokeCall(value: number): number {
        if (this !== exactView) throw new Error("invalid call receiver");
        calls++;
        return value;
    }
    private invokeTick(amount: number): number {
        if (this !== exactView) throw new Error("invalid tick receiver");
        steps += amount;
        return steps;
    }
}
exactView = new View();
const context: Context = exactView;
try {
    if (context.call(7) !== 7 || calls !== 1) throw new Error("call effect");
    console.log("call authentic PASS");
} catch { console.log("call authentic FAIL"); }
try {
    if (context.tick(3) !== 3 || steps !== 3) throw new Error("tick effect");
    console.log("tick authentic PASS");
} catch { console.log("tick authentic FAIL"); }
console.log("counters " + calls + " " + steps);
