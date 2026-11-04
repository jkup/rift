// Pinned-compiler semantic baseline only. This is not a static candidate or E4.
// Deliberately contains no record/body engine, builtin permit, or guest execution.
type Action = () => number;
type Context = { readonly realm: number; call: (action: Action) => number; tick: () => number };
let view: Context;
let active = true;
let steps = 0;
let calls = 0;
let depth = 0;
let invoked = 0;
const call = function(this: Context, action: Action): number {
    if (this !== view) throw new Error("receiver");
    if (!active) throw new Error("idle");
    const savedCalls = calls, savedDepth = depth;
    calls++;
    depth++;
    try { return action(); }
    finally { calls = savedCalls; depth = savedDepth; }
};
const tick = function(this: Context): number {
    if (this !== view) throw new Error("receiver");
    if (!active) throw new Error("idle");
    return ++steps;
};
class View {
    #realm = 7;
    get realm(): number { return this.#realm; }
    get call(): (action: Action) => number { return call; }
    get tick(): () => number { return tick; }
}
view = new View();
Object.freeze(view);
function check(ok: boolean): void { if (!ok) throw new Error("assertion"); }
function target(): number { invoked++; return 99; }
function rejected(action: Action): void {
    const s = steps, c = calls, d = depth, i = invoked;
    let threw = false;
    try { action(); } catch { threw = true; }
    check(threw && steps === s && calls === c && depth === d && invoked === i);
}
let failures = 0;
function test(name: string, action: () => void): void {
    try { action(); console.log("PASS " + name); }
    catch { failures++; console.log("FAIL " + name); }
}
const copiedCall = view.call, copiedTick = view.tick;
const clone: Context = { realm: view.realm, call: copiedCall, tick: copiedTick };
test("authentic", () => {
    check(view.call((): number => view.tick()) === 1);
    check(steps === 1 && calls === 0 && depth === 0 && view.realm === 7);
});
test("clone-spread", () => {
    rejected((): number => clone.call(target)); rejected((): number => clone.tick());
    const spread: Context = { ...clone };
    rejected((): number => spread.call(target)); rejected((): number => spread.tick());
});
test("detached-foreign", () => {
    rejected((): number => copiedCall(target)); rejected((): number => copiedTick());
    const foreign: Context = new View();
    rejected((): number => foreign.call(target)); rejected((): number => foreign.tick());
});
test("rebinding", () => {
    rejected((): number => copiedCall.call(clone, target));
    rejected((): number => copiedTick.call(clone));
    rejected((): number => copiedCall.call(undefined, target));
    rejected((): number => copiedTick.call(null));
    const wrongCall = copiedCall.bind(clone), wrongTick = copiedTick.bind(clone);
    rejected((): number => wrongCall(target)); rejected((): number => wrongTick());
    check(copiedCall.call(view, (): number => view.tick()) === 2);
    const boundTick = copiedTick.bind(view);
    check(boundTick() === 3);
});
test("proxy", () => {
    const proxy = new Proxy(view, { get(target: Context, key: string | symbol): unknown {
        return Reflect.get(target, key, target);
    } });
    rejected((): number => proxy.call(target)); rejected((): number => proxy.tick());
});
test("ordering", () => {
    let trace = "";
    function argument(): Action { trace += "A"; return (): number => { trace += "B"; return 0; }; }
    rejected((): number => clone.call(argument()));
    // JS argument evaluation precedes entry. Authentication prevents dispatch.
    check(trace === "A");
    check(view.call(argument()) === 0 && trace === "AAB");
});
test("nested-throw-cleanup", () => {
    const sentinel = new Error("sentinel");
    const throwing = (): number => { check(calls === 2 && depth === 2); throw sentinel; };
    check(view.call((): number => {
        check(calls === 1 && depth === 1);
        let same = false;
        try { view.call(throwing); } catch (error) { same = error instanceof Error && error === sentinel; }
        check(same && calls === 1 && depth === 1);
        return 5;
    }) === 5);
    let same = false;
    try { view.call((): number => { throw sentinel; }); }
    catch (error) { same = error instanceof Error && error === sentinel; }
    check(same && calls === 0 && depth === 0 && steps === 3);
});
test("immutable-idle", () => {
    check(Object.isFrozen(view));
    check(!Reflect.set(view, "realm", 99));
    rejected((): number => { Object.defineProperty(view, "call", { value: target }); return 0; });
    rejected((): number => { Object.defineProperty(view, "tick", { value: target }); return 0; });
    check(view.call === copiedCall && view.tick === copiedTick && view.realm === 7);
    active = false;
    rejected((): number => view.call(target)); rejected((): number => view.tick());
    rejected((): number => copiedCall.call(view, target)); rejected((): number => copiedTick.call(view));
    active = true;
});
if (failures !== 0) process.exitCode = 1;
