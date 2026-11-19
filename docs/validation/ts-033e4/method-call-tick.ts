// The production-shaped structural callback boundary, not an engine.
type Context = {
    call: (value: number) => number;
    tick: (amount: number) => number;
};
let exactView: Context;
let active = true;
let calls = 0;
let steps = 0;
class Callbacks {
    call(value: number): number {
        if (this !== exactView) throw new Error("invalid call receiver");
        if (!active) throw new Error("idle call receiver");
        calls++;
        return value;
    }
    tick(amount: number): number {
        if (this !== exactView) throw new Error("invalid tick receiver");
        if (!active) throw new Error("idle tick receiver");
        steps += amount;
        return steps;
    }
}
const origin = new Callbacks();
const call = origin.call;
const tick = origin.tick;
exactView = { call, tick };
// Test both authentic entry points independently even if the first fails.
try {
    if (exactView.call(7) !== 7 || calls !== 1) throw new Error("call effect");
    console.log("call authentic PASS");
} catch { console.log("call authentic FAIL"); }
try {
    if (exactView.tick(3) !== 3 || steps !== 3) throw new Error("tick effect");
    console.log("tick authentic PASS");
} catch { console.log("tick authentic FAIL"); }
const clone: Context = { call, tick };
let rejected = false;
try { clone.call(7); } catch { rejected = true; }
if (!rejected || calls > 1) throw new Error("clone call effects");
rejected = false;
try { clone.tick(7); } catch { rejected = true; }
if (!rejected || steps > 3) throw new Error("clone tick effects");
active = false;
console.log("counters " + calls + " " + steps);
