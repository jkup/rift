import { readFileSync } from "node:fs";
import { mapObjectDefaultArray } from "../src/array-map.js";
import { GuestArray } from "../src/array-object.js";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import {
    GuestObject, UNDEFINED, failure, normal, sameValue,
    type Builtin, type Completion, type InternalBooleanCompletion,
    type OperationContext, type Value, type ValueCompletion,
} from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void {
    if (!ok) throw new Error(message);
}
const loc: Location = { line: 71, column: 9 };
const sentinel = failure("Sentinel", "original", loc);
const trace: string[] = [];

function obj(object: GuestObject): Value {
    return { kind: "object", object };
}
function num(value: number): Value {
    return { kind: "number", value };
}
function put(object: GuestObject, key: string, value: Value): void {
    object.bootstrapDefine(key, { value: value, writable: true, enumerable: true, configurable: true });
}
function builtin(realm: Realm, invoke: Builtin): Value {
    const object = new GuestObject(null, false, { kind: "builtin", realm, invoke });
    return obj(object);
}
function error(completion: Completion, name: string, at: Location = loc): void {
    check(
        completion.type === "throw" && completion.diagnostic.phase === "runtime" &&
        completion.diagnostic.name === name && completion.diagnostic.loc === at,
        "error phase/name/location " + name,
    );
}
function result(completion: Completion, length: number, expectedRealm: Realm = realm): GuestObject {
    if (completion.type !== "normal" || completion.value.kind !== "object") {
        throw new Error("expected map result");
    }
    const object = completion.value.object;
    const descriptor = object.getOwnProperty("length");
    check(
        object instanceof GuestArray && descriptor !== undefined &&
        sameValue(descriptor.value, num(length)) && descriptor.writable &&
        !descriptor.enumerable && !descriptor.configurable,
        "result array length/flags",
    );
    check(object.getPrototypeOf() === expectedRealm.arrayPrototype, "result Realm array prototype");
    return object;
}
function element(object: GuestObject, key: string, value: Value): void {
    const descriptor = object.getOwnProperty(key);
    check(
        descriptor !== undefined && sameValue(descriptor.value, value) &&
        descriptor.writable && descriptor.enumerable && descriptor.configurable,
        "own element " + key,
    );
}
function hole(object: GuestObject, key: string): void {
    check(object.getOwnProperty(key) === undefined, "hole " + key);
}

// Synthetic overrides observe boundaries only; ordinary data supplies values.
class Traced extends GuestObject {
    failGet = "";
    failHas = "";
    internalGet(key: string, receiver: Value, at: Location): ValueCompletion {
        trace.push("Get " + key);
        check(receiver.kind === "object" && receiver.object === this && at === loc, "Get receiver/location");
        return key === this.failGet ? sentinel : super.internalGet(key, receiver, at);
    }
    internalHasProperty(key: string, at: Location): InternalBooleanCompletion {
        trace.push("Has " + key);
        check(at === loc, "Has location");
        return key === this.failHas ? sentinel : super.internalHasProperty(key, at);
    }
}
class TracedArray extends GuestArray {
    failConstructor = false;
    internalGet(key: string, receiver: Value, at: Location): ValueCompletion {
        trace.push("Get " + key);
        check(receiver.kind === "object" && receiver.object === this && at === loc, "array receiver/location");
        return key === "constructor" && this.failConstructor ? sentinel : super.internalGet(key, receiver, at);
    }
}
function traceIs(expected: string): void {
    check(trace.join(",") === expected, "trace: " + trace.join(",") + " expected " + expected);
    trace.length = 0;
}

// Only this test realm installs the object-only adapter.
const fault = new Error("host fault");
let outputFault = false;
const realm = new Realm((_line) => {
    if (outputFault) throw fault;
});
const host = new GuestObject();
realm.global.bindings.set("host", { initialized: true, mutable: true, value: obj(host) });
const contexts: OperationContext[] = [];
const adapter = realm.registerBuiltin(host, "__testMapObjectDefaultArray", 3, (_receiver, args, context, at) => {
    const input = args[0] ?? UNDEFINED;
    if (input.kind !== "object") return failure("TypeError", "object-only test map entry", at);
    return mapObjectDefaultArray(input.object, args[1] ?? UNDEFINED, args[2] ?? UNDEFINED, context, at);
});
function program(source: string, evaluator: Evaluator): Completion {
    const parsed = parse(source);
    check(parsed.error === null, "fixture parse");
    return evaluator.block(parsed.body, realm.global, UNDEFINED);
}
const setup = new Evaluator(realm);
check(program(readFileSync("test/fixtures/array-map/callbacks.js", "utf8"), setup).type === "normal", "fixture setup");
function binding(name: string): Value {
    const entry = realm.global.bindings.get(name);
    if (entry === undefined) throw new Error(name);
    return entry.value;
}
const identity = binding("identity");
function map(
    object: GuestObject,
    callback: Value = identity,
    receiver: Value = UNDEFINED,
    evaluator: Evaluator = new Evaluator(realm),
): ValueCompletion {
    return evaluator.call(adapter, UNDEFINED, [obj(object), callback, receiver], loc);
}
function ordinary(length: Value): GuestObject {
    const object = new GuestObject();
    put(object, "length", length);
    return object;
}

// Entry validation rejects every representable primitive, including omission.
for (const primitive of [
    UNDEFINED, { kind: "null" } as const, num(1),
    { kind: "boolean", value: true } as const,
    { kind: "string", value: "abc" } as const,
]) {
    error(setup.call(adapter, UNDEFINED, [primitive, identity], loc), "TypeError");
}
error(setup.call(adapter, UNDEFINED, [], loc), "TypeError");

// Length is read and converted before callback validation, even for zero.
const lengthInput = new Traced();
lengthInput.failGet = "length";
check(map(lengthInput, UNDEFINED) === sentinel, "length exact throw");
traceIs("Get length");
lengthInput.failGet = "";
for (const length of [
    obj(new GuestObject()), UNDEFINED, num(-1), num(NaN),
    { kind: "string", value: "0" } as const,
]) {
    put(lengthInput, "length", length);
    error(map(lengthInput, UNDEFINED), "TypeError");
    traceIs("Get length");
}
put(lengthInput, "length", { kind: "string", value: "2.9" });
put(lengthInput, "0", num(4));
put(lengthInput, "1", num(5));
put(lengthInput, "2", num(6));
const doubled = result(map(lengthInput, binding("double")), 2);
element(doubled, "0", num(8));
element(doubled, "1", num(10));
hole(doubled, "2");
traceIs("Get length,Has 0,Get 0,Has 1,Get 1");

// Empty maps allocate fresh results without spending an index tick.
const emptyInput = new Traced();
put(emptyInput, "length", num(0));
const zeroBudget = new Evaluator(realm, 0);
const firstEmptyResult = result(map(emptyInput, identity, UNDEFINED, zeroBudget), 0);
traceIs("Get length");
const secondEmptyResult = result(map(emptyInput), 0);
traceIs("Get length");
check(firstEmptyResult !== secondEmptyResult && zeroBudget.steps === 0, "fresh empty/no ticks");

// Ordinary inputs skip constructor; arrays read it after callback validation.
const generic = new Traced();
put(generic, "length", num(1));
put(generic, "constructor", num(7));
result(map(generic), 1);
traceIs("Get length,Has 0");
for (const inherited of [false, true]) {
    const array = new TracedArray();
    if (inherited) {
        const constructorPrototype = new GuestObject();
        put(constructorPrototype, "constructor", UNDEFINED);
        array.setPrototypeOf(constructorPrototype);
    } else {
        put(array, "constructor", UNDEFINED);
    }
    result(map(array), 0);
    traceIs("Get length,Get constructor");
}
const constructorInput = new TracedArray();
constructorInput.failConstructor = true;
error(map(constructorInput, UNDEFINED), "TypeError");
traceIs("Get length");
check(map(constructorInput) === sentinel, "constructor exact throw");
traceIs("Get length,Get constructor");
constructorInput.failConstructor = false;
for (const constructorValue of [{ kind: "null" } as const, num(7), obj(new Traced())]) {
    put(constructorInput, "constructor", constructorValue);
    error(map(constructorInput), "TypeError");
    traceIs("Get length,Get constructor");
}

// Oversized allocation fails after callback validation, before index access.
for (const length of [4294967296, Infinity]) {
    put(generic, "length", num(length));
    error(map(generic), "RangeError");
    traceIs("Get length");
    error(map(generic, UNDEFINED), "TypeError");
    traceIs("Get length");
}
const huge = new Traced();
put(huge, "length", num(4294967295));
const sparseBudget = new Evaluator(realm, 3);
error(map(huge, identity, UNDEFINED, sparseBudget), "RangeError");
traceIs("Get length,Has 0,Has 1,Has 2");
check(sparseBudget.steps === 4 && sparseBudget.calls === 0, "huge budget");

// Presence distinguishes own undefined, a hole, and an inherited element.
const sparse = ordinary(num(3));
put(sparse, "0", UNDEFINED);
const elementPrototype = new GuestObject();
put(elementPrototype, "2", num(7));
sparse.setPrototypeOf(elementPrototype);
let visits = 0;
const observe = builtin(realm, (_receiver, args, _context, at) => {
    check(
        at === loc && args.length === 3 && args[1].kind === "number" &&
        args[1].value === (visits === 0 ? 0 : 2) &&
        args[2].kind === "object" && args[2].object === sparse,
        "sparse args",
    );
    visits++;
    return normal(args[0]);
});
const sparseResult = result(map(sparse, observe), 3);
element(sparseResult, "0", UNDEFINED);
hole(sparseResult, "1");
element(sparseResult, "2", num(7));
check(visits === 2, "two sparse calls");
const trailing = ordinary(num(3));
put(trailing, "0", num(1));
const trailingResult = result(map(trailing, binding("empty")), 3);
element(trailingResult, "0", UNDEFINED);
hole(trailingResult, "1");
hole(trailingResult, "2");

// Callbacks can change future values and fill holes, but cannot grow the bound.
const mutated = ordinary(num(3));
put(mutated, "0", num(1));
put(mutated, "1", num(2));
const mutatedResult = result(map(mutated, binding("mutate")), 3);
element(mutatedResult, "0", num(1));
element(mutatedResult, "1", num(20));
element(mutatedResult, "2", num(30));
hole(mutatedResult, "3");

// Deletion skips an absent future index or exposes its inherited fallback.
for (const inherited of [false, true]) {
    const deletionInput = ordinary(num(2));
    put(deletionInput, "0", num(1));
    put(deletionInput, "1", num(2));
    if (inherited) {
        const deletionPrototype = new GuestObject();
        put(deletionPrototype, "1", num(9));
        deletionInput.setPrototypeOf(deletionPrototype);
    }
    const deleting = builtin(realm, (_receiver, args, _context, _at) => {
        if (sameValue(args[1], num(0))) {
            const deleted = deletionInput.internalDelete("1");
            check(deleted.type === "normal" && deleted.value, "delete");
        }
        return normal(args[0]);
    });
    const deletionResult = result(map(deletionInput, deleting), 2);
    if (inherited) {
        element(deletionResult, "1", num(9));
    } else {
        hole(deletionResult, "1");
    }
}

// Shrinking the source array still leaves inherited future elements visible.
const shrinking = new GuestArray();
put(shrinking, "0", num(1));
put(shrinking, "1", num(2));
put(shrinking, "2", num(3));
shrinking.setPrototypeOf(elementPrototype);
const shrinkResult = result(map(shrinking, binding("shrink")), 3);
hole(shrinkResult, "1");
element(shrinkResult, "2", num(7));
check(sameValue(shrinking.get("length"), num(1)), "shrink source");

// Guest callbacks receive the exact strict thisArg, including omitted undefined.
const singleElement = ordinary(num(1));
put(singleElement, "0", obj(new GuestObject()));
for (const receiver of [obj(new GuestObject()), num(4), { kind: "null" } as const, UNDEFINED]) {
    element(result(map(singleElement, binding("receiver"), receiver), 1), "0", receiver);
}
element(
    result(setup.call(adapter, UNDEFINED, [obj(singleElement), binding("receiver")], loc), 1),
    "0", UNDEFINED,
);

// Retained lexical state survives runs while callbacks use the current context.
let observed = 0;
realm.registerBuiltin(host, "observe", 5, (_receiver, args, context, _at) => {
    observed++;
    check(
        args[0] === singleElement.get("0") && sameValue(args[1], num(0)) &&
        args[2].kind === "object" && args[2].object === singleElement &&
        args[3] === UNDEFINED && sameValue(args[4], num(observed)),
        "guest retained closure args",
    );
    contexts.push(context);
    return normal();
});
const firstRun = new Evaluator(realm);
const secondRun = new Evaluator(realm);
const firstResult = result(map(singleElement, binding("saved"), UNDEFINED, firstRun), 1);
const secondResult = result(map(singleElement, binding("saved"), UNDEFINED, secondRun), 1);
element(firstResult, "0", singleElement.get("0"));
check(
    firstResult !== secondResult && observed === 2 &&
    contexts[0] === firstRun.context && contexts[1] === secondRun.context,
    "current run retained closure",
);
put(firstResult, "0", num(99));
element(secondResult, "0", singleElement.get("0"));

// Has/Get throws preserve the exact record and stop after prior callback effects.
const throwing = new Traced();
put(throwing, "length", num(3));
put(throwing, "0", num(10));
put(throwing, "1", num(11));
put(throwing, "2", num(12));
let effects = 0;
const tracedCallback = builtin(realm, (_receiver, args, _context, _at) => {
    trace.push("Call");
    effects++;
    return normal(args[0]);
});
for (const boundary of ["Has", "Get"]) {
    effects = 0;
    throwing.failHas = boundary === "Has" ? "1" : "";
    throwing.failGet = boundary === "Get" ? "1" : "";
    const abrupt = map(throwing, tracedCallback);
    check(
        abrupt === sentinel && abrupt.value === sentinel.value &&
        abrupt.diagnostic === sentinel.diagnostic && effects === 1,
        "exact boundary abrupt",
    );
    traceIs("Get length,Has 0,Get 0,Call,Has 1" + (boundary === "Get" ? ",Get 1" : ""));
}
throwing.failHas = "";
throwing.failGet = "";

// Guest throws retain the source location and stop before the next index.
put(host, "sentinel", obj(new GuestObject()));
realm.registerBuiltin(host, "effect", 1, (_receiver, args, _context, _at) => {
    trace.push("Effect " + (args[0].kind === "number" ? String(args[0].value) : "bad"));
    return normal();
});
const thrown = map(throwing, binding("throwing"));
check(
    thrown.type === "throw" && thrown.value === host.get("sentinel") &&
    thrown.diagnostic.phase === "runtime" && thrown.diagnostic.name === "Uncaught" &&
    thrown.diagnostic.loc.line === 50 && thrown.diagnostic.loc.column === 9,
    "guest throw value/location",
);
traceIs("Get length,Has 0,Get 0,Effect 0,Has 1,Get 1,Effect 1");
const bridge = builtin(realm, (_receiver, _args, _context, _at) => sentinel);
check(map(singleElement, bridge) === sentinel, "callback exact record");

// Pure builtin callbacks are bounded even when they spend no guest AST ticks.
let constants = 0;
const constant = builtin(realm, (_receiver, _args, _context, _at) => {
    constants++;
    return normal(num(42));
});
const dense = ordinary(num(5));
for (let i = 0; i < 5; i++) {
    put(dense, String(i), num(i));
}
const builtinBudget = new Evaluator(realm, 3);
error(map(dense, constant, UNDEFINED, builtinBudget), "RangeError");
check(constants === 3 && builtinBudget.steps === 4 && builtinBudget.calls === 0, "builtin loop bounded");

// Reentrant maps share ticks: outer index 0, inner holes 0/1, then exhaustion.
const inner = new Traced();
put(inner, "length", num(3));
const nestedBudget = new Evaluator(realm, 3);
const reenter = builtin(realm, (_receiver, _args, context, at) => {
    check(context === nestedBudget.context && nestedBudget.calls === 2, "nested same context");
    return context.call(adapter, UNDEFINED, [obj(inner), constant], at);
});
error(map(dense, reenter, UNDEFINED, nestedBudget), "RangeError");
traceIs("Get length,Has 0,Has 1");
check(nestedBudget.steps === 4 && nestedBudget.calls === 0 && constants === 3, "nested exact ticks");

// Guest reentry also shares the active call-depth limit.
put(host, "input", obj(singleElement));
const recursiveBudget = new Evaluator(realm, 1000, 4);
const recursion = map(singleElement, binding("recursive"), UNDEFINED, recursiveBudget);
check(
    recursion.type === "throw" && recursion.diagnostic.phase === "runtime" &&
    recursion.diagnostic.name === "RangeError" && recursion.diagnostic.loc.line === 56 &&
    recursiveBudget.calls === 0,
    "recursive map call limit",
);

// Host faults and invalid completions escape while active call slots unwind.
for (const kind of ["fault", "return", "break", "continue", "output"]) {
    const faultEvaluator = new Evaluator(realm);
    let escaped = false;
    const faultCallback = kind === "output" ? binding("output") : builtin(realm, (_receiver, _args, _context, _at): Completion => {
        if (kind === "fault") throw fault;
        if (kind === "return") return { type: "return", value: UNDEFINED };
        if (kind === "break") return { type: "break", value: UNDEFINED };
        return { type: "continue", value: UNDEFINED };
    });
    outputFault = kind === "output";
    try {
        map(singleElement, faultCallback, UNDEFINED, faultEvaluator);
    } catch (caught) {
        escaped = caught instanceof Error && (kind === "fault" || kind === "output"
            ? caught === fault
            : caught.message === "invalid completion escaped call boundary: " + kind);
    }
    check(escaped && faultEvaluator.calls === 0, "map host fault cleanup " + kind);
    outputFault = false;
    result(map(singleElement, identity, UNDEFINED, faultEvaluator), 1);
}

// A second realm has its own active context and independent result storage.
const otherRealm = new Realm((_line) => {});
const otherEvaluator = new Evaluator(otherRealm);
let expectedOtherContext = otherEvaluator.context;
const otherCallback = builtin(otherRealm, (_receiver, args, context, _at) => {
    check(context.realm === otherRealm && context === expectedOtherContext, "other active realm");
    return normal(args[0]);
});
const otherResult = result(map(singleElement, otherCallback, UNDEFINED, otherEvaluator), 1, realm);
const foreignCallbackEvaluator = new Evaluator(realm);
expectedOtherContext = foreignCallbackEvaluator.context;
const foreignCallbackResult = foreignCallbackEvaluator.call(otherCallback, UNDEFINED, [singleElement.get("0")], loc);
check(foreignCallbackResult.type === "normal" && foreignCallbackResult.value === singleElement.get("0") && foreignCallbackEvaluator.context.realm === realm, "explicit callback owner from foreign evaluator");
put(otherResult, "0", num(8));
element(secondResult, "0", singleElement.get("0"));
check(!otherRealm.global.bindings.has("host") && firstRun.context !== otherEvaluator.context, "realm independent storage/registration");

// Same-name errors still identify the earlier no-method conversion boundary.
const absentLength = new Traced();
error(map(absentLength, obj(new GuestObject())), "TypeError");
traceIs("Get length");
put(absentLength, "length", obj(new GuestObject()));
const conversionError = map(absentLength, UNDEFINED);
check(
    conversionError.type === "throw" && conversionError.diagnostic.message === "cannot convert object to primitive",
    "conversion error precedes callback validation",
);
traceIs("Get length");
const convertibleLength = new GuestObject();
let lengthHooks = 0;
put(convertibleLength, "valueOf", builtin(realm, (_receiver, _args, _context, _at) => {
    lengthHooks++;
    return normal(num(0));
}));
put(absentLength, "length", obj(convertibleLength));
const callbackError = map(absentLength, UNDEFINED);
check(callbackError.type === "throw" && callbackError.diagnostic.message === "map callback is not callable" && lengthHooks === 1, "successful length conversion precedes callback failure");
traceIs("Get length");
const inheritedUndefined = ordinary(num(1));
const undefinedPrototype = new GuestObject();
put(undefinedPrototype, "0", UNDEFINED);
inheritedUndefined.setPrototypeOf(undefinedPrototype);
element(result(map(inheritedUndefined), 1), "0", UNDEFINED);

// Capture the actual guest throw to assert record and diagnostic identity.
let captured: ValueCompletion = normal();
const captureGuest = builtin(realm, (receiver, args, context, at) => {
    captured = context.call(binding("throwing"), receiver, args, at);
    return captured;
});
const exactGuest = map(throwing, captureGuest);
check(
    exactGuest === captured && exactGuest.type === "throw" && captured.type === "throw" &&
    exactGuest.value === captured.value && exactGuest.diagnostic === captured.diagnostic,
    "exact guest throw record/diagnostic",
);
traceIs("Get length,Has 0,Get 0,Effect 0,Has 1,Get 1,Effect 1");

// Recovery inside an outer call restores its prior active count, not just zero.
const recoveryEvaluator = new Evaluator(realm);
const hostFaultCallback = builtin(realm, (_receiver, _args, _context, _at): Completion => {
    throw fault;
});
const recovery = builtin(realm, (_receiver, _args, context, at) => {
    let caught = false;
    try {
        context.call(adapter, UNDEFINED, [obj(singleElement), hostFaultCallback], at);
    } catch (error) {
        caught = error instanceof Error && error === fault;
    }
    check(caught && recoveryEvaluator.calls === 1, "map restores prior active calls");
    return context.call(adapter, UNDEFINED, [obj(singleElement), identity], at);
});
result(recoveryEvaluator.call(recovery, UNDEFINED, [], loc), 1);
check(recoveryEvaluator.calls === 0, "outer recovery releases calls");
console.log("array map passed");

// G12/G16: the supplied operation context selects the result Realm, independently
// of input and callback origins. Exact Values and holes survive the allocation.
const sourceRealm = new Realm((_line) => {});
const resultRealm = new Realm((_line) => {});
const resultActive = new Evaluator(resultRealm);
const sourceArray = sourceRealm.createArray();
const savedElement = obj(sourceRealm.createObject());
put(sourceArray, "0", savedElement);
put(sourceArray, "2", num(12));
const sourceGeneric = sourceRealm.createObject();
put(sourceGeneric, "length", num(3));
put(sourceGeneric, "0", savedElement);
put(sourceGeneric, "2", num(12));
for (const input of [sourceArray, sourceGeneric]) {
    const mapped = result(mapObjectDefaultArray(input, identity, UNDEFINED, resultActive.context, loc), 3, resultRealm);
    check(mapped.getPrototypeOf() === resultRealm.arrayPrototype, "G12 supplied context result prototype");
    check(mapped.get("0") === savedElement && mapped.get("2") === input.get("2"), "G12 exact returned Values");
    hole(mapped, "1");
}
check(sourceArray.getPrototypeOf() === sourceRealm.arrayPrototype && sourceGeneric.getPrototypeOf() === sourceRealm.objectPrototype, "G12 input chains unchanged");
// G13 extends the existing traced ordering tests to inherited Realm roots.
for (const constructorValue of [UNDEFINED, { kind: "null" } as const, num(7), obj(sourceRealm.createObject())]) {
    put(sourceRealm.arrayPrototype, "constructor", constructorValue);
    const mapped = mapObjectDefaultArray(sourceArray, identity, UNDEFINED, resultActive.context, loc);
    if (constructorValue.kind === "undefined") {
        check(result(mapped, 3, resultRealm).getPrototypeOf() === resultRealm.arrayPrototype, "G13 inherited undefined constructor");
    } else {
        check(mapped.type === "throw" && mapped.diagnostic.name === "TypeError" && mapped.diagnostic.message === "unsupported map constructor/species" && mapped.diagnostic.loc === loc, "G13 exact inherited species rejection");
    }
}
check(sourceRealm.arrayPrototype.internalDelete("constructor").type === "normal", "G13 cleanup");
put(sourceGeneric, "constructor", num(7));
check(result(mapObjectDefaultArray(sourceGeneric, identity, UNDEFINED, resultActive.context, loc), 3, resultRealm).getPrototypeOf() === resultRealm.arrayPrototype, "G13 generic ignores constructor");
const holeProgram = parse("let inheritedHoles = [,,];");
check(holeProgram.error === null, "G16 literal parse");
const holeActive = new Evaluator(sourceRealm);
check(holeActive.block(holeProgram.body, sourceRealm.global, UNDEFINED).type === "normal", "G16 literal execute");
const holesBinding = sourceRealm.global.bindings.get("inheritedHoles");
if (holesBinding === undefined || holesBinding.value.kind !== "object") throw new Error("G16 literal binding");
const inheritedHoles = holesBinding.value.object;
put(sourceRealm.arrayPrototype, "1", num(8));
hole(inheritedHoles, "0");
hole(inheritedHoles, "1");
check(sameValue(inheritedHoles.get("1"), num(8)), "G16 inherited index read");
const inheritedResult = result(mapObjectDefaultArray(inheritedHoles, identity, UNDEFINED, resultActive.context, loc), 2, resultRealm);
check(inheritedResult.getPrototypeOf() === resultRealm.arrayPrototype, "G16 result Realm");
element(inheritedResult, "1", num(8));
hole(inheritedResult, "0");
check(sourceRealm.arrayPrototype.internalDelete("1").type === "normal" && inheritedHoles.get("1").kind === "undefined" && resultRealm.arrayPrototype.get("1").kind === "undefined", "G16 deletion/isolation");
check(resultActive.calls === 0 && holeActive.calls === 0, "G15 map call cleanup");

// R17/R18: helper allocation uses its supplied active Realm; callbacks enter C.
const mapA = new Realm((_line) => {});
const mapB = new Realm((_line) => {});
const mapC = new Realm((_line) => {});
const mapEntry = new Evaluator(mapA);
class SparseInput extends GuestArray {
    override internalHasProperty(key: string, at: Location): InternalBooleanCompletion {
        check(mapEntry.context.realm === mapA, "R17 restored A between callbacks");
        return super.internalHasProperty(key, at);
    }
}
const sparseB = new SparseInput(mapB.arrayPrototype);
const firstElement = obj(mapB.createObject());
const lastElement = obj(mapA.createObject());
put(sparseB, "0", firstElement);
put(sparseB, "2", lastElement);
const callbackReceiver = obj(mapA.createObject());
const callbackIndices: number[] = [];
const identityC = builtin(mapC, (receiver, args, context, at) => {
    check(context === mapEntry.context && context.realm === mapC && at === loc, "R17 C callback stable context");
    check(receiver === callbackReceiver && args.length === 3 && args[2].kind === "object" && args[2].object === sparseB, "R17 exact receiver/input");
    if (args[1].kind !== "number") throw new Error("R17 index");
    callbackIndices.push(args[1].value);
    return normal(args[0]);
});
const directA = result(mapObjectDefaultArray(sparseB, identityC, callbackReceiver, mapEntry.context, loc), 3, mapA);
check(directA.get("0") === firstElement && directA.get("2") === lastElement && callbackIndices.join(",") === "0,2", "R17 values and indices");
hole(directA, "1");
check(sparseB.getPrototypeOf() === mapB.arrayPrototype && mapEntry.context.realm === mapA && mapEntry.calls === 0, "R17 input and restoration");
class MapInput extends GuestObject {
    override internalHasProperty(key: string, at: Location): InternalBooleanCompletion {
        check(mapEntry.context.realm === mapB, "R18 restored B between callbacks");
        return super.internalHasProperty(key, at);
    }
}
const genericA = new MapInput(mapA.objectPrototype);
put(genericA, "0", firstElement);
put(genericA, "1", lastElement);
const lengthA = mapA.createObject();
const mapTrace: string[] = [];
put(lengthA, "valueOf", builtin(mapA, (receiver, args, context, at) => {
    check(context === mapEntry.context && context.realm === mapA && at === loc && args.length === 0 && receiver.kind === "object" && receiver.object === lengthA, "R18 A length hook");
    mapTrace.push("A length");
    return normal(num(2));
}));
put(genericA, "length", obj(lengthA));
const callbackResults: Value[] = [];
const allocateC = builtin(mapC, (receiver, args, context, at) => {
    check(context === mapEntry.context && context.realm === mapC && at === loc && receiver === callbackReceiver, "R18 C allocation callback");
    check(args[2].kind === "object" && args[2].object === genericA && sameValue(args[1], num(callbackResults.length)), "R18 input/index");
    mapTrace.push("C callback");
    const allocated = obj(context.realm.createObject());
    callbackResults.push(allocated);
    return normal(allocated);
});
const mapInB = builtin(mapB, (_receiver, _args, context, at) => {
    check(context.realm === mapB, "R18 B helper entry");
    const mapped = mapObjectDefaultArray(genericA, allocateC, callbackReceiver, context, at);
    check(context.realm === mapB, "R18 B helper continuation");
    return mapped;
});
const allocatedB = result(mapEntry.call(mapInB, UNDEFINED, [], loc), 2, mapB);
check(allocatedB.get("0") === callbackResults[0] && allocatedB.get("1") === callbackResults[1], "R18 exact callback Values");
for (const value of callbackResults) {
    check(value.kind === "object" && value.object.getPrototypeOf() === mapC.objectPrototype, "R18 C element prototype");
}
check(mapTrace.join(",") === "A length,C callback,C callback" && mapEntry.context.realm === mapA && mapEntry.calls === 0 && mapEntry.depth === 0, "R18 ordering and restoration");
