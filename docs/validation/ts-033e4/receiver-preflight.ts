// Feasibility control for the corrected E4 exact invocation-receiver contract.
// This is not an engine, activation implementation, or conformance result.
type Context = { tick: (amount: number) => number };
let steps = 0;
let active = true;
let exactView: Context;
const tick = function(this: Context, amount: number): number {
    if (this !== exactView) throw new Error("invalid Script context receiver");
    if (!active) throw new Error("idle Script context");
    steps += amount;
    return steps;
};
exactView = { tick };
if (exactView.tick(3) !== 3) throw new Error("authentic receiver failed");
const clone: Context = { tick: exactView.tick };
let rejected = false;
try { clone.tick(7); } catch { rejected = true; }
if (!rejected || steps !== 3) throw new Error("clone authorized");
const detached = exactView.tick;
rejected = false;
try { detached(11); } catch { rejected = true; }
if (!rejected || steps !== 3) throw new Error("detached authorized");
active = false;
rejected = false;
try { exactView.tick(13); } catch { rejected = true; }
if (!rejected || steps !== 3) throw new Error("idle authorized");
console.log("PASS receiver authentic/clone/detached/idle steps3");
