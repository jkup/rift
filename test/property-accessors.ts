import { toPrimitive } from "../src/primitive-conversion.js";
import { mapObject } from "../src/array-map.js";
import { GlobalEnvironment, resolveStrictGlobalBinding, getStrictGlobalBinding, putStrictGlobalBinding } from "../src/global-environment.js";
import { ScriptDeclarativeEnvironment, resolveScriptBinding, getScriptBinding, scriptIdentifierReceiver } from "../src/script-environment.js";
import { prepareStrictScript } from "../src/script-record.js";
import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { Evaluator } from "../src/evaluator.js";
import { GuestArray } from "../src/array-object.js";
import { GuestStringObject } from "../src/primitive-objects.js";
import { GuestSymbol, formatPropertyKey, wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, getValue, putValue, type Completion, type ValueCompletion, type ThrowCompletion, type OperationContext, type Value, type PropertyKey, type PropertyDescriptorUpdate, type InternalBooleanCompletion } from "../src/runtime.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function n(value: number): Value { return { kind: "number", value }; }
function o(object: GuestObject): Value { return { kind: "object", object }; }
const loc = { line: 17, column: 3 };
const input = readFileSync(process.argv[2], "utf8").trim().split("|");
const realm = new Realm((_line) => {});
const evaluator = new Evaluator(realm);
const context = evaluator.context;
const seven = n(7), eleven = n(11);
let calls = 0;
let seen: Value = UNDEFINED;
let argumentsSeen: Value[] = [];
const getter = o(realm.createBuiltin("getter", 0, (receiver, args, _context, at) => {
    check(at === loc && args.length === 0, "getter location/args");
    calls++; seen = receiver; argumentsSeen = args; return normal(seven);
}));
const setter = o(realm.createBuiltin("setter", 1, (receiver, args, _context, at) => {
    check(at === loc && args.length === 1 && args[0] === eleven, "setter location/args");
    calls++; seen = receiver; argumentsSeen = args; return normal(o(realm.createObject()));
}));
function boolean(result: InternalBooleanCompletion, expected: boolean): void { check(result.type === "normal" && result.value === expected, "boolean"); }
function data(target: GuestObject, key: PropertyKey, value: Value, w: boolean, e: boolean, c: boolean): void {
    const d = target.getOwnProperty(key);
    check(d !== undefined && d.kind === "data" && sameValue(d.value, value) && d.writable === w && d.enumerable === e && d.configurable === c, "data descriptor");
    if (d !== undefined) { const fields: PropertyDescriptorUpdate = d; check(fields.get === undefined && fields.set === undefined, "data has no accessor fields"); }
}
function accessor(target: GuestObject, key: PropertyKey, get: Value, set: Value, e: boolean, c: boolean): void {
    const d = target.getOwnProperty(key);
    check(d !== undefined && d.kind === "accessor" && sameValue(d.get, get) && sameValue(d.set, set) && d.enumerable === e && d.configurable === c, "accessor descriptor");
    if (d !== undefined) { const fields: PropertyDescriptorUpdate = d; check(fields.value === undefined && fields.writable === undefined, "accessor has no data fields"); }
}
for (const key of ["x", new GuestSymbol(input[0])]) {
    const target = new GuestObject();
    boolean(target.defineOwnProperty(key, {}, context, loc), true);
    data(target, key, UNDEFINED, false, false, false);
    const a = new GuestObject();
    boolean(a.defineOwnProperty(key, { get: UNDEFINED }, context, loc), true);
    accessor(a, key, UNDEFINED, UNDEFINED, false, false);
    const invalid: PropertyDescriptorUpdate[] = [{ value: UNDEFINED, get: UNDEFINED }, { writable: false, set: setter }, { get: n(7) }, { set: { kind: "null" } }, { get: o(new GuestObject()) }];
    for (const update of invalid) {
        const fresh = new GuestObject(); let caught = false; const beforeCalls = calls, beforeSteps = evaluator.steps;
        try { fresh.defineOwnProperty(key, update, context, loc); } catch (error) { caught = error instanceof Error; }
        check(caught && fresh.ownPropertyKeys().length === 0, "R02 semantic");
        caught = false; try { fresh.bootstrapDefine(key, update); } catch { caught = true; }
        check(caught && fresh.ownPropertyKeys().length === 0 && calls === beforeCalls && evaluator.steps === beforeSteps, "R02 bootstrap/no calls or ticks");
    }
    const flex = new GuestObject();
    flex.bootstrapDefine(key, { value: seven, writable: true, enumerable: true, configurable: true });
    boolean(flex.defineOwnProperty(key, { get: getter }, context, loc), true);
    accessor(flex, key, getter, UNDEFINED, true, true);
    boolean(flex.defineOwnProperty(key, { value: eleven }, context, loc), true);
    data(flex, key, eleven, false, true, true);
    boolean(flex.defineOwnProperty(key, { enumerable: false }, context, loc), true);
    data(flex, key, eleven, false, false, true);
    const parent = new GuestObject(); parent.bootstrapDefine(key, { get: getter, set: setter, configurable: true });
    const child = new GuestObject(parent);
    for (const receiver of [o(child), n(3), { kind: "null" } as Value, UNDEFINED, o(new GuestObject())]) {
        const before = calls;
        const lookup = receiver.kind === "object" && receiver.object === child ? child : parent;
        const read = lookup.internalGet(key, receiver, context, loc);
        check(read.type === "normal" && read.value === seven && seen === receiver && calls === before + 1 && argumentsSeen.length === 0, "R11 receiver");
        boolean(child.internalSet(key, eleven, receiver, context, loc), true);
        check(seen === receiver && calls === before + 2 && argumentsSeen[0] === eleven && child.getOwnProperty(key) === undefined, "R12 receiver");
    }
    const abrupt = failure("TypeError", "sentinel", loc);
    const throwing = o(realm.createBuiltin("throwing", 0, (_r, _a, _c, _l) => abrupt));
    parent.bootstrapDefine(key, { get: throwing, set: throwing });
    check(child.internalGet(key, o(child), context, loc) === abrupt, "R15 get identity");
    check(child.internalSet(key, eleven, o(child), context, loc) === abrupt, "R15 set identity");
    let caught = false; try { child.get(key, context, loc); } catch (error) { caught = error instanceof Error && error.message === "abrupt host inspection: " + formatPropertyKey(key); }
    check(caught, "R33 host inspection");
}
const array = new GuestArray();
array.bootstrapDefine("2", { get: getter, configurable: true });
data(array, "length", n(3), true, false, false);
const before = calls;
boolean(array.defineOwnProperty("length", { get: getter }, context, loc), false);
boolean(array.defineOwnProperty("length", { value: n(0) }, context, loc), true);
check(calls === before && array.getOwnProperty("2") === undefined, "R17 deletion no calls");
const string = new GuestStringObject("ab");
boolean(string.defineOwnProperty("0", { get: getter }, context, loc), false);
boolean(string.defineOwnProperty("0", { value: { kind: "string", value: "a" } }, context, loc), true);
check(evaluator.steps === 0 && evaluator.calls === 0, "zero wrapper ticks and call restoration");

function value(result: Completion, expected: Value, label: string): void {
    check(result.type === "normal" && sameValue(result.value, expected), label);
}
function invariant(action: () => void, label: string): void {
    let caught = false; try { action(); } catch (error) { caught = error instanceof Error; }
    check(caught, label);
}
function referenceError(result: ValueCompletion): void { check(result.type === "throw" && result.diagnostic.name === "ReferenceError", "ReferenceError"); }
function object(result: ValueCompletion): GuestObject {
    if (result.type !== "normal" || result.value.kind !== "object") throw new Error("expected object result");
    return result.value.object;
}
const keys: PropertyKey[] = ["x", new GuestSymbol(input[0])];
for (const key of keys) {
    const startCalls = calls, startSteps = evaluator.steps;
    const fresh = new GuestObject();
    boolean(fresh.defineOwnProperty(key, { value: undefined, get: undefined, writable: undefined }, context, loc), true);
    data(fresh, key, UNDEFINED, false, false, false);
    // R03: detached snapshots and update records retain endpoint identity.
    const target = new GuestObject();
    const update: PropertyDescriptorUpdate = { get: getter, set: setter, enumerable: true, configurable: true };
    target.bootstrapDefine(key, update); update.get = UNDEFINED; update.enumerable = false;
    const snapshot = target.getOwnProperty(key);
    if (snapshot === undefined || snapshot.kind !== "accessor") throw new Error("R03 snapshot");
    check(snapshot.get === getter && snapshot.set === setter, "R03 endpoint Value identity");
    snapshot.get = UNDEFINED; snapshot.configurable = false;
    const map = target.properties, other = map.get(key);
    if (other === undefined || other.kind !== "accessor") throw new Error("R03 map");
    other.set = UNDEFINED; map.delete(key);
    accessor(target, key, getter, setter, true, true);
    const fields: PropertyDescriptorUpdate = target.getOwnProperty(key)!;
    check(fields.value === undefined && fields.writable === undefined, "R03 no data fields");
    boolean(target.defineOwnProperty(key, { get: UNDEFINED }, context, loc), true);
    accessor(target, key, UNDEFINED, setter, true, true);
    boolean(target.defineOwnProperty(key, { set: UNDEFINED }, context, loc), true);
    boolean(target.defineOwnProperty(key, {}, context, loc), true);
    accessor(target, key, UNDEFINED, UNDEFINED, true, true);
    // R06: every rejection is atomic, including the allowed endpoint neighbor.
    const frozen = new GuestObject(); frozen.bootstrapDefine(key, { get: getter, set: setter });
    boolean(frozen.defineOwnProperty(key, {}, context, loc), true);
    if (getter.kind !== "object") throw new Error("getter");
    boolean(frozen.defineOwnProperty(key, { get: o(getter.object), set: setter }, context, loc), true);
    for (const rejected of [{ get: setter }, { set: UNDEFINED }, { value: seven }, { configurable: true }, { enumerable: true, get: getter }]) {
        boolean(frozen.defineOwnProperty(key, rejected, context, loc), false);
        accessor(frozen, key, getter, setter, false, false);
    }
    const nan = new GuestObject(), zero = new GuestObject(), writable = new GuestObject();
    nan.bootstrapDefine(key, { value: n(NaN) }); zero.bootstrapDefine(key, { value: n(0) });
    boolean(nan.defineOwnProperty(key, { value: n(NaN) }, context, loc), true);
    boolean(nan.defineOwnProperty(key, { value: n(0) }, context, loc), false);
    boolean(zero.defineOwnProperty(key, { value: n(-0) }, context, loc), false);
    boolean(zero.defineOwnProperty(key, { writable: true }, context, loc), false);
    data(nan, key, n(NaN), false, false, false); data(zero, key, n(0), false, false, false);
    writable.bootstrapDefine(key, { value: n(1), writable: true, enumerable: true });
    boolean(writable.defineOwnProperty(key, { value: n(2), writable: false }, context, loc), true);
    boolean(writable.defineOwnProperty(key, { value: n(3) }, context, loc), false);
    data(writable, key, n(2), false, true, false);
    target.preventExtensions();
    boolean(target.defineOwnProperty("missing", { value: seven }, context, loc), false);
    boolean(target.defineOwnProperty("missing", { get: getter }, context, loc), false);
    boolean(target.defineOwnProperty(key, { value: eleven }, context, loc), true);
    boolean(target.defineOwnProperty(key, {}, context, loc), true);
    data(target, key, eleven, false, true, true);
    const dataFields: PropertyDescriptorUpdate = target.getOwnProperty(key)!;
    check(dataFields.get === undefined && dataFields.set === undefined, "R04 no accessor fields");
    check(calls === startCalls && evaluator.steps === startSteps, "R01-R08 no calls/ticks");
    const absent = new GuestObject();
    value(absent.internalGet(key, o(absent), context, loc), UNDEFINED, "R10 missing");
    absent.bootstrapDefine(key, { get: UNDEFINED, set: setter, configurable: true });
    value(absent.internalGet(key, o(absent), context, loc), UNDEFINED, "R10 no getter");
    absent.bootstrapDefine(key, { get: getter, set: UNDEFINED });
    boolean(absent.internalSet(key, eleven, o(absent), context, loc), false);
    check(calls === startCalls, "R10/R12 absent endpoint no call");
    check(absent.get(key, context, loc) === seven, "R33 normal host Get");
    // R13/R14: data lookup uses receiver definition, never receiver setters.
    const base = new GuestObject(), receiver = new GuestObject();
    base.bootstrapDefine(key, { value: seven, writable: true, configurable: true });
    receiver.bootstrapDefine(key, { set: setter, configurable: true });
    const beforeSet = calls;
    boolean(base.internalSet(key, eleven, o(receiver), context, loc), false);
    check(calls === beforeSet, "R13 do not call receiver setter");
    accessor(receiver, key, UNDEFINED, setter, false, true);
    receiver.bootstrapDefine(key, { value: seven, writable: false });
    base.bootstrapDefine(key, { set: setter });
    boolean(base.internalSet(key, eleven, o(receiver), context, loc), true);
    data(receiver, key, seven, false, false, true);
    base.bootstrapDefine(key, { value: seven });
    boolean(base.internalSet(key, eleven, o(new GuestObject()), context, loc), false);
    base.bootstrapDefine(key, { writable: true });
    const child = new GuestObject(base), empty = new GuestObject();
    boolean(base.internalSet(key, eleven, o(child), context, loc), true); data(child, key, eleven, true, true, true);
    boolean(empty.internalSet(key, eleven, o(empty), context, loc), true); data(empty, key, eleven, true, true, true);
    boolean(base.internalSet(key, eleven, n(3), context, loc), false);
    boolean(base.internalSet(key, eleven, o(receiver), context, loc), false);
    const closed = new GuestObject(); closed.preventExtensions();
    boolean(base.internalSet(key, eleven, o(closed), context, loc), false);
    const own = new GuestObject(); own.bootstrapDefine(key, { value: seven, writable: true });
    boolean(base.internalSet(key, eleven, o(own), context, loc), true); data(own, key, eleven, true, false, false);
    // R15: mutation and original guest throw identity survive both dispatch paths.
    const payload = o(new GuestObject());
    const X: ThrowCompletion = { type: "throw", value: payload, origin: { kind: "guest" }, diagnostic: { phase: "runtime", name: "Uncaught", message: "sentinel", loc } };
    const throwing = o(realm.createBuiltin("throwing", 0, (_r, _a, _c, _l) => { base.bootstrapDefine("note", { value: n(9), configurable: true }); return X; }));
    base.bootstrapDefine(key, { get: throwing, set: throwing });
    const unshadowed = new GuestObject(base);
    check(unshadowed.internalGet(key, o(unshadowed), context, loc) === X && unshadowed.internalSet(key, eleven, o(unshadowed), context, loc) === X, "R15 exact abrupt");
    check(X.value === payload && X.diagnostic.loc === loc && X.origin.kind === "guest" && unshadowed.getOwnProperty(key) === undefined, "R15 no fallback");
    data(base, "note", n(9), false, false, true);
    // R16: the selected endpoint survives its own redefinition/deletion.
    const mutating = o(realm.createBuiltin("mutating", 0, (_r, _a, _c, _l) => { base.bootstrapDefine(key, { value: eleven, writable: true }); return normal(seven); }));
    base.bootstrapDefine(key, { get: mutating });
    value(unshadowed.internalGet(key, o(unshadowed), context, loc), seven, "R16 current getter");
    value(unshadowed.internalGet(key, o(unshadowed), context, loc), eleven, "R16 next lookup");
    const deleting = o(realm.createBuiltin("deleting", 1, (_r, _a, _c, _l) => { boolean(base.internalDelete(key), true); return normal(); }));
    base.bootstrapDefine(key, { set: deleting });
    boolean(unshadowed.internalSet(key, eleven, o(unshadowed), context, loc), true);
    check(unshadowed.getOwnProperty(key) === undefined, "R16 no setter fallback");
    boolean(unshadowed.internalSet(key, eleven, o(unshadowed), context, loc), true); data(unshadowed, key, eleven, true, true, true);
}
// R09: descriptor-only operations preserve order and do not execute accessors.
{
    const target = new GuestObject(), symbol = new GuestSymbol("same"), distinct = new GuestSymbol("same");
    const before = calls;
    target.bootstrapDefine("a", { get: getter, configurable: true }); target.bootstrapDefine("b", { get: getter });
    target.bootstrapDefine("a", { set: setter });
    const first = target.ownPropertyKeys(); check(first.length === 2 && first[0] === "a" && first[1] === "b", "R09 redefine position");
    boolean(target.internalDelete("a"), true); const deleted = target.ownPropertyKeys(); check(deleted.length === 1 && deleted[0] === "b", "R09 delete order");
    target.bootstrapDefine("a", { get: getter }); const reinserted = target.ownPropertyKeys(); check(reinserted.length === 2 && reinserted[0] === "b" && reinserted[1] === "a", "R09 reinsert");
    boolean(target.internalDelete("b"), false); boolean(target.internalHasProperty("a", loc), true);
    target.bootstrapDefine(symbol, { get: getter }); target.bootstrapDefine("2", { get: getter }); target.bootstrapDefine("1", {});
    const order = target.ownPropertyKeys();
    check(order.length === 5 && order[0] === "1" && order[1] === "2" && order[2] === "b" && order[3] === "a" && order[4] === symbol && target.getOwnProperty(distinct) === undefined && calls === before, "R09 key identity/order/no invocation");
}
// R17-R20: exotic validation, copied requests and partial shrink rollback.
{
    const target = new GuestArray(); const before = calls;
    target.bootstrapDefine("2", { get: getter, configurable: true, enumerable: true });
    check(calls === before, "R17 define no getter"); value(target.internalGet("2", o(target), context, loc), seven, "R17 Get");
    boolean(target.defineOwnProperty("length", { value: n(0) }, context, loc), true);
    check(calls === before + 1, "R17 shrink no getter");
    target.bootstrapDefine("length", { writable: false });
    boolean(target.defineOwnProperty("2", { get: getter }, context, loc), false); check(target.getOwnProperty("2") === undefined, "R17 frozen length");
    const converted = new GuestArray(), source = new GuestObject(); let trace = "";
    const request: PropertyDescriptorUpdate = { value: o(source), writable: false };
    source.bootstrapDefine("valueOf", { value: o(realm.createBuiltin("valueOf", 0, (_r, _a, _c, _l) => {
        trace += "v"; request.value = n(99); request.writable = true; request.get = getter;
        if (trace === "v") converted.bootstrapDefine("3", { get: getter, configurable: true });
        return normal(n(1));
    })) });
    boolean(converted.defineOwnProperty("length", request, context, loc), true);
    check(trace === "vv" && converted.getOwnProperty("3") === undefined, "R18 two original conversions/late old length");
    data(converted, "length", n(1), false, false, false);
    for (const exotic of [new GuestArray(), new GuestStringObject("ab")]) {
        invariant(() => { exotic.defineOwnProperty("length", { value: o(source), get: getter }, context, loc); }, "R02 exotic validation before conversion");
        invariant(() => { exotic.bootstrapDefine("length", { value: o(source), set: setter }); }, "R02 exotic bootstrap validation");
    }
    check(trace === "vv", "R18 invalid mixed record no coercion");
    const partial = new GuestArray(); partial.bootstrapDefine("3", { get: getter, configurable: true }); partial.bootstrapDefine("2", { get: getter });
    const count = calls; boolean(partial.defineOwnProperty("length", { value: n(1), writable: false }, context, loc), false);
    data(partial, "length", n(3), false, false, false);
    check(partial.getOwnProperty("3") === undefined && partial.getOwnProperty("2")?.kind === "accessor" && calls === count, "R19 rollback no getter");
    const boxed = new GuestStringObject("ab"); boxed.bootstrapDefine("x", { get: getter });
    value(boxed.internalGet("x", o(boxed), context, loc), seven, "R20 nonindex accessor");
    boxed.preventExtensions(); boolean(boxed.defineOwnProperty("0", { value: { kind: "string", value: "a" } }, context, loc), true);
    boolean(boxed.defineOwnProperty("0", { get: getter }, context, loc), false);
    boolean(boxed.defineOwnProperty("length", { get: getter }, context, loc), false);
    data(boxed, "0", { kind: "string", value: "a" }, false, true, false);
    check(boxed.ownPropertyKeys().length === 4, "R20 virtual index not materialized");
}
// R21: runtime references keep primitive receivers even though lookup boxes.
{
    const primitive: Value = { kind: "string", value: "ab" };
    realm.stringPrototype.bootstrapDefine("x", { get: getter, set: setter, configurable: true });
    const ref = { kind: "property" as const, base: primitive, key: { kind: "string" as const, value: "x" }, loc };
    value(getValue(ref, context, loc), seven, "R21 read"); check(seen === primitive, "R21 getter primitive receiver");
    const written = putValue(ref, eleven, context, loc);
    check(written.type === "normal" && written.value === eleven && seen === primitive, "R21 setter primitive receiver");
    const index = putValue({ kind: "property", base: primitive, key: { kind: "string", value: "0" }, loc }, eleven, context, loc);
    check(index.type === "throw" && index.diagnostic.name === "TypeError", "R21 virtual index strict failure");
    boolean(realm.stringPrototype.internalDelete("x"), true);
}
// R22/R23: captured references stay live; declaration checks never Get.
{
    const globalObject = new GuestObject(), global = new GlobalEnvironment(globalObject, globalObject);
    globalObject.bootstrapDefine("x", { get: getter, set: setter, configurable: true });
    const captured = resolveStrictGlobalBinding(global, "x", loc);
    if (captured.type !== "normal") throw new Error("capture");
    // Resolved references copy Location, so this endpoint checks the actual copy.
    const globalGetter = o(realm.createBuiltin("globalGetter", 0, (receiver, args, _c, at) => {
        check(receiver.kind === "object" && receiver.object === globalObject && args.length === 0 && at === captured.reference.loc, "R22 global receiver/location");
        return normal(seven);
    }));
    globalObject.bootstrapDefine("x", { get: globalGetter });
    value(getStrictGlobalBinding(captured.reference, context), seven, "R22 accessor binding");
    globalObject.bootstrapDefine("x", { value: eleven }); value(getStrictGlobalBinding(captured.reference, context), eleven, "R22 live data");
    globalObject.internalDelete("x"); referenceError(getStrictGlobalBinding(captured.reference, context));
    const unresolved = resolveStrictGlobalBinding(global, "late", loc); if (unresolved.type !== "normal") throw new Error("unresolved");
    globalObject.bootstrapDefine("late", { value: seven, writable: true });
    referenceError(putStrictGlobalBinding(unresolved.reference, eleven, context)); data(globalObject, "late", seven, true, false, false);
    globalObject.bootstrapDefine("x", { get: getter, configurable: true });
    const local = new ScriptDeclarativeEnvironment({ kind: "global", record: global }); local.createMutableBinding("x", loc);
    const localRef = resolveScriptBinding(local, "x", loc); if (localRef.type !== "normal") throw new Error("local resolution");
    const before = calls; referenceError(getScriptBinding(localRef.reference, context));
    check(calls === before && scriptIdentifierReceiver(localRef.reference) === UNDEFINED, "R22 TDZ shadow/no receiver");
    local.initializeBinding("x", seven, context, loc); check(getScriptBinding(localRef.reference, context).value === seven && calls === before, "R34 local identity");
    boolean(global.canDeclareGlobalFunction("x"), true);
    globalObject.bootstrapDefine("frozen", { get: getter }); boolean(global.canDeclareGlobalFunction("frozen"), false);
    globalObject.bootstrapDefine("data", { value: seven, writable: true, enumerable: true }); boolean(global.canDeclareGlobalFunction("data"), true);
    globalObject.bootstrapDefine("readonly", { value: seven, enumerable: true }); boolean(global.canDeclareGlobalFunction("readonly"), false);
    check(global.createGlobalFunctionBinding("x", getter, context, loc).type === "normal", "R23 define function");
    data(globalObject, "x", getter, true, true, false); check(calls === before, "R23 no old setter");
}
// R24: accessor lookup precedes conversion calls and preserves abrupt records.
{
    const target = new GuestObject(); let trace = "";
    const method = o(realm.createBuiltin("method", 1, (receiver, args, active, at) => {
        check(receiver.kind === "object" && receiver.object === target && active === context && at === loc, "R24 method context/receiver");
        trace += args.length === 0 ? "callm" : "callm(number)"; return normal(seven);
    }));
    const lookup = o(realm.createBuiltin("lookup", 0, (receiver, args, active, at) => {
        check(receiver.kind === "object" && receiver.object === target && args.length === 0 && active === context && at === loc, "R24 getter context/receiver"); trace += "get@@,"; return normal(method);
    }));
    target.bootstrapDefine(wellKnownToPrimitive, { get: lookup, configurable: true });
    value(toPrimitive(o(target), "number", context, loc), seven, "R24 protocol"); check(trace === "get@@,callm(number)", "R24 protocol order");
    const X = failure("TypeError", "conversion sentinel", loc); trace = "";
    target.bootstrapDefine(wellKnownToPrimitive, { get: o(realm.createBuiltin("throwing", 0, (_r, _a, _c, _l) => { trace += "get@@"; return X; })) });
    check(toPrimitive(o(target), "number", context, loc) === X && trace === "get@@", "R24 abrupt stops conversion");
    target.internalDelete(wellKnownToPrimitive); trace = "";
    target.bootstrapDefine("valueOf", { get: o(realm.createBuiltin("valueOfGetter", 0, (_r, _a, _c, _l) => { trace += "getValueOf,"; return normal(seven); })) });
    target.bootstrapDefine("toString", { get: o(realm.createBuiltin("toStringGetter", 0, (_r, _a, _c, _l) => { trace += "getToString,"; return normal(method); })) });
    value(toPrimitive(o(target), "number", context, loc), seven, "R24 fallback"); check(trace === "getValueOf,getToString,callm", "R24 fallback order");
}
// R25: Has precedes element Get, holes persist, constructor failure stops traversal.
{
    class ObservedMap extends GuestObject {
        trace = "";
        internalHasProperty(key: PropertyKey, at: { line: number; column: number }): InternalBooleanCompletion {
            this.trace += "H" + (typeof key === "string" ? key : "symbol") + ","; return super.internalHasProperty(key, at);
        }
    }
    const proto = new GuestObject(), target = new ObservedMap(proto);
    target.bootstrapDefine("length", { get: o(realm.createBuiltin("lengthGetter", 0, (_r, _a, _c, _l) => { target.trace += "L,"; return normal(n(2)); })) });
    proto.bootstrapDefine("0", { get: o(realm.createBuiltin("elementGetter", 0, (receiver, _a, active, _l) => { check(receiver.kind === "object" && receiver.object === target && active === context, "R25 element receiver/context"); target.trace += "G0,"; return normal(seven); })) });
    const callback = o(realm.createBuiltin("callback", 3, (_r, args, active, _l) => { check(args[0] === seven && sameValue(args[1], n(0)) && args[2].kind === "object" && args[2].object === target && active === context, "R25 callback args/context"); target.trace += "C0,"; return normal(eleven); }));
    const result = object(mapObject(target, callback, UNDEFINED, context, loc));
    check(target.trace === "L,H0,G0,C0,H1,", "R25 order"); data(result, "length", n(2), true, false, false); data(result, "0", eleven, true, true, true); check(result.getOwnProperty("1") === undefined, "R25 hole");
    const array = new GuestArray(); array.bootstrapDefine("length", { value: n(2) }); const X = failure("TypeError", "constructor sentinel", loc); target.trace = "";
    array.bootstrapDefine("constructor", { get: o(realm.createBuiltin("constructorGetter", 0, (_r, _a, _c, _l) => { target.trace += "constructor"; return X; })) });
    check(mapObject(array, callback, UNDEFINED, context, loc) === X && target.trace === "constructor", "R25 constructor before callback");
}
// R26: join and captured Object-toString fallback retain accessor ordering.
{
    const target = realm.createArray(); let trace = "";
    target.bootstrapDefine("0", { get: o(realm.createBuiltin("element", 0, (_r, _a, _c, _l) => { trace += "element,"; return normal({ kind: "string", value: "a" }); })), configurable: true });
    value(context.call(realm.arrayPrototype.get("join", context, loc), o(target), [], loc), { kind: "string", value: "a" }, "R26 join"); check(trace === "element,", "R26 single element read");
    trace = ""; target.bootstrapDefine("join", { get: o(realm.createBuiltin("joinGetter", 0, (_r, _a, _c, _l) => { trace += "join,"; return normal(seven); })) });
    target.bootstrapDefine(wellKnownToStringTag, { get: o(realm.createBuiltin("tagGetter", 0, (_r, _a, _c, _l) => { trace += "tag,"; return normal({ kind: "string", value: "Tag" }); })), configurable: true });
    value(context.call(realm.arrayPrototype.get("toString", context, loc), o(target), [], loc), { kind: "string", value: "[object Tag]" }, "R26 fallback"); check(trace === "join,tag,", "R26 captured fallback order");
    const X = failure("TypeError", "tag sentinel", loc); trace = "";
    target.bootstrapDefine(wellKnownToStringTag, { get: o(realm.createBuiltin("tagThrow", 0, (_r, _a, _c, _l) => { trace += "tag"; return X; })) });
    check(context.call(realm.objectPrototype.get("toString", context, loc), o(target), [], loc) === X && trace === "tag", "R26 exact tag throw");
}
// R27: actual legacy call boundary restores nonzero counters and defining Realm.
for (const setterPath of [false, true]) for (const mode of ["normal", "throw", "host"]) {
    const A = new Realm((_line) => {}), B = new Realm((_line) => {}), active = new Evaluator(A);
    active.steps = 5; active.calls = 2; active.depth = 3;
    const target = new GuestObject(), receiver = n(3), X = failure("TypeError", "cleanup sentinel", loc), Y = new Error("host sentinel");
    let entries = 0;
    const endpoint = o(B.createBuiltin("endpoint", 0, (actual, args, ctx, at) => {
        entries++; check(actual === receiver && args.length === (setterPath ? 1 : 0) && (!setterPath || args[0] === eleven) && ctx === active.context && ctx.realm === B && at === loc && active.calls === 3 && active.depth === 3, "R27 active boundary");
        const tick = ctx.tick(at); if (tick.type === "throw") return tick;
        if (mode === "host") throw Y;
        return mode === "throw" ? X : normal(seven);
    }));
    target.bootstrapDefine("x", { get: endpoint, set: endpoint, configurable: true });
    let caught: Error | null = null;
    try {
        if (setterPath) { const r = target.internalSet("x", eleven, receiver, active.context, loc); if (mode === "throw") check(r === X, "R27 setter abrupt identity"); else boolean(r, true); }
        else { const r = target.internalGet("x", receiver, active.context, loc); if (mode === "throw") check(r === X, "R27 getter abrupt identity"); else value(r, seven, "R27 getter normal"); }
    } catch (error) { if (error instanceof Error) caught = error; else throw error; }
    check(caught === (mode === "host" ? Y : null) && entries === 1 && active.steps === 6 && active.calls === 2 && active.depth === 3 && active.context.realm === A, "R27 exact cleanup");
}
// R28: no wrapper ticks, monotonic resource count, original failure propagation.
for (const setterPath of [false, true]) {
    const A = new Realm((_line) => {}), B = new Realm((_line) => {}), active = new Evaluator(A, 5);
    active.steps = 5; active.calls = 2; active.depth = 3; let note = 0; const thrown: { value: ThrowCompletion | null } = { value: null };
    const target = new GuestObject();
    const endpoint = o(B.createBuiltin("limited", 0, (_r, _a, ctx, at) => { const tick = ctx.tick(at); if (tick.type === "throw") { thrown.value = tick; return tick; } note++; return normal(); }));
    target.bootstrapDefine("x", { get: endpoint, set: endpoint, configurable: true });
    const result = setterPath ? target.internalSet("x", eleven, n(3), active.context, loc) : target.internalGet("x", n(3), active.context, loc);
    check(result.type === "throw" && thrown.value !== null && result === thrown.value && result.origin.kind === "resource-limit" && result.origin.count === 6 && result.origin.limit === 5 && note === 0 && active.steps === 6 && active.calls === 2 && active.depth === 3 && active.context.realm === A, "R28 step cleanup");
    const next = active.tick(loc); check(next.type === "throw" && next.origin.kind === "resource-limit" && next.origin.count === 7 && active.steps === 7, "R28 monotonic");
    active.calls = 64; const limited = setterPath ? target.internalSet("x", eleven, n(3), active.context, loc) : target.internalGet("x", n(3), active.context, loc);
    check(limited.type === "throw" && limited.origin.kind === "resource-limit" && limited.origin.count === 64 && limited.origin.limit === 64 && active.calls === 64 && active.steps === 7 && note === 0 && active.context.realm === A, "R28 call limit before entry");
    const recursive = new Evaluator(A, 100, 2); let entered = 0; const deepest: { value: ThrowCompletion | null } = { value: null };
    const recursiveEndpoint = o(B.createBuiltin("recursive", 0, (receiver, _a, ctx, at) => {
        entered++;
        // Recursive getter uses the same call boundary for both outer paths.
        const r = target.internalGet("x", receiver, ctx, at); if (r.type === "throw") deepest.value = r; return r;
    }));
    target.bootstrapDefine("x", { get: recursiveEndpoint, set: recursiveEndpoint, configurable: true });
    const recursion = setterPath ? target.internalSet("x", eleven, n(3), recursive.context, loc) : target.internalGet("x", n(3), recursive.context, loc);
    check(recursion.type === "throw" && deepest.value !== null && recursion === deepest.value && recursion.origin.kind === "resource-limit" && recursion.origin.count === 2 && recursion.origin.limit === 2 && entered === 2 && recursive.calls === 0 && recursive.steps === 0 && recursive.context.realm === A, "R28 recursion cleanup");
}
// R02/R34: all callable variants validate without invoking closed Script guards.
{
    const A = new Realm((_line) => {}, "script"), B = new Realm((_line) => {}, "script");
    let ticks = 0;
    const scriptContext: OperationContext = { realm: B, call: (_c, _r, _a, _l): ValueCompletion => { throw new Error("unexpected Script call"); }, tick: (_l) => { ticks++; return normal(); } };
    const prepared = prepareStrictScript({ id: input[0], text: '"use strict";function f(){return '+input[1]+';}' }, B);
    if (prepared.kind !== "ready") throw new Error("R34 prepare");
    const scriptFunction = object(prepared.record.materializeFunction(1, { kind: "global", record: B.globalEnvironment }, null, scriptContext));
    const scriptValue = o(scriptFunction), before = ticks;
    const target = new GuestObject(); target.bootstrapDefine("x", { get: scriptValue, set: scriptValue });
    accessor(target, "x", scriptValue, scriptValue, false, false); check(ticks === before, "R02 callable validation no materialization/ticks");
    for (const update of [{ value: getter }, { get: getter }, { set: setter }]) {
        invariant(() => { A.defineScriptGlobal("foreign", update); }, "R34 cross profile endpoint");
        check(A.globalObject.getOwnProperty("foreign") === undefined && ticks === before, "R34 before storage");
    }
    A.defineScriptGlobal("same", { get: scriptValue, set: scriptValue, configurable: true });
    accessor(A.globalObject, "same", scriptValue, scriptValue, false, true);
    const builtin = o(B.createBuiltin("guarded", 0, (_r, _a, _c, _l) => normal()));
    A.defineScriptGlobal("builtin", { get: builtin }); accessor(A.globalObject, "builtin", builtin, UNDEFINED, false, false);
    const legacyFunction = o(realm.createGuestFunction([], [], realm.global, null));
    target.bootstrapDefine("legacy", { get: legacyFunction }); accessor(target, "legacy", legacyFunction, UNDEFINED, false, false);
    check(ticks === before, "R34 no endpoint invocation");
}
// Runtime input selects actual lookup keys, Value wrappers and receiver identities.
// Both alternatives exist before selection; neither is baked into the native build.
check(input.length === 2 && ((input[0] === "seed" && input[1] === "7") || (input[0] === "other" && input[1] === "11")), "runtime input pair");
const runtimeParent = new GuestObject();
const runtimeLeft = new GuestObject(runtimeParent), runtimeRight = new GuestObject(runtimeParent);
const runtimeLeftValue = o(runtimeLeft), runtimeRightValue = o(runtimeRight);
const runtimeKey = input[0] === "seed" ? "alpha" : "beta";
const runtimeValue = input[1] === "7" ? seven : eleven;
const runtimeReceiver = input[0] === "seed" ? runtimeLeftValue : runtimeRightValue;
const runtimeOther = input[0] === "seed" ? runtimeRight : runtimeLeft;
let runtimeTrace = "";
function installRuntimeAccessor(key: string, initial: Value): void {
    const get = o(realm.createBuiltin("runtimeGetter", 0, (receiver, args, active, at) => {
        check(receiver === runtimeReceiver && args.length === 0 && active === context && at === loc, "runtime getter receiver/context");
        runtimeTrace += "get:" + key + ";";
        return normal(initial);
    }));
    const set = o(realm.createBuiltin("runtimeSetter", 1, (receiver, args, active, at) => {
        check(receiver === runtimeReceiver && args.length === 1 && args[0] === runtimeValue && active === context && at === loc, "runtime setter receiver/value/context");
        runtimeTrace += "set:" + key + ";";
        if (receiver.kind !== "object") throw new Error("runtime object receiver");
        boolean(receiver.object.defineOwnProperty("stored", { value: args[0], writable: true, configurable: true }, active, at), true);
        return normal(UNDEFINED);
    }));
    runtimeParent.bootstrapDefine(key, { get, set });
}
installRuntimeAccessor("alpha", seven);
installRuntimeAccessor("beta", eleven);
if (runtimeReceiver.kind !== "object") throw new Error("runtime selected receiver");
const runtimeStartSteps = evaluator.steps;
const runtimeRead = runtimeReceiver.object.internalGet(runtimeKey, runtimeReceiver, context, loc);
check(runtimeRead.type === "normal" && runtimeRead.value === runtimeValue, "runtime selected getter Value identity");
boolean(runtimeReceiver.object.internalSet(runtimeKey, runtimeValue, runtimeReceiver, context, loc), true);
const runtimeExpectedTrace = input[0] === "seed" ? "get:alpha;set:alpha;" : "get:beta;set:beta;";
check(runtimeTrace === runtimeExpectedTrace, "runtime exact key dispatch trace");
const runtimeStored = runtimeReceiver.object.getOwnProperty("stored");
check(runtimeStored !== undefined && runtimeStored.kind === "data" && runtimeStored.value === runtimeValue, "runtime stored Value identity");
check(runtimeOther.ownPropertyKeys().length === 0 && runtimeReceiver.object.ownPropertyKeys().length === 1 && runtimeReceiver.object.getOwnProperty(runtimeKey) === undefined && runtimeParent.getOwnProperty("stored") === undefined, "runtime receiver storage/no shadow");
// Nearby missing endpoints and receiver accessors must not invoke either callback.
const runtimeAbsent = runtimeKey + "-absent";
value(runtimeReceiver.object.internalGet(runtimeAbsent, runtimeReceiver, context, loc), UNDEFINED, "runtime missing key");
runtimeParent.bootstrapDefine(runtimeAbsent, { get: UNDEFINED, set: UNDEFINED });
value(runtimeReceiver.object.internalGet(runtimeAbsent, runtimeReceiver, context, loc), UNDEFINED, "runtime absent getter");
boolean(runtimeReceiver.object.internalSet(runtimeAbsent, runtimeValue, runtimeReceiver, context, loc), false);
const runtimeData = new GuestObject();
runtimeData.bootstrapDefine(runtimeKey, { value: runtimeValue, writable: true });
boolean(runtimeData.internalSet(runtimeKey, runtimeValue, o(runtimeParent), context, loc), false);
check(runtimeTrace === runtimeExpectedTrace && runtimeReceiver.object.getOwnProperty(runtimeAbsent) === undefined && runtimeOther.ownPropertyKeys().length === 0 && evaluator.steps === runtimeStartSteps, "runtime negative neighbors/no calls or ticks");
console.log("R01-R28 R33-R34 PASS " + input[0] + "|" + input[1]);
