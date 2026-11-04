// Reduction of receiver-contract's failed native forwarding-proxy group.
type Context = { call: () => boolean; tick: () => boolean };
let view: Context;
const call = function(this: Context): boolean { return this === view; };
const tick = function(this: Context): boolean { return this === view; };
class View {
    get call(): () => boolean { return call; }
    get tick(): () => boolean { return tick; }
}
view = new View();
const proxy = new Proxy(view, { get(target: Context, key: string | symbol): unknown {
    return Reflect.get(target, key, target);
} });
console.log("identity " + (proxy === view));
console.log("authentic " + view.call() + " " + view.tick());
try { console.log("proxy-call " + proxy.call()); }
catch (error) { console.log(error instanceof Error ? "proxy-call error " + error.message : "proxy-call non-Error"); }
try { console.log("proxy-tick " + proxy.tick()); }
catch (error) { console.log(error instanceof Error ? "proxy-tick error " + error.message : "proxy-tick non-Error"); }
