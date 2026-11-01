// This host driver is compiled, but the guest sources are always read at runtime.
import { readFileSync } from "node:fs";
import { run } from "../src/interpreter.js";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { GuestObject, normal, UNDEFINED } from "../src/runtime.js";
const a = new Realm((line) => { console.log("a " + line); });
const b = new Realm((line) => { console.log("b " + line); });
const setup = readFileSync(process.argv[2], "utf8");
const check = readFileSync(process.argv[3], "utf8");
const first = run(setup, a);
const second = run(check, b);
const third = run("console.log(saved());", a);
if (first.phase !== "runtime" || first.completion.type !== "normal"
    || second.phase !== "runtime" || second.completion.type !== "normal"
    || third.phase !== "runtime" || third.completion.type !== "normal") throw new Error("realm test failed");
const av = a.global.bindings.get("console");
const bv = b.global.bindings.get("console");
if (av === undefined || bv === undefined || av.value.kind !== "object" || bv.value.kind !== "object") throw new Error("missing console");
if (av.value.object === bv.value.object) throw new Error("shared console");
const al = av.value.object.get("log"); const bl = bv.value.object.get("log");
if (al.kind !== "object" || bl.kind !== "object" || al.object === bl.object) throw new Error("shared builtin");
const target = new GuestObject();
target.define("fixed", { kind: "number", value: 1 }, false, false, false);
const write = target.set("fixed", UNDEFINED, { line: 1, column: 1 });
if (write.type !== "throw" || target.get("fixed").kind !== "number") throw new Error("descriptor write check failed");
const d = target.properties.get("fixed");
if (d === undefined || d.writable || d.enumerable || d.configurable) throw new Error("descriptor flags failed");
a.registerBuiltin(target, "test", (receiver, args, _context, _loc) => {
    if (receiver.kind !== "object" || receiver.object !== target || args.length !== 1) throw new Error("builtin call boundary failed");
    return normal(args[0]);
});
a.global.bindings.set("host", { initialized: true, mutable: true, value: { kind: "object", object: target } });
const builtin = run("console.log(host.test(23));", a);
if (builtin.phase !== "runtime" || builtin.completion.type !== "normal") throw new Error("builtin result failed");
// Host callback failures must escape run(), never become catchable guest throws.
const broken = new Realm((_line) => { throw new Error("host output fault"); });
let escaped = false;
try { run("console.log(1);", broken); }
catch (error) { escaped = error instanceof Error && error.message === "host output fault"; }
if (!escaped) throw new Error("host fault was swallowed");
console.log("realms independent");

// Number bootstrap descriptors and mutable state must belong to each realm.
function numberNamespace(realm: Realm): GuestObject {
    const binding = realm.global.bindings.get("Number");
    if (binding === undefined || !binding.initialized || !binding.mutable || binding.value.kind !== "object") throw new Error("Number binding");
    return binding.value.object;
}
const an = numberNamespace(a);
const bn = numberNamespace(b);
if (an === bn || an.callable !== null || bn.callable !== null || an.properties.size !== 10) throw new Error("Number namespace scope/identity");
const constantNames = ["NaN", "POSITIVE_INFINITY", "NEGATIVE_INFINITY", "MAX_VALUE", "MIN_VALUE", "EPSILON", "MAX_SAFE_INTEGER", "MIN_SAFE_INTEGER"];
const constantValues = [NaN, Infinity, -Infinity, 1.7976931348623157e308, 5e-324, 2.220446049250313e-16, 9007199254740991, -9007199254740991];
for (let i = 0; i < constantNames.length; i++) {
    const key = constantNames[i];
    for (const namespace of [an, bn]) {
        const descriptor = namespace.properties.get(key);
        if (descriptor === undefined || descriptor.writable || descriptor.enumerable || descriptor.configurable || descriptor.value.kind !== "number") throw new Error("Number constant flags: " + key);
        const actual = descriptor.value.value;
        const expected = constantValues[i];
        if (!(Number.isNaN(expected) ? Number.isNaN(actual) : actual === expected)) throw new Error("Number constant value: " + key);
        if (namespace.set(key, UNDEFINED, { line: 1, column: 1 }).type !== "throw" || namespace.get(key) !== descriptor.value) throw new Error("Number constant write: " + key);
    }
}
for (const key of ["isNaN", "isFinite"]) {
    const ap = an.get(key);
    const bp = bn.get(key);
    if (ap.kind !== "object" || bp.kind !== "object" || ap.object === bp.object) throw new Error("Number predicate identity");
    for (const namespace of [an, bn]) {
        const descriptor = namespace.properties.get(key);
        if (descriptor === undefined || !descriptor.writable || descriptor.enumerable || !descriptor.configurable || descriptor.value.kind !== "object") throw new Error("Number predicate flags");
        const predicate = descriptor.value.object;
        if (predicate.callable === null || predicate.callable.kind !== "builtin") throw new Error("Number predicate callable");
        const name = predicate.properties.get("name");
        const length = predicate.properties.get("length");
        if (name === undefined || name.writable || name.enumerable || !name.configurable || name.value.kind !== "string" || name.value.value !== key) throw new Error("Number predicate name");
        if (length === undefined || length.writable || length.enumerable || !length.configurable || length.value.kind !== "number" || length.value.value !== 1) throw new Error("Number predicate length");
        for (const receiver of [UNDEFINED, { kind: "null" } as const, { kind: "number", value: NaN } as const, { kind: "object", object: namespace } as const]) {
            const result = new Evaluator(namespace === an ? a : b).call(descriptor.value, receiver, [{ kind: "number", value: key === "isNaN" ? NaN : 1 }], { line: 1, column: 1 });
            if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) throw new Error("Number predicate receiver");
        }
    }
    ap.object.set("realmMarker", UNDEFINED, { line: 1, column: 1 });
    if (bp.object.properties.has("realmMarker")) throw new Error("Number shared predicate state");
    if (an.set(key, UNDEFINED, { line: 1, column: 1 }).type !== "normal" || bn.get(key) !== bp) throw new Error("Number shared namespace state");
}
const rebind = run("Number = 5;", a);
if (rebind.phase !== "runtime" || rebind.completion.type !== "normal" || numberNamespace(b) !== bn) throw new Error("Number realm binding isolation");
