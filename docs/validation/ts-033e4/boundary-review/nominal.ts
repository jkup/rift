// Alternative seam only: all consumers take nominal Context, never a structural view.
class Realm { readonly id: number; constructor(id: number) { this.id = id; } }
class Context {
    #active = false;
    #steps = 0;
    #depth = 0;
    #realm: Realm;
    constructor(realm: Realm) { this.#realm = realm; }
    realm(): Realm { return this.#realm; }
    tick(): number { if (!this.#active) throw new Error("idle"); return ++this.#steps; }
    call(realm: Realm, action: (context: Context) => number): number {
        if (!this.#active) throw new Error("idle");
        const saved = this.#realm, depth = this.#depth;
        this.#realm = realm; this.#depth++;
        try { return action(this); }
        finally { this.#realm = saved; this.#depth = depth; }
    }
    run(action: (context: Context) => number): number {
        if (this.#active) throw new Error("reentry");
        this.#active = true;
        try { return action(this); } finally { this.#active = false; }
    }
    snapshot(): string { return this.#steps + "," + this.#depth + "," + this.#realm.id + "," + (this.#active ? 1 : 0); }
}
function check(ok: boolean): void { if (!ok) throw new Error("assertion"); }
function reject(action: () => void): void { let caught = false; try { action(); } catch { caught = true; } check(caught); }
const a = new Realm(7), b = new Realm(11), ca = new Context(a), cb = new Context(b), sentinel = new Error("sentinel");
ca.run((c: Context): number => {
    reject((): void => { c.run((_c: Context): number => 0); });
    check(c.tick() === 1);
    check(c.call(b, (nested: Context): number => {
        check(nested === c && nested.realm() === b && c.snapshot() === "1,1,11,1");
        let same = false;
        try { nested.call(a, (_c: Context): number => { throw sentinel; }); }
        catch (error) { same = error instanceof Error && error === sentinel; }
        check(same && c.snapshot() === "1,1,11,1");
        return 9;
    }) === 9);
    cb.run((other: Context): number => { check(other.tick() === 1); check(c.tick() === 2); return 0; });
    check(c.snapshot() === "2,0,7,1" && cb.snapshot() === "1,0,11,0");
    return 0;
});
cb.run((_c: Context): number => { reject((): void => { ca.tick(); }); return 0; });
let same = false;
try { ca.run((c: Context): number => c.call(b, (_c: Context): number => { throw sentinel; })); }
catch (error) { same = error instanceof Error && error === sentinel; }
check(same && ca.snapshot() === "2,0,7,0");
reject((): void => { ca.tick(); });
console.log("PASS nominal authentic cross-owner idle reentry nested root-throw");
