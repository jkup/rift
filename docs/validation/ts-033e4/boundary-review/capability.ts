// Representation probe, not an interpreter. Root action is a test harness only.
class Realm { readonly id: number; constructor(id: number) { this.id = id; } }
type Result = { type: "normal" | "throw"; value: number };
type Context = { readonly realm: Realm; call: (target: Target, value: number) => Result; tick: () => Result };
type Raw = (value: number, context: Context) => Result;
type Permit = { target: Target; context: Context; value: number; used: boolean };
let pending: Permit | null = null;
class Target {
    readonly realm: Realm;
    private readonly raw: Raw;
    constructor(realm: Realm, raw: Raw) { this.realm = realm; this.raw = raw; }
    invoke(value: number, context: Context): Result {
        const permit = pending;
        if (permit === null || permit.used || permit.target !== this || permit.context !== context || permit.value !== value)
            throw new Error("permit");
        permit.used = true;
        return this.raw(value, context);
    }
}
class Session {
    #active = false;
    #realm: Realm;
    #steps = 0;
    #calls = 0;
    #depth = 0;
    #context: { realm: Realm; call: (target: Target, value: number) => Result; tick: () => Result };
    readonly maxSteps: number;
    readonly maxCalls: number;
    constructor(realm: Realm, maxSteps: number, maxCalls: number) {
        this.maxSteps = maxSteps; this.maxCalls = maxCalls;
        this.#realm = realm;
        this.#context = { realm, call: (target: Target, value: number): Result => this.dispatch(target, value), tick: (): Result => this.tick() };
    }
    snapshot(): number[] { return [this.#steps, this.#calls, this.#depth, this.#realm.id, this.#active ? 1 : 0]; }
    // Harness callback exposes the context deliberately; production root takes an opaque record.
    run(action: (context: Context) => Result): Result {
        if (this.#active) throw new Error("reentry");
        this.#active = true;
        try { return action(this.#context); }
        finally { this.#active = false; }
    }
    private tick(): Result {
        if (!this.#active) throw new Error("idle");
        this.#steps++;
        return { type: this.#steps > this.maxSteps ? "throw" : "normal", value: this.#steps };
    }
    private dispatch(target: Target, value: number): Result {
        if (!this.#active) throw new Error("idle");
        if (this.#calls >= this.maxCalls) return { type: "throw", value: -1 };
        const realm = this.#realm, calls = this.#calls, depth = this.#depth, saved = pending;
        this.#realm = target.realm; this.#context.realm = target.realm; this.#calls++; this.#depth++;
        pending = { target, context: this.#context, value, used: false };
        try { return target.invoke(value, this.#context); }
        finally {
            pending = saved; this.#realm = realm; this.#context.realm = realm; this.#calls = calls; this.#depth = depth;
        }
    }
}
function check(ok: boolean): void { if (!ok) throw new Error("assertion"); }
function reject(action: () => void): void { let caught = false; try { action(); } catch { caught = true; } check(caught); }
function state(s: Session, expected: string): void { check(s.snapshot().join(",") === expected); }
const a = new Realm(7), b = new Realm(11);
const sa = new Session(a, 3, 2), sb = new Session(b, 10, 2);
let held: Context = { realm: a, call: (_t: Target, _v: number): Result => { throw new Error("unset"); }, tick: (): Result => { throw new Error("unset"); } };
const sentinel = new Error("sentinel");
const abrupt: Result = { type: "throw", value: 77 };
let raw = 0;
const leaf = new Target(b, (value: number, c: Context): Result => { raw++; check(c.realm === b); return { type: "normal", value }; });
const guestThrow = new Target(b, (_value: number, _c: Context): Result => abrupt);
const hostThrow = new Target(b, (_value: number, _c: Context): Result => { throw sentinel; });
const outer = new Target(a, (_value: number, c: Context): Result => {
    state(sa, "1,1,1,7,1");
    check(c.call(guestThrow, 0) === abrupt); state(sa, "1,1,1,7,1");
    let same = false;
    try { c.call(hostThrow, 0); } catch (error) { same = error instanceof Error && error === sentinel; }
    check(same && c.realm === a); state(sa, "1,1,1,7,1");
    sb.run((other: Context): Result => other.call(leaf, 12));
    state(sa, "1,1,1,7,1"); state(sb, "0,0,0,11,0");
    reject((): void => { outer.invoke(0, c); });
    reject((): void => { leaf.invoke(0, c); });
    check(c.call(leaf, 9).value === 9);
    return { type: "normal", value: 5 };
});
sa.run((c: Context): Result => {
    held = c;
    reject((): void => { sa.run((_c: Context): Result => abrupt); });
    check(c.tick().value === 1);
    reject((): void => { leaf.invoke(0, c); });
    const clone: Context = { realm: b, call: c.call, tick: c.tick };
    reject((): void => { leaf.invoke(0, clone); });
    // Deliberate capability forwarding: detached and copied functions retain A.
    const copied = clone.call;
    check(copied(leaf, 8).value === 8); check(clone.realm === b && c.realm === a);
    check(c.call(outer, 0).value === 5);
    sb.run((other: Context): Result => {
        check(other.tick().value === 1);
        check(clone.tick().value === 2); // A remains owner even while B is active.
        state(sa, "2,0,0,7,1"); state(sb, "1,0,0,11,1");
        return abrupt;
    });
    state(sb, "1,0,0,11,0");
    return abrupt;
});
state(sa, "2,0,0,7,0"); check(raw === 3);
reject((): void => { held.tick(); }); reject((): void => { held.call(leaf, 0); });
sb.run((_other: Context): Result => { reject((): void => { held.tick(); }); reject((): void => { held.call(leaf, 0); }); return abrupt; });
state(sa, "2,0,0,7,0"); state(sb, "1,0,0,11,0");
console.log("PASS ownership copied-detached activeA-activeB idleA-activeB");
console.log("PASS nested realm guest-identity host-identity permits");
let rootSame = false;
try { sa.run((c: Context): Result => c.call(hostThrow, 0)); }
catch (error) { rootSame = error instanceof Error && error === sentinel; }
check(rootSame); state(sa, "2,0,0,7,0");
reject((): void => { hostThrow.invoke(0, held); });
const recurse = new Target(a, (_v: number, c: Context): Result => c.call(recurse, 0));
check(sa.run((c: Context): Result => c.call(recurse, 0)).value === -1); state(sa, "2,0,0,7,0");
check(sa.run((c: Context): Result => c.tick()).type === "normal");
const exhausted = sa.run((c: Context): Result => c.tick()); check(exhausted.type === "throw" && exhausted.value === 4);
const again = sa.run((c: Context): Result => c.tick()); check(again.type === "throw" && again.value === 5);
state(sa, "5,0,0,7,0"); state(sb, "1,0,0,11,0");
console.log("PASS root-throw call-limit monotonic-steps independent-owner");
