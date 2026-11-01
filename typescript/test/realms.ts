// This host driver is compiled, but the guest sources are always read at runtime.
import { readFileSync } from "node:fs";
import { run } from "../src/interpreter.js";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { GuestObject, normal, UNDEFINED, sameValue, type Value } from "../src/runtime.js";
import { GuestArray } from "../src/array-object.js";
import { parse } from "../src/parser.js";
const a = new Realm((line) => { console.log("a " + line); });
const b = new Realm((line) => { console.log("b " + line); });
const aContext = new Evaluator(a).context;
const bContext = new Evaluator(b).context;
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
target.bootstrapDefine("fixed", { value: { kind: "number", value: 1 }, writable: false, enumerable: false, configurable: false });
const write = target.set("fixed", UNDEFINED, aContext, { line: 1, column: 1 });
if (write.type !== "throw" || target.get("fixed").kind !== "number") throw new Error("descriptor write check failed");
const d = target.properties.get("fixed");
if (d === undefined || d.writable || d.enumerable || d.configurable) throw new Error("descriptor flags failed");
a.registerBuiltin(target, "test", 1, (receiver, args, _context, _loc) => {
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
        if (namespace.set(key, UNDEFINED, (namespace === an ? aContext : bContext), { line: 1, column: 1 }).type !== "throw" || namespace.get(key) !== descriptor.value) throw new Error("Number constant write: " + key);
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
    if (ap.object.set("realmMarker", UNDEFINED, aContext, { line: 1, column: 1 }).type !== "normal") throw new Error("realm marker write failed");
    if (bp.object.properties.has("realmMarker")) throw new Error("Number shared predicate state");
    if (an.set(key, UNDEFINED, aContext, { line: 1, column: 1 }).type !== "normal" || bn.get(key) !== bp) throw new Error("Number shared namespace state");
}
const rebind = run("Number = 5;", a);
if (rebind.phase !== "runtime" || rebind.completion.type !== "normal" || numberNamespace(b) !== bn) throw new Error("Number realm binding isolation");

function checkGraph(ok: boolean, message: string): void {
    if (!ok) throw new Error(message);
}
function objectValue(object: GuestObject): Value { return { kind: "object", object }; }
function numberValue(value: number): Value { return { kind: "number", value }; }
function graphBinding(realm: Realm, name: string): Value {
    const entry = realm.global.bindings.get(name);
    if (entry === undefined || !entry.initialized) throw new Error("graph binding " + name);
    return entry.value;
}
function graphObject(value: Value): GuestObject {
    if (value.kind !== "object") throw new Error("graph object");
    return value.object;
}
function graphPut(object: GuestObject, key: string, value: Value): void {
    object.bootstrapDefine(key, { value, writable: true, enumerable: true, configurable: true });
}
function metadata(object: GuestObject, expectedName: string, expectedLength: number): void {
    const name = object.getOwnProperty("name");
    const length = object.getOwnProperty("length");
    checkGraph(name !== undefined && sameValue(name.value, { kind: "string", value: expectedName }) && !name.writable && !name.enumerable && name.configurable, "G5 name descriptor");
    checkGraph(length !== undefined && sameValue(length.value, numberValue(expectedLength)) && !length.writable && !length.enumerable && length.configurable, "G5 length descriptor, including positive zero");
}
const at = { line: 19, column: 4 };
// G7: no evaluator exists while bootstrap runs; output would be a host fault.
const r1 = new Realm((_line) => { throw new Error("bootstrap output"); });
const r2 = new Realm((_line) => { throw new Error("bootstrap output"); });
const roots = [r1.objectPrototype, r1.functionPrototype, r1.arrayPrototype, r2.objectPrototype, r2.functionPrototype, r2.arrayPrototype];
for (let i = 0; i < roots.length; i++) {
    checkGraph(roots[i].isExtensible(), "G1 extensible root");
    for (let j = i + 1; j < roots.length; j++) checkGraph(roots[i] !== roots[j], "G1 six distinct roots");
}
for (const realm of [r1, r2]) {
    const o = realm.objectPrototype;
    const f = realm.functionPrototype;
    const ar = realm.arrayPrototype;
    checkGraph(o.getPrototypeOf() === null && f.getPrototypeOf() === o && ar.getPrototypeOf() === o, "G1 graph");
    checkGraph(o.callable === null && f.callable !== null && ar instanceof GuestArray, "G1 root kinds");
    checkGraph(o.ownPropertyKeys().length === 0 && f.ownPropertyKeys().join(",") === "name,length,call" && ar.ownPropertyKeys().join(",") === "length", "G17 exact initial keys");
    for (const root of [o, f, ar]) {
        for (const key of ["constructor", "toString", "valueOf", "join", "map"]) checkGraph(root.get(key).kind === "undefined", "G17 missing methods");
    }
    metadata(f, "", 0);
    for (const name of ["console", "Number"]) {
        const namespace = graphObject(graphBinding(realm, name));
        checkGraph(namespace.getPrototypeOf() === o && namespace.callable === null, "G9 namespace");
        const names = name === "console" ? ["log"] : ["isNaN", "isFinite"];
        for (const key of names) {
            const method = namespace.getOwnProperty(key);
            checkGraph(method !== undefined && method.writable && !method.enumerable && method.configurable, "G5 installation descriptor");
            const fn = graphObject(namespace.get(key));
            checkGraph(fn.getPrototypeOf() === f && fn.callable !== null, "G9 builtin chain");
            metadata(fn, key, key === "log" ? 0 : 1);
        }
    }
    for (const name of ["Object", "Function", "Array"]) checkGraph(!realm.global.bindings.has(name), "G9 no constructors");
}
// G2/G3: immutable slot is independent from property extensibility.
const immutableRealm = new Realm((_line) => {});
const immutable = immutableRealm.objectPrototype;
checkGraph(immutable.setPrototypeOf(null).value && !immutable.setPrototypeOf(new GuestObject()).value, "G2 immutable prototype");
graphPut(immutable, "x", numberValue(7));
checkGraph(sameValue(immutable.get("x"), numberValue(7)) && immutable.getPrototypeOf() === null, "G2 mutable properties");
immutable.preventExtensions();
checkGraph(immutable.setPrototypeOf(null).value && !immutable.setPrototypeOf(r1.objectPrototype).value, "G2 frozen same slot");
checkGraph(r1.createObject().getPrototypeOf() === r1.objectPrototype && new GuestObject().getPrototypeOf() === null && new GuestArray().getPrototypeOf() === null, "G3 explicit null defaults");
const active = new Evaluator(r1);
for (const receiver of [UNDEFINED, { kind: "null" } as const, objectValue(r1.createObject())]) {
    const called = active.context.call(objectValue(r1.functionPrototype), receiver, [numberValue(3), receiver], at);
    checkGraph(called.type === "normal" && called.value.kind === "undefined" && active.calls === 0 && active.steps === 0, "G4 no-op callable cleanup/no ticks");
}
checkGraph(!r1.functionPrototype.properties.has("prototype") && !r1.functionPrototype.properties.has("constructor"), "G4 no construction");
const limited = new Evaluator(r1, 100, 0);
const exhausted = limited.context.call(objectValue(r1.functionPrototype), UNDEFINED, [], at);
checkGraph(exhausted.type === "throw" && exhausted.diagnostic.name === "RangeError" && exhausted.diagnostic.message === "call depth limit exceeded" && exhausted.diagnostic.loc === at && limited.calls === 0, "G15 F call budget");
for (const length of [NaN, Infinity, -Infinity, -1, 0.5]) {
    let rejected = false;
    try { r1.createBuiltin("bad", length, (_receiver, _args, _context, _loc) => normal()); }
    catch (error) { rejected = error instanceof Error && error.message === "invalid builtin length"; }
    checkGraph(rejected, "G5 invalid metadata host fault");
}
metadata(r1.createBuiltin("zero", -0, (_receiver, _args, _context, _loc) => normal()), "zero", 0);
let bootstrapFault = false;
try { r1.arrayPrototype.bootstrapDefine("length", { value: objectValue(r1.createObject()) }); }
catch (error) { bootstrapFault = error instanceof Error; }
checkGraph(bootstrapFault && sameValue(r1.arrayPrototype.get("length"), numberValue(0)), "G7 invalid bootstrap length host fault");
const initialLength = r1.arrayPrototype.getOwnProperty("length");
checkGraph(initialLength !== undefined && sameValue(initialLength.value, numberValue(0)) && initialLength.writable && !initialLength.enumerable && !initialLength.configurable, "G6 array root length");
const growth = r1.arrayPrototype.defineOwnProperty("2", { value: numberValue(9), writable: true, enumerable: true, configurable: true }, active.context, at);
checkGraph(growth.type === "normal" && growth.value && sameValue(r1.arrayPrototype.get("length"), numberValue(3)), "G6 exotic growth");
const shrink = r1.arrayPrototype.defineOwnProperty("length", { value: numberValue(1) }, active.context, at);
checkGraph(shrink.type === "normal" && shrink.value && sameValue(r1.arrayPrototype.get("length"), numberValue(1)) && !r1.arrayPrototype.properties.has("2"), "G6 exotic shrink");
checkGraph(active.steps === 0 && active.calls === 0, "G15 allocation and primitive definitions add no ticks");
// G8/G10: parsed allocations, inherited lookup and own shadowing.
graphPut(r1.objectPrototype, "x", numberValue(7));
graphPut(r1.functionPrototype, "y", numberValue(8));
graphPut(r1.arrayPrototype, "z", numberValue(9));
r1.objectPrototype.bootstrapDefine("fixed", { value: numberValue(3), writable: false });
const graphSource = readFileSync("test/fixtures/realm-intrinsics.js", "utf8");
const graphParsed = parse(graphSource);
checkGraph(graphParsed.error === null, "G8 runtime fixture parses");
checkGraph(active.block(graphParsed.body, r1.global, UNDEFINED).type === "normal", "G8 runtime fixture executes");
const literalObject = graphObject(graphBinding(r1, "object"));
const literalArray = graphObject(graphBinding(r1, "array"));
const declared = graphObject(graphBinding(r1, "declared"));
checkGraph(literalObject.getPrototypeOf() === r1.objectPrototype && literalArray.getPrototypeOf() === r1.arrayPrototype && declared.getPrototypeOf() === r1.functionPrototype && graphObject(graphBinding(r1, "expression")).getPrototypeOf() === r1.functionPrototype, "G8 literal/declaration/expression roots");
checkGraph(declared.callable !== null && declared.callable.kind === "guest" && declared.callable.environment === r1.global, "G8 captured environment");
checkGraph(!declared.properties.has("name") && !declared.properties.has("length") && sameValue(declared.get("length"), numberValue(0)), "G8 partial inherited function metadata");
const nested = graphObject(graphBinding(r1, "nested"));
checkGraph(nested.get("object") === graphBinding(r1, "object") && nested.get("fn") === graphBinding(r1, "declared") && graphObject(nested.get("array")).get("0") === graphBinding(r1, "object"), "G8 retained nested Values");
const firstFresh = graphObject(graphBinding(r1, "first"));
const secondFresh = graphObject(graphBinding(r1, "second"));
checkGraph(firstFresh !== secondFresh, "G8 fresh outer arrays");
for (const key of ["0", "1", "2"]) {
    const left = graphObject(firstFresh.get(key));
    const right = graphObject(secondFresh.get(key));
    const expected = key === "0" ? r1.objectPrototype : key === "1" ? r1.arrayPrototype : r1.functionPrototype;
    checkGraph(left !== right && left.getPrototypeOf() === expected && right.getPrototypeOf() === expected, "G8 repeated nested allocations");
}
checkGraph(sameValue(graphBinding(r1, "inheritedX"), numberValue(7)) && sameValue(graphBinding(r1, "inheritedY"), numberValue(8)) && sameValue(graphBinding(r1, "inheritedZ"), numberValue(9)) && sameValue(graphBinding(r1, "shadow"), numberValue(10)), "G10 inherited values/shadow");
checkGraph(literalObject.ownPropertyKeys().join(",") === "x" && !declared.properties.has("y") && !literalArray.properties.has("z"), "G10 reads do not define");
checkGraph(literalObject.internalDelete("x").type === "normal" && sameValue(literalObject.get("x"), numberValue(7)), "G10 delete restores inheritance");
const readonlyWrite = active.context.call(graphBinding(r1, "readonlyWrite"), UNDEFINED, [], at);
checkGraph(readonlyWrite.type === "throw" && readonlyWrite.diagnostic.name === "TypeError" && sameValue(graphBinding(r1, "effects"), numberValue(1)) && !literalObject.properties.has("fixed"), "G10 readonly write after RHS effect");
// G11: transfer Values verbatim; the existing foreign-call context policy stays explicit.
for (const name of ["object", "array", "declared"]) {
    const value = graphBinding(r1, name);
    r2.global.bindings.set(name, { initialized: true, mutable: true, value });
    checkGraph(graphBinding(r2, name) === value && sameValue(graphObject(value).get("x"), numberValue(7)), "G11 retained foreign identity/inheritance");
}
checkGraph(r2.createObject().get("x").kind === "undefined" && r2.objectPrototype.ownPropertyKeys().length === 0, "G11 independent root mutation");
const foreignActive = new Evaluator(r2);
const retained = foreignActive.context.call(graphBinding(r1, "declared"), UNDEFINED, [], at);
checkGraph(retained.type === "normal" && retained.value === graphBinding(r1, "object"), "G11 lexical environment retained");
const foreignAllocation = foreignActive.context.call(graphBinding(r1, "expression"), UNDEFINED, [], at);
checkGraph(foreignAllocation.type === "normal" && graphObject(foreignAllocation.value).getPrototypeOf() === r2.objectPrototype && foreignActive.calls === 0, "G11 foreign body uses caller Realm limitation");
// G14: a graph does not supply default coercion methods.
for (const name of [
    "numericObject", "numericArray", "numericFunction",
    "additionObject", "additionArray", "additionFunction",
    "keyObject", "keyArray", "keyFunction",
    "lengthObject", "lengthArray", "lengthFunction",
]) {
    const completion = active.context.call(graphBinding(r1, name), UNDEFINED, [], at);
    checkGraph(completion.type === "throw" && completion.diagnostic.name === "TypeError" && completion.diagnostic.message === "cannot convert object to primitive" && completion.diagnostic.loc.line > 1 && active.calls === 0, "G14 exact located coercion failure " + name);
}
const numberCall = active.context.call(graphBinding(r1, "numberCall"), UNDEFINED, [], at);
checkGraph(numberCall.type === "throw" && numberCall.diagnostic.name === "TypeError" && numberCall.diagnostic.message === "value is not callable", "G9 Number remains namespace");
