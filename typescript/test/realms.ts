import { stringKeys } from "./key-assertions.js";
import { formatPropertyKey } from "../src/symbols.js";
import type { PropertyKey } from "../src/runtime.js";
// This host driver is compiled, but the guest sources are always read at runtime.
import { readFileSync } from "node:fs";
import { run } from "../src/interpreter.js";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { GuestObject, normal, failure, truthy, UNDEFINED, sameValue, type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
import { GuestBoolean, GuestNumber, GuestStringObject } from "../src/primitive-objects.js";
import { toObject } from "../src/object-conversion.js";
import { toNumber, toString, toUint32, toIntegerOrInfinity, toLength } from "../src/conversion.js";
import { toPrimitive } from "../src/primitive-conversion.js";
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
const al = av.value.object.get("log", aContext, { line: 1, column: 1 }); const bl = bv.value.object.get("log", bContext, { line: 1, column: 1 });
if (al.kind !== "object" || bl.kind !== "object" || al.object === bl.object) throw new Error("shared builtin");
const target = new GuestObject();
target.bootstrapDefine("fixed", { value: { kind: "number", value: 1 }, writable: false, enumerable: false, configurable: false });
const write = target.set("fixed", UNDEFINED, aContext, { line: 1, column: 1 });
if (write.type !== "throw" || target.get("fixed", aContext, { line: 1, column: 1 }).kind !== "number") throw new Error("descriptor write check failed");
const d = target.properties.get("fixed");
if (d === undefined || d.kind !== "data" || d.writable || d.enumerable || d.configurable) throw new Error("descriptor flags failed");
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
        if (descriptor === undefined || descriptor.kind !== "data" || descriptor.writable || descriptor.enumerable || descriptor.configurable || descriptor.value.kind !== "number") throw new Error("Number constant flags: " + formatPropertyKey(key));
        const actual = descriptor.value.value;
        const expected = constantValues[i];
        if (!(Number.isNaN(expected) ? Number.isNaN(actual) : actual === expected)) throw new Error("Number constant value: " + formatPropertyKey(key));
        if (namespace.set(key, UNDEFINED, (namespace === an ? aContext : bContext), { line: 1, column: 1 }).type !== "throw" || namespace.get(key, namespace === an ? aContext : bContext, { line: 1, column: 1 }) !== descriptor.value) throw new Error("Number constant write: " + formatPropertyKey(key));
    }
}
for (const key of ["isNaN", "isFinite"]) {
    const ap = an.get(key, aContext, { line: 1, column: 1 });
    const bp = bn.get(key, bContext, { line: 1, column: 1 });
    if (ap.kind !== "object" || bp.kind !== "object" || ap.object === bp.object) throw new Error("Number predicate identity");
    for (const namespace of [an, bn]) {
        const descriptor = namespace.properties.get(key);
        if (descriptor === undefined || descriptor.kind !== "data" || !descriptor.writable || descriptor.enumerable || !descriptor.configurable || descriptor.value.kind !== "object") throw new Error("Number predicate flags");
        const predicate = descriptor.value.object;
        if (predicate.callable === null || predicate.callable.kind !== "builtin") throw new Error("Number predicate callable");
        const name = predicate.properties.get("name");
        const length = predicate.properties.get("length");
        if (name === undefined || name.kind !== "data" || name.writable || name.enumerable || !name.configurable || name.value.kind !== "string" || name.value.value !== key) throw new Error("Number predicate name");
        if (length === undefined || length.kind !== "data" || length.writable || length.enumerable || !length.configurable || length.value.kind !== "number" || length.value.value !== 1) throw new Error("Number predicate length");
        for (const receiver of [UNDEFINED, { kind: "null" } as const, { kind: "number", value: NaN } as const, { kind: "object", object: namespace } as const]) {
            const result = new Evaluator(namespace === an ? a : b).call(descriptor.value, receiver, [{ kind: "number", value: key === "isNaN" ? NaN : 1 }], { line: 1, column: 1 });
            if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) throw new Error("Number predicate receiver");
        }
    }
    if (ap.object.set("realmMarker", UNDEFINED, aContext, { line: 1, column: 1 }).type !== "normal") throw new Error("realm marker write failed");
    if (bp.object.properties.has("realmMarker")) throw new Error("Number shared predicate state");
    if (an.set(key, UNDEFINED, aContext, { line: 1, column: 1 }).type !== "normal" || bn.get(key, bContext, { line: 1, column: 1 }) !== bp) throw new Error("Number shared namespace state");
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
    checkGraph(name !== undefined && name.kind === "data" && sameValue(name.value, { kind: "string", value: expectedName }) && !name.writable && !name.enumerable && name.configurable, "G5 name descriptor");
    checkGraph(length !== undefined && length.kind === "data" && sameValue(length.value, numberValue(expectedLength)) && !length.writable && !length.enumerable && length.configurable, "G5 length descriptor, including positive zero");
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
    const hostContext: OperationContext = { realm, call: (_c, _r, _a, _l): ValueCompletion => { throw new Error("unexpected inspection call"); }, tick: (_l): ValueCompletion => { throw new Error("unexpected inspection tick"); } };
    const o = realm.objectPrototype;
    const f = realm.functionPrototype;
    const ar = realm.arrayPrototype;
    checkGraph(o.getPrototypeOf() === null && f.getPrototypeOf() === o && ar.getPrototypeOf() === o, "G1 graph");
    checkGraph(o.callable === null && f.callable !== null && ar instanceof GuestArray, "G1 root kinds");
    checkGraph(f.callable !== null && f.callable.realm === realm, "R1 root owner");
    checkGraph(stringKeys(o.ownPropertyKeys()).join(",") === "valueOf,toString" && stringKeys(f.ownPropertyKeys()).join(",") === "name,length,call,toString" && stringKeys(ar.ownPropertyKeys()).join(",") === "length,join,toString,push,pop,reverse,indexOf,includes", "G17 exact initial keys");
    for (const root of [o, f, ar]) {
        checkGraph(root.get("valueOf", hostContext, at) === o.get("valueOf", hostContext, at), "G17 inherited valueOf");
        checkGraph(root.get("join", hostContext, at).kind === (root === ar ? "object" : "undefined"), "G17 Array join only");
        for (const key of ["constructor", "map"]) checkGraph(root.get(key, hostContext, at).kind === "undefined", "G17 missing methods");
    }
    metadata(f, "", 0);
    for (const name of ["console", "Number"]) {
        const namespace = graphObject(graphBinding(realm, name));
        checkGraph(namespace.getPrototypeOf() === o && namespace.callable === null, "G9 namespace");
        const names = name === "console" ? ["log"] : ["isNaN", "isFinite"];
        for (const key of names) {
            const method = namespace.getOwnProperty(key);
            checkGraph(method !== undefined && method.kind === "data" && method.writable && !method.enumerable && method.configurable, "G5 installation descriptor");
            const fn = graphObject(namespace.get(key, hostContext, at));
            checkGraph(fn.getPrototypeOf() === f && fn.callable !== null, "G9 builtin chain");
            checkGraph(fn.callable !== null && fn.callable.realm === realm, "R1 builtin owner");
            metadata(fn, key, key === "log" ? 0 : 1);
        }
    }
    for (const name of ["Object", "Function", "Array"]) checkGraph(!realm.global.bindings.has(name), "G9 no constructors");
}
// G2/G3: immutable slot is independent from property extensibility.
const immutableRealm = new Realm((_line) => {});
const immutableContext: OperationContext = { realm: immutableRealm, call: (_c, _r, _a, _l): ValueCompletion => { throw new Error("unexpected inspection call"); }, tick: (_l): ValueCompletion => { throw new Error("unexpected inspection tick"); } };
const immutable = immutableRealm.objectPrototype;
checkGraph(immutable.setPrototypeOf(null).value && !immutable.setPrototypeOf(new GuestObject()).value, "G2 immutable prototype");
graphPut(immutable, "x", numberValue(7));
checkGraph(sameValue(immutable.get("x", immutableContext, at), numberValue(7)) && immutable.getPrototypeOf() === null, "G2 mutable properties");
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
checkGraph(bootstrapFault && sameValue(r1.arrayPrototype.get("length", limited.context, at), numberValue(0)), "G7 invalid bootstrap length host fault");
const initialLength = r1.arrayPrototype.getOwnProperty("length");
checkGraph(initialLength !== undefined && initialLength.kind === "data" && sameValue(initialLength.value, numberValue(0)) && initialLength.writable && !initialLength.enumerable && !initialLength.configurable, "G6 array root length");
const growth = r1.arrayPrototype.defineOwnProperty("2", { value: numberValue(9), writable: true, enumerable: true, configurable: true }, active.context, at);
checkGraph(growth.type === "normal" && growth.value && sameValue(r1.arrayPrototype.get("length", active.context, at), numberValue(3)), "G6 exotic growth");
const shrink = r1.arrayPrototype.defineOwnProperty("length", { value: numberValue(1) }, active.context, at);
checkGraph(shrink.type === "normal" && shrink.value && sameValue(r1.arrayPrototype.get("length", active.context, at), numberValue(1)) && !r1.arrayPrototype.properties.has("2"), "G6 exotic shrink");
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
checkGraph(!declared.properties.has("name") && !declared.properties.has("length") && sameValue(declared.get("length", active.context, at), numberValue(0)), "G8 partial inherited function metadata");
const nested = graphObject(graphBinding(r1, "nested"));
checkGraph(nested.get("object", active.context, at) === graphBinding(r1, "object") && nested.get("fn", active.context, at) === graphBinding(r1, "declared") && graphObject(nested.get("array", active.context, at)).get("0", active.context, at) === graphBinding(r1, "object"), "G8 retained nested Values");
const firstFresh = graphObject(graphBinding(r1, "first"));
const secondFresh = graphObject(graphBinding(r1, "second"));
checkGraph(firstFresh !== secondFresh, "G8 fresh outer arrays");
for (const key of ["0", "1", "2"]) {
    const left = graphObject(firstFresh.get(key, active.context, at));
    const right = graphObject(secondFresh.get(key, active.context, at));
    const expected = key === "0" ? r1.objectPrototype : key === "1" ? r1.arrayPrototype : r1.functionPrototype;
    checkGraph(left !== right && left.getPrototypeOf() === expected && right.getPrototypeOf() === expected, "G8 repeated nested allocations");
}
checkGraph(sameValue(graphBinding(r1, "inheritedX"), numberValue(7)) && sameValue(graphBinding(r1, "inheritedY"), numberValue(8)) && sameValue(graphBinding(r1, "inheritedZ"), numberValue(9)) && sameValue(graphBinding(r1, "shadow"), numberValue(10)), "G10 inherited values/shadow");
checkGraph(stringKeys(literalObject.ownPropertyKeys()).join(",") === "x" && !declared.properties.has("y") && !literalArray.properties.has("z"), "G10 reads do not define");
checkGraph(literalObject.internalDelete("x").type === "normal" && sameValue(literalObject.get("x", active.context, at), numberValue(7)), "G10 delete restores inheritance");
const readonlyWrite = active.context.call(graphBinding(r1, "readonlyWrite"), UNDEFINED, [], at);
checkGraph(readonlyWrite.type === "throw" && readonlyWrite.diagnostic.name === "TypeError" && sameValue(graphBinding(r1, "effects"), numberValue(1)) && !literalObject.properties.has("fixed"), "G10 readonly write after RHS effect");
// G11: transfer Values verbatim; defining-Realm entry preserves lexical ownership.
for (const name of ["object", "array", "declared"]) {
    const value = graphBinding(r1, name);
    r2.global.bindings.set(name, { initialized: true, mutable: true, value });
    checkGraph(graphBinding(r2, name) === value && sameValue(graphObject(value).get("x", active.context, at), numberValue(7)), "G11 retained foreign identity/inheritance");
}
checkGraph(r2.createObject().get("x", active.context, at).kind === "undefined" && stringKeys(r2.objectPrototype.ownPropertyKeys()).join(",") === "valueOf,toString", "G11 independent root mutation");
const foreignActive = new Evaluator(r2);
const foreignContext = foreignActive.context;
const retained = foreignActive.context.call(graphBinding(r1, "declared"), UNDEFINED, [], at);
checkGraph(retained.type === "normal" && retained.value === graphBinding(r1, "object"), "G11 lexical environment retained");
const foreignAllocation = foreignActive.context.call(graphBinding(r1, "expression"), UNDEFINED, [], at);
checkGraph(foreignAllocation.type === "normal" && graphObject(foreignAllocation.value).getPrototypeOf() === r1.objectPrototype && foreignActive.calls === 0, "G11 foreign body uses defining Realm");
checkGraph(foreignActive.context === foreignContext && foreignContext.realm === r2, "R2 stable context restored");
// G14/C: Array conversion is empty text; Function uses source; Object retains its tag.
for (const name of [
    "numericObject", "numericArray", "numericFunction",
    "additionObject", "additionArray", "additionFunction",
    "keyObject", "keyArray", "keyFunction",
    "lengthObject", "lengthArray", "lengthFunction",
]) {
    const completion = active.context.call(graphBinding(r1, name), UNDEFINED, [], at);
    if (name === "lengthArray") {
        checkGraph(completion.type === "normal" && sameValue(graphObject(graphBinding(r1, "array")).get("length", active.context, at), numberValue(0)), "G14 Array length zero");
    } else if (name.startsWith("length")) {
        checkGraph(completion.type === "throw" && completion.diagnostic.name === "RangeError" && completion.diagnostic.message === "invalid array length" && completion.diagnostic.loc.line > 1, "G14 invalid length " + name);
    } else {
        checkGraph(completion.type === "normal", "G14 default conversion " + name);
        if (completion.type !== "normal") throw new Error("G14 completion");
        const tag = name.endsWith("Object") ? "Object" : name.endsWith("Array") ? "Array" : "Function";
        if (name.startsWith("numeric")) checkGraph(completion.value.kind === "number" && (tag === "Array" ? sameValue(completion.value, numberValue(0)) : Number.isNaN(completion.value.value)), "G14 numeric default");
        if (name.startsWith("addition")) checkGraph(completion.value.kind === "string" && completion.value.value === (tag === "Array" ? "1" : tag === "Function" ? "function () { return {}; }1" : "[object " + tag + "]1"), "G14 addition default");
        if (name.startsWith("key")) checkGraph(completion.value.kind === "undefined", "G14 absent converted key (Function uses source)");
    }
    checkGraph(active.calls === 0, "G14 cleanup");
}
const numberCall = active.context.call(graphBinding(r1, "numberCall"), UNDEFINED, [], at);
checkGraph(numberCall.type === "throw" && numberCall.diagnostic.name === "TypeError" && numberCall.diagnostic.message === "value is not callable", "G9 Number remains namespace");

// W1-W4/W14/W17/W18: explicit boxing and immutable scalar payloads.
const boxA = new Realm((_line) => { throw new Error("W18 unexpected bootstrap output"); });
const boxB = new Realm((_line) => { throw new Error("W18 unexpected bootstrap output"); });
const boxC = new Realm((_line) => { throw new Error("W18 unexpected bootstrap output"); });
const boxEvaluator = new Evaluator(boxA);
const zeroHookContext: OperationContext = {
    realm: boxA,
    // Explicit return types avoid scriptc's never-return callback adapters.
    // The reduced inferred/explicit comparison is retained with TS-018A evidence.
    call: (_callee, _receiver, _args, _loc): ValueCompletion => { throw new Error("boxing called guest code"); },
    tick: (_loc): ValueCompletion => { throw new Error("boxing ticked"); },
};
function box(input: Value, context: OperationContext = zeroHookContext): GuestObject {
    const converted = toObject(input, context, at);
    if (converted.type !== "normal") throw new Error("unexpected boxing failure");
    return converted.value;
}
for (const realm of [boxA, boxB]) {
    const roots: GuestObject[] = [realm.booleanPrototype, realm.numberPrototype, realm.stringPrototype];
    for (const root of roots) {
        checkGraph(root.getPrototypeOf() === realm.objectPrototype && root.callable === null && root.isExtensible(), "W1 root graph/flags");
        checkGraph(root.get("valueOf", zeroHookContext, at) !== realm.objectPrototype.get("valueOf", zeroHookContext, at), "N roots own payload valueOf");
        for (const key of ["constructor"]) {
            checkGraph(root.get(key, zeroHookContext, at).kind === "undefined", "W17 missing wrapper methods");
        }
    }
    checkGraph(!realm.booleanPrototype.booleanData && 1 / realm.numberPrototype.numberData === Infinity && realm.stringPrototype.stringData === "", "W1 root payloads");
    checkGraph(stringKeys(realm.booleanPrototype.ownPropertyKeys()).join(",") === "toString,valueOf" && stringKeys(realm.numberPrototype.ownPropertyKeys()).join(",") === "toString,valueOf" && stringKeys(realm.stringPrototype.ownPropertyKeys()).join(",") === "length,toString,valueOf", "M1 root keys");
    checkGraph(stringKeys(realm.objectPrototype.ownPropertyKeys()).join(",") === "valueOf,toString" && stringKeys(realm.functionPrototype.ownPropertyKeys()).join(",") === "name,length,call,toString" && stringKeys(realm.arrayPrototype.ownPropertyKeys()).join(",") === "length,join,toString,push,pop,reverse,indexOf,includes", "W1 original root keys");
    for (const name of ["Object", "Boolean", "String"]) checkGraph(!realm.global.bindings.has(name), "W17 no new globals");
    const namespace = graphObject(graphBinding(realm, "Number"));
    checkGraph(namespace !== realm.numberPrototype && namespace.getPrototypeOf() === realm.objectPrototype && namespace.callable === null, "W1 Number namespace preserved");
}
checkGraph(boxA.booleanPrototype !== boxB.booleanPrototype && boxA.numberPrototype !== boxB.numberPrototype && boxA.stringPrototype !== boxB.stringPrototype, "W1 independent roots");
const primitives: Value[] = [
    { kind: "boolean", value: false }, { kind: "boolean", value: true },
    numberValue(0), numberValue(-0), numberValue(NaN), numberValue(Infinity), numberValue(-Infinity),
    { kind: "string", value: "" }, { kind: "string", value: "ab" },
];
for (const primitive of primitives) {
    const firstBox = box(primitive);
    const secondBox = box(primitive);
    checkGraph(firstBox !== secondBox && truthy({ kind: "object", object: firstBox }), "W2 fresh truthy boxes");
    if (primitive.kind === "boolean") {
        checkGraph(firstBox instanceof GuestBoolean && firstBox.booleanData === primitive.value && firstBox.getPrototypeOf() === boxA.booleanPrototype, "W2 Boolean payload/root");
    } else if (primitive.kind === "number") {
        checkGraph(firstBox instanceof GuestNumber && sameValue(numberValue(firstBox.numberData), primitive) && firstBox.getPrototypeOf() === boxA.numberPrototype, "W2 Number payload/root");
    } else if (primitive.kind === "string") {
        checkGraph(firstBox instanceof GuestStringObject && firstBox.stringData === primitive.value && firstBox.getPrototypeOf() === boxA.stringPrototype, "W2 String payload/root");
    }
}
class NoBoxReads extends GuestObject {
    internalGet(_key: PropertyKey, _receiver: Value, context: OperationContext, _loc: { line: number; column: number }): ValueCompletion {
        throw new Error("W3 boxing read an object");
    }
}
const existingBoxes: GuestObject[] = [
    boxA.createObject(), boxA.createArray(), boxA.functionPrototype,
    boxA.createStringObject("ab"), boxB.createNumberObject(-0), new GuestObject(), new NoBoxReads(),
];
for (const object of existingBoxes) {
    const prototype = object.getPrototypeOf();
    const keys = stringKeys(object.ownPropertyKeys()).join(",");
    checkGraph(box({ kind: "object", object }) === object && object.getPrototypeOf() === prototype && stringKeys(object.ownPropertyKeys()).join(",") === keys, "W3 exact identity/chain/state");
}
for (const input of [UNDEFINED, { kind: "null" } as const]) {
    const converted = toObject(input, zeroHookContext, at);
    checkGraph(converted.type === "throw" && converted.diagnostic.name === "TypeError"
        && converted.diagnostic.phase === "runtime" && converted.diagnostic.message === "cannot convert null or undefined to object"
        && converted.diagnostic.loc === at && sameValue(converted.value, { kind: "string", value: "TypeError: cannot convert null or undefined to object" }), "W4 exact nullish error");
}
checkGraph(boxEvaluator.steps === 0 && boxEvaluator.calls === 0 && boxEvaluator.depth === 0 && boxEvaluator.context.realm === boxA, "W3/W4 no execution work");
const booleanPayload = boxA.createBooleanObject(false);
const numberPayload = boxA.createNumberObject(-0);
booleanPayload.bootstrapDefine("booleanData", { value: numberValue(99) });
numberPayload.bootstrapDefine("numberData", { value: numberValue(99) });
booleanPayload.setPrototypeOf(null);
numberPayload.setPrototypeOf(null);
checkGraph(!booleanPayload.booleanData && 1 / numberPayload.numberData === -Infinity, "W14 Boolean/Number scalar slots");
for (const wrapper of [boxA.createBooleanObject(false), boxA.createNumberObject(0), boxA.createStringObject("ab")]) {
    const value: Value = { kind: "object", object: wrapper };
    const missing = toPrimitive(value, "number", boxEvaluator.context, at);
    const expected: Value = wrapper instanceof GuestBoolean ? { kind: "boolean", value: false }
        : wrapper instanceof GuestNumber ? numberValue(0) : { kind: "string", value: "ab" };
    checkGraph(missing.type === "normal" && sameValue(missing.value, expected), "N numeric hints extract primitive slots");
    const hook = boxA.createBuiltin("trap", 0, (_receiver, _args, _context, _loc): ValueCompletion => { throw new Error("W17 direct converter hook"); });
    wrapper.bootstrapDefine("valueOf", { value: { kind: "object", object: hook } });
    wrapper.bootstrapDefine("toString", { value: { kind: "object", object: hook } });
    const before = boxEvaluator.steps;
    for (const converted of [toNumber(value, at, null), toUint32(value, at, null), toIntegerOrInfinity(value, at, null), toLength(value, at, null), toString(value, at, null)]) {
        checkGraph(converted.type === "throw" && converted.diagnostic.message === "object-to-primitive conversion unsupported" && converted.diagnostic.loc === at, "W17 direct converter rejects wrapper");
    }
    checkGraph(boxEvaluator.steps === before && boxEvaluator.calls === 0, "W17 direct conversion zero hooks");
}
for (const source of ["'ab'[0];", "false.x;", "(1).x;"]) {
    const parsed = parse(source);
    checkGraph(parsed.error === null, "W17 read parse");
    const completion = boxEvaluator.statement(parsed.body[0], boxA.global, UNDEFINED);
    const expected: Value = source === "'ab'[0];" ? { kind: "string", value: "a" } : UNDEFINED;
    checkGraph(completion.type === "normal" && sameValue(completion.value, expected), "W17 primitive read");
}
const stringRootKeysBeforeWrite = boxA.stringPrototype.ownPropertyKeys().length;
const stringRootParentBeforeWrite = boxA.stringPrototype.getPrototypeOf();
for (const source of ["'ab'[0] = 'z';"]) {
    const rejected = run(source, boxA);
    checkGraph(rejected.phase === "runtime" && rejected.completion.type === "throw" && rejected.completion.diagnostic.name === "TypeError" && rejected.completion.diagnostic.message === "property is not writable: 0", "W17 primitive write still rejected");
    checkGraph(boxA.stringPrototype.stringData === "" && boxA.stringPrototype.ownPropertyKeys().length === stringRootKeysBeforeWrite && boxA.stringPrototype.getPrototypeOf() === stringRootParentBeforeWrite, "W17 rejected write preserves String root/payload");
}

// W15: a saved context follows B -> C -> B, and finally restores A.
const entry = new Evaluator(boxA, 1, 2);
const boxTrace: string[] = [];
const boxes: GuestObject[] = [];
const inC = boxC.createBuiltin("boxC", 0, (_receiver, _args, context, _loc) => {
    checkGraph(context === entry.context && context.realm === boxC && entry.calls === 2, "W15 C context/shared calls");
    boxTrace.push("C");
    const allocated = box({ kind: "string", value: "c" }, context);
    boxes.push(allocated);
    return normal({ kind: "object", object: allocated });
});
const inB = boxB.createBuiltin("boxB", 0, (_receiver, _args, context, loc) => {
    checkGraph(context.realm === boxB && entry.calls === 1, "W15 B entry");
    const saved = context;
    boxTrace.push("B");
    boxes.push(box(numberValue(-0), saved));
    const nested = context.call({ kind: "object", object: inC }, UNDEFINED, [], loc);
    checkGraph(nested.type === "normal" && nested.value.kind === "object" && nested.value.object === boxes[1], "W15 returned C identity");
    checkGraph(saved.realm === boxB && entry.calls === 1, "W15 B continuation");
    boxTrace.push("B");
    const allocated = box({ kind: "boolean", value: false }, saved);
    boxes.push(allocated);
    return normal({ kind: "object", object: allocated });
});
const boxedResult = entry.call({ kind: "object", object: inB }, UNDEFINED, [], at);
checkGraph(boxedResult.type === "normal" && boxedResult.value.kind === "object" && boxedResult.value.object === boxes[2], "W15 returned B identity");
checkGraph(boxTrace.join(",") === "B,C,B" && boxes[0].getPrototypeOf() === boxB.numberPrototype && boxes[1].getPrototypeOf() === boxC.stringPrototype && boxes[2].getPrototypeOf() === boxB.booleanPrototype, "W15 allocation roots");
checkGraph(entry.context.realm === boxA && entry.calls === 0 && entry.depth === 0 && entry.steps === 0, "W15 normal cleanup/no boxing ticks");
const boxSentinel = failure("Sentinel", "boxing guest throw", at);
for (const mode of ["guest", "host"]) {
    const abruptBox = boxB.createBuiltin("abruptBox", 0, (_receiver, _args, context, _loc) => {
        checkGraph(box(numberValue(1), context).getPrototypeOf() === boxB.numberPrototype, "W15 abrupt allocation root");
        if (mode === "host") throw new Error("W15 host fault");
        return boxSentinel;
    });
    let hostEscaped = false;
    if (mode === "guest") {
        const completion = entry.call({ kind: "object", object: abruptBox }, UNDEFINED, [], at);
        checkGraph(completion === boxSentinel, "W15 exact guest throw");
    } else {
        try {
            entry.call({ kind: "object", object: abruptBox }, UNDEFINED, [], at);
        } catch (error) {
            hostEscaped = error instanceof Error && error.message === "W15 host fault";
        }
    }
    checkGraph(hostEscaped === (mode === "host") && entry.context.realm === boxA && entry.calls === 0 && entry.depth === 0 && entry.steps === 0, "W15 abrupt cleanup");
}
const limitedBoxes = new Evaluator(boxA, 0, 1);
const limitBridge = boxB.createBuiltin("limit", 0, (_receiver, _args, context, loc) => {
    checkGraph(box(numberValue(1), context).getPrototypeOf() === boxB.numberPrototype, "W15 boxing with exhausted step budget");
    return context.call({ kind: "object", object: inC }, UNDEFINED, [], loc);
});
const limitedResult = limitedBoxes.call({ kind: "object", object: limitBridge }, UNDEFINED, [], at);
checkGraph(limitedResult.type === "throw" && limitedResult.diagnostic.message === "call depth limit exceeded" && limitedResult.diagnostic.loc === at, "W15 shared call guard");
checkGraph(limitedBoxes.steps === 0 && limitedBoxes.calls === 0 && limitedBoxes.context.realm === boxA, "W15 limited cleanup");
const stepBridge = boxB.createBuiltin("step", 0, (_receiver, _args, context, loc) => {
    box(numberValue(2), context);
    return context.tick(loc);
});
const exhaustedStep = limitedBoxes.call({ kind: "object", object: stepBridge }, UNDEFINED, [], at);
checkGraph(exhaustedStep.type === "throw" && exhaustedStep.diagnostic.message === "execution step limit exceeded" && limitedBoxes.steps === 1 && limitedBoxes.context.realm === boxA && limitedBoxes.calls === 0, "W15 monotonic step budget");
console.log("realms independent");
