import { mapObjectDefaultArray } from "../src/array-map.js";
import { formatPropertyKey, GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import type { PropertyKey } from "../src/runtime.js";
import { lengthOfArrayLike } from "../src/array-like.js";
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { GuestArray } from "../src/array-object.js";
import { toNumber, toString, toPropertyKey } from "../src/conversion.js";
import { ordinaryToPrimitive, toPrimitive } from "../src/primitive-conversion.js";
import { GuestObject, UNDEFINED, failure, normal, type Builtin, type Completion, type OperationContext, type Value, type ValueCompletion } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
const loc: Location = { line: 17, column: 9 };
const realm = new Realm((_line) => {});
const evaluator = new Evaluator(realm);
function objectValue(object: GuestObject): Value { return { kind: "object", object }; }
function num(value: number): Value { return { kind: "number", value }; }
function builtin(realm: Realm, invoke: Builtin): Value {
    const object = new GuestObject(null, false, { kind: "builtin", initialName: null, realm, invoke });
    return objectValue(object);
}
function define(object: GuestObject, key: PropertyKey, value: Value): void { object.bootstrapDefine(key, { value: value, writable: true, enumerable: true, configurable: true }); }
function returns(value: Value): Value { return builtin(realm, (_receiver, _args, _context, _loc) => normal(value)); }
function numberResult(result: ValueCompletion, expected: number, label: string): void {
    check(result.type === "normal" && result.value.kind === "number" && result.value.value === expected, label);
}
function typeError(result: ValueCompletion): void {
    check(result.type === "throw" && result.diagnostic.name === "TypeError"
        && result.diagnostic.message === "cannot convert object to primitive" && result.diagnostic.loc === loc, "located final TypeError");
}
const sentinel = failure("Sentinel", "exact", { line: 88, column: 3 });
sentinel.value = objectValue(new GuestObject());
// Synthetic internal Get traces exercise plumbing, not guest accessors.
class Observed extends GuestObject {
    trace = "";
    requireLocation = true;
    reads = 0;
    failAt = 0;
    protocolReads = 0;
    expected: Value = UNDEFINED;
    override internalGet(key: PropertyKey, receiver: Value, context: OperationContext, location: Location): ValueCompletion {
        check(receiver === this.expected && (!this.requireLocation || location === loc), "exact Get receiver/location");
        if (key === wellKnownToPrimitive) {
            this.protocolReads++;
            return normal(UNDEFINED);
        }
        this.reads++;
        this.trace += "Get " + formatPropertyKey(key) + ";";
        if (this.reads === this.failAt) return sentinel;
        return super.internalGet(key, receiver, context, location);
    }
}
function observed(): Observed {
    const object = new Observed();
    object.expected = objectValue(object);
    return object;
}
function tracedContext(object: Observed, failTick: number = 0): OperationContext {
    let ticks = 0;
    return {
        realm,
        tick: (location) => {
            check(location === loc, "tick location");
            ticks++;
            object.trace += "tick;";
            return ticks === failTick ? sentinel : evaluator.context.tick(location);
        },
        call: (callee, receiver, args, location) => {
            check(receiver === object.expected && args.length === 0 && location === loc, "exact Call receiver/zero args/location");
            object.trace += "Call;";
            return evaluator.context.call(callee, receiver, args, location);
        },
    };
}
const primitives: Value[] = [UNDEFINED, { kind: "null" }, { kind: "boolean", value: false }, { kind: "boolean", value: true },
    num(0), num(-0), num(7), num(NaN), num(Infinity), num(-Infinity),
    { kind: "string", value: "" }, { kind: "string", value: "a\u0000\ud800" }];
// H1 and ordinary helper precondition: no operation or guest wrapping.
for (const primitive of primitives) {
    for (const hint of ["default", "number", "string"] as const) {
        const object = observed();
        const result = toPrimitive(primitive, hint, tracedContext(object), loc);
        check(result.type === "normal" && result.value === primitive && object.trace === "", "primitive identity/no work");
    }
    let escaped = false;
    try { ordinaryToPrimitive(primitive, "number", evaluator.context, loc); }
    catch (error) { escaped = error instanceof Error && error.message === "ordinaryToPrimitive requires an object"; }
    check(escaped, "ordinary precondition host fault");
}
// H2-H6: fixed order, fallback, skipped candidates and every primitive return.
for (const hint of ["default", "number", "string"] as const) {
    const first = hint === "string" ? "toString" : "valueOf";
    const second = hint === "string" ? "valueOf" : "toString";
    const object = observed();
    const expected = hint === "string" ? { kind: "string", value: "k" } as const : num(7);
    define(object, first, returns(expected));
    const result = toPrimitive(object.expected, hint, tracedContext(object), loc);
    check(result.type === "normal" && result.value === expected, "first result");
    check(object.trace === "tick;tick;Get " + first + ";Call;", "first trace");
    for (const candidate of [...primitives, objectValue(new GuestObject())]) {
        const skip = observed();
        define(skip, first, candidate);
        define(skip, second, returns(num(9)));
        numberResult(toPrimitive(skip.expected, hint, tracedContext(skip), loc), 9, "skip noncallable");
        check(skip.trace === "tick;tick;Get " + first + ";tick;Get " + second + ";Call;", "skip trace");
    }
    for (const primitive of primitives) {
        for (const fallback of [false, true]) {
            const item = observed();
            define(item, first, returns(fallback ? objectValue(new GuestObject()) : primitive));
            define(item, second, returns(primitive));
            const result = toPrimitive(item.expected, hint, tracedContext(item), loc);
            check(result.type === "normal" && result.value === primitive, "all primitive returns exact");
            const trace = "tick;tick;Get " + first + ";Call;" + (fallback ? "tick;Get " + second + ";Call;" : "");
            check(item.trace === trace, "primitive return trace");
        }
    }
    const missing = observed();
    define(missing, second, returns(num(9)));
    numberResult(toPrimitive(missing.expected, hint, tracedContext(missing), loc), 9, "missing candidate fallback");
    check(missing.trace === "tick;tick;Get " + first + ";tick;Get " + second + ";Call;", "missing trace");
    const fallback = observed();
    define(fallback, first, returns(objectValue(new GuestObject())));
    define(fallback, second, returns(num(9)));
    numberResult(toPrimitive(fallback.expected, hint, tracedContext(fallback), loc), 9, "object fallback");
    check(fallback.trace === "tick;tick;Get " + first + ";Call;tick;Get " + second + ";Call;", "fallback trace");
    // H7-H9: no prefetch; replacement/deletion/prototype mutation in either order.
    for (const mode of ["missing", "noncallable", "objects"]) {
        const bad = observed();
        if (mode !== "missing") {
            define(bad, first, mode === "objects" ? returns(objectValue(new GuestObject())) : num(1));
            define(bad, second, mode === "objects" ? returns(objectValue(new GuestObject())) : num(2));
        }
        typeError(toPrimitive(bad.expected, hint, tracedContext(bad), loc));
        const callTrace = mode === "objects" ? "Call;" : "";
        check(bad.trace === "tick;tick;Get " + first + ";" + callTrace + "tick;Get " + second + ";" + callTrace, "two failed lookup groups");
    }
    for (const mode of ["replace", "delete", "prototype"]) {
        const item = observed();
        define(item, second, builtin(realm, (_r, _a, _c, _l): Completion => { throw new Error("stale method called"); }));
        define(item, first, builtin(realm, (_r, _a, _c, _l) => {
            if (mode === "replace") define(item, second, returns(num(11)));
            else {
                const deleted = item.internalDelete(second);
                check(deleted.type === "normal" && deleted.value, "delete second");
                if (mode === "prototype") {
                    const proto = new GuestObject();
                    define(proto, second, returns(num(12)));
                    check(item.setPrototypeOf(proto).value, "change prototype");
                }
            }
            return normal(item.expected);
        }));
        const result = toPrimitive(item.expected, hint, tracedContext(item), loc);
        if (mode === "delete") typeError(result);
        else numberResult(result, mode === "replace" ? 11 : 12, "fresh mutated method");
        check(item.reads === 2, "mutation two reads");
    }
}
class ObservedArray extends GuestArray {
    expected: Value = UNDEFINED;
    reads = 0;
    override internalGet(key: PropertyKey, receiver: Value, context: OperationContext, location: Location): ValueCompletion {
        if (key === wellKnownToPrimitive) return normal(UNDEFINED);
        check(receiver === this.expected && location === loc && key === "valueOf", "array Get receiver/key/location");
        this.reads++;
        return super.internalGet(key, receiver, context, location);
    }
}
// H10: ordinary, array and callable inputs, own and inherited methods.
const argumentLists: Value[][] = [];
for (const kind of ["ordinary", "array", "function"]) {
    for (const inherited of [false, true]) {
        const object = kind === "array" ? new ObservedArray() : new Observed(null, false,
            kind === "function" ? { kind: "builtin", initialName: null, realm: realm, invoke: (_r, _a, _c, _l): Completion => { throw new Error("input called"); } } : null);
        const input = objectValue(object);
        object.expected = input;
        const owner = inherited ? new GuestObject() : object;
        if (inherited) check(object.setPrototypeOf(owner).value, "inherit method");
        define(owner, "valueOf", builtin(realm, (receiver, args, context, location) => {
            check(receiver === input && args.length === 0 && context === evaluator.context && location === loc, "all kinds original receiver");
            for (const previous of argumentLists) check(previous !== args, "fresh argument lists");
            argumentLists.push(args);
            args.push(UNDEFINED);
            return normal(num(7));
        }));
        numberResult(toPrimitive(input, "number", evaluator.context, loc), 7, "all kinds conversion");
        check(object.reads === 1, "all kinds one semantic Get");
    }
}
// H11-H12: exact abrupt records and preceding side effects survive.
for (const stage of ["get1", "get2", "call1", "call2", "tick1", "tick2"]) {
    const object = observed();
    let mutations = 0;
    object.failAt = stage === "get1" ? 1 : stage === "get2" ? 2 : 0;
    define(object, "valueOf", builtin(realm, (_r, _a, _c, _l) => {
        mutations++;
        return stage === "call1" ? sentinel : normal(object.expected);
    }));
    define(object, "toString", builtin(realm, (_r, _a, _c, _l) => sentinel));
    const result = toPrimitive(object.expected, "number", tracedContext(object, stage === "tick1" ? 2 : stage === "tick2" ? 3 : 0), loc);
    check(result === sentinel && result.value === sentinel.value && result.diagnostic === sentinel.diagnostic && result.diagnostic.loc === sentinel.diagnostic.loc, "exact abrupt " + stage);
    const expected = stage === "tick1" ? "tick;" : stage === "get1" ? "tick;Get valueOf;" : stage === "call1" ? "tick;Get valueOf;Call;" : stage === "tick2" ? "tick;Get valueOf;Call;tick;" : stage === "get2" ? "tick;Get valueOf;Call;tick;Get toString;" : "tick;Get valueOf;Call;tick;Get toString;Call;";
    check(object.trace === "tick;" + expected && mutations === (stage === "tick1" || stage === "get1" ? 0 : 1), "abrupt trace/mutation " + stage);
}
// H13: builtin-only nested coercion shares both limits.
for (const mode of ["finite", "steps", "calls"]) {
    const active = new Evaluator(realm, mode === "steps" ? 3 : 1000, mode === "calls" ? 4 : 20);
    const object = new GuestObject();
    const input = objectValue(object);
    let visits = 0;
    define(object, "valueOf", builtin(realm, (_r, _a, context, location) => {
        check(context === active.context && active.calls === visits + 1, "nested active context/depth");
        visits++;
        if (mode === "finite" && visits === 3) return normal(num(13));
        return toPrimitive(input, "default", context, location);
    }));
    const result = toPrimitive(input, "number", active.context, loc);
    if (mode === "finite") numberResult(result, 13, "finite nesting");
    else check(result.type === "throw" && result.diagnostic.name === "RangeError" && result.diagnostic.loc === loc, "bounded builtin nesting");
    check(active.calls === 0 && active.steps === (mode === "finite" ? 6 : mode === "steps" ? 4 : 10), "shared steps and cleanup");
}
function seed(target: Realm, name: string, value: Value): void { target.global.bindings.set(name, { initialized: true, mutable: true, value }); }
function binding(target: Realm, name: string): Value {
    const entry = target.global.bindings.get(name);
    if (entry === undefined) throw new Error("missing " + name);
    return entry.value;
}
function program(source: string, active: Evaluator): Completion {
    const parsed = parse(source);
    if (parsed.error !== null) throw new Error(parsed.error.message);
    return active.block(parsed.body, active.context.realm.global, UNDEFINED);
}
const fixture = readFileSync("test/fixtures/primitive-conversion.js", "utf8");
// H14/H16: runtime-read guest methods and a test-only nested conversion bridge.
const realms = [new Realm((_line) => {}), new Realm((_line) => {})];
const retained: Evaluator[] = [];
for (const target of realms) {
    const active = new Evaluator(target, 10000, 12);
    retained.push(active);
    seed(target, "bridge", builtin(target, (_receiver, args, context, location) => {
        check(context === active.context && context.realm === target, "guest bridge active realm/context");
        return toPrimitive(args[0], "default", context, location);
    }));
    check(program(fixture, active).type === "normal", "fixture setup");
    numberResult(toPrimitive(binding(target, "counter"), "default", active.context, loc), 1, "first closure count");
    numberResult(toPrimitive(binding(target, "counter"), "default", active.context, loc), 2, "second closure count");
    numberResult(toPrimitive(binding(target, "mutating"), "default", active.context, loc), 11, "guest mutation fallback");
    numberResult(toPrimitive(binding(target, "nested"), "default", active.context, loc), 13, "guest bridge nesting");
    check(active.calls === 0, "guest calls restored");
}
check(binding(realms[0], "counter") !== binding(realms[1], "counter") && retained[0].context !== retained[1].context, "independent objects/contexts");
numberResult(toPrimitive(binding(realms[0], "counter"), "number", retained[0].context, loc), 3, "first realm advances");
numberResult(toPrimitive(binding(realms[1], "counter"), "number", retained[1].context, loc), 3, "second realm independent");
for (const name of ["looping", "recursive"]) {
    const active = retained[0];
    active.maxSteps = active.steps + 150;
    const result = toPrimitive(binding(realms[0], name), "default", active.context, loc);
    check(result.type === "throw" && result.diagnostic.name === "RangeError" && result.diagnostic.message === (name === "looping" ? "execution step limit exceeded" : "call depth limit exceeded")
        && active.calls === 0, "guest runaway " + name);
}
// H15: existing call-boundary finally releases slots on faults, without fallback.
for (const mode of ["host", "break", "continue"] as const) {
    const object = observed();
    const fault = new Error("host sentinel");
    define(object, "valueOf", builtin(realm, (_r, _a, _c, _l): Completion => {
        if (mode === "host") throw fault;
        return { type: mode, value: UNDEFINED };
    }));
    let escaped = false;
    try { toPrimitive(object.expected, "number", tracedContext(object), loc); }
    catch (error) {
        escaped = error instanceof Error && (mode === "host" ? error === fault : error.message === "invalid completion escaped call boundary: " + mode);
    }
    check(escaped && evaluator.calls === 0 && object.trace === "tick;tick;Get valueOf;Call;", "host fault cleanup/no fallback");
}
// H17: direct numeric/string converters remain primitive-only; keys and operators integrate.
const boundary = observed();
boundary.requireLocation = false;
define(boundary, "valueOf", returns(num(6)));
define(boundary, "toString", returns({ kind: "string", value: "x" }));
for (const result of [toNumber(boundary.expected, loc), toString(boundary.expected, loc)]) {
    check(result.type === "throw" && result.diagnostic.name === "TypeError", "primitive-only converter");
}
check(boundary.trace === "", "excluded converters perform no hook reads/calls");
const convertedKey = toPropertyKey(boundary.expected, evaluator.context, loc);
check(convertedKey.type === "normal" && convertedKey.value === "x" && boundary.trace === "Get toString;", "integrated direct key");
boundary.trace = "";
seed(realm, "operand", boundary.expected);
const keyResult = program("let holder = {}; holder[operand];", evaluator);
check(keyResult.type === "normal", "integrated parsed key");
check(boundary.trace === "Get toString;", "one parsed key lookup");
const expressions = ["+operand", "-operand", "operand - 2", "operand * 2", "operand / 2", "operand % 2", "operand + 2", "operand < 2", "operand > 2", "operand <= 2", "operand >= 2"];
const expected = [6, -6, 4, 12, 3, 0, 8, false, true, false, true];
for (let i = 0; i < expressions.length; i++) {
    boundary.trace = "";
    seed(realm, "actualResult", UNDEFINED);
    const result = program("actualResult = " + expressions[i] + ";", evaluator);
    const actual = binding(realm, "actualResult");
    check(result.type === "normal" && (actual.kind === "number" || actual.kind === "boolean") && actual.value === expected[i], "integrated operator result");
    check(boundary.trace === "Get valueOf;", "one operator lookup");
}

// R19: each freshly read hook enters its defining Realm and restores A before Get.
const conversionA = new Realm((_line) => {});
const conversionB = new Realm((_line) => {});
const conversionC = new Realm((_line) => {});
const conversionEntry = new Evaluator(conversionA);
class RealmObserved extends GuestObject {
    override internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        check(conversionEntry.context.realm === conversionA, "R19/R20 Get runs in caller Realm");
        return super.internalGet(key, receiver, context, at);
    }
}
const conversionObject = new RealmObserved(conversionA.objectPrototype);
const conversionToken = objectValue(conversionObject);
const realmTrace: Realm[] = [];
const replacementC = builtin(conversionC, (receiver, args, context, at) => {
    check(receiver === conversionToken && args.length === 0 && context === conversionEntry.context && context.realm === conversionC && at === loc, "R19 C hook identities");
    realmTrace.push(context.realm);
    return normal(num(7));
});
define(conversionObject, "toString", builtin(conversionA, (_receiver, _args, _context, _at): Completion => {
    throw new Error("stale toString called");
}));
define(conversionObject, "valueOf", builtin(conversionB, (receiver, args, context, at) => {
    check(receiver === conversionToken && args.length === 0 && context === conversionEntry.context && context.realm === conversionB && at === loc, "R19 B hook identities");
    realmTrace.push(context.realm);
    define(conversionObject, "toString", replacementC);
    return normal(conversionToken);
}));
numberResult(ordinaryToPrimitive(conversionToken, "number", conversionEntry.context, loc), 7, "R19 fresh replacement result");
check(realmTrace.length === 2 && realmTrace[0] === conversionB && realmTrace[1] === conversionC && conversionEntry.context.realm === conversionA, "R19 B C trace and restoration");

// R20: foreign abrupt hooks preserve exact records/faults and suppress later work.
const foreignSentinel = failure("Sentinel", "foreign conversion", loc);
foreignSentinel.value = conversionToken;
const conversionFault = new Error("foreign conversion fault");
for (const path of ["key", "operator", "length", "array length"]) {
    for (const mode of ["throw", "fault"]) {
        const source = new RealmObserved(conversionA.objectPrototype);
        const input = objectValue(source);
        let hooks = 0;
        const abruptB = builtin(conversionB, (receiver, args, context, at): Completion => {
            hooks++;
            check(receiver === input && args.length === 0 && context === conversionEntry.context && context.realm === conversionB && at === loc, "R20 foreign hook identities");
            if (mode === "fault") throw conversionFault;
            return foreignSentinel;
        });
        const later = builtin(conversionC, (_receiver, _args, _context, _at): Completion => {
            throw new Error("later hook must be suppressed");
        });
        define(source, path === "key" ? "toString" : "valueOf", abruptB);
        define(source, path === "key" ? "valueOf" : "toString", later);
        const target = conversionA.createArray();
        define(target, "0", num(12));
        const lengthInput = conversionA.createObject();
        define(lengthInput, "length", input);
        let caught = false;
        try {
            if (path === "key") {
                conversionA.global.bindings.set("foreignKey", { initialized: true, mutable: true, value: input });
                const computed = conversionEntry.evaluate({
                    kind: "member", loc,
                    base: { kind: "object", loc, keys: [], values: [] },
                    key: { kind: "identifier", loc, name: "foreignKey" },
                }, conversionA.global, UNDEFINED);
                check(computed === foreignSentinel, "R20 exact computed key throw");
            } else if (path === "operator") {
                check(conversionEntry.binary("+", input, num(1), loc) === foreignSentinel, "R20 exact operator throw");
            } else if (path === "length") {
                check(lengthOfArrayLike(lengthInput, conversionEntry.context, loc) === foreignSentinel, "R20 exact length throw");
            } else {
                check(target.defineOwnProperty("length", { value: input }, conversionEntry.context, loc) === foreignSentinel, "R20 exact array length throw");
            }
        } catch (error) {
            if (!(error instanceof Error) || error !== conversionFault) throw error;
            caught = true;
        }
        check(caught === (mode === "fault") && hooks === 1, "R20 exact fault and one hook");
        check(conversionEntry.context.realm === conversionA && conversionEntry.calls === 0 && conversionEntry.depth === 0, "R20 restore caller");
        const unchangedLength = target.get("length", conversionEntry.context, loc);
        check(unchangedLength.kind === "number" && unchangedLength.value === 1 && target.getOwnProperty("0") !== undefined, "R20 no array writes");
    }
}
const doubleSource = new RealmObserved(conversionA.objectPrototype);
let doubleCalls = 0;
define(doubleSource, "valueOf", builtin(conversionB, (_receiver, _args, context, _at) => {
    check(context.realm === conversionB, "R20 double conversion owner");
    doubleCalls++;
    return normal(num(2));
}));
const doubleArray = conversionA.createArray();
const doubleResult = doubleArray.defineOwnProperty("length", { value: objectValue(doubleSource) }, conversionEntry.context, loc);
check(doubleResult.type === "normal" && doubleResult.value && doubleCalls === 2 && conversionEntry.context.realm === conversionA, "R20 two conversions with caller Get between entries");
for (const mode of ["throw", "fault"]) {
    const secondSource = new RealmObserved(conversionA.objectPrototype);
    let calls = 0;
    define(secondSource, "valueOf", builtin(conversionB, (_receiver, _args, context, at): Completion => {
        check(context.realm === conversionB && at === loc, "R20 second conversion owner/location");
        calls++;
        if (calls === 1) return normal(num(0));
        if (mode === "fault") throw conversionFault;
        return foreignSentinel;
    }));
    const unchanged = conversionA.createArray();
    define(unchanged, "0", conversionToken);
    let caught = false;
    try {
        const secondResult = unchanged.defineOwnProperty("length", { value: objectValue(secondSource) }, conversionEntry.context, loc);
        check(secondResult === foreignSentinel, "R20 exact second conversion throw");
    } catch (error) {
        if (!(error instanceof Error) || error !== conversionFault) throw error;
        caught = true;
    }
    const length = unchanged.get("length", conversionEntry.context, loc);
    check(caught === (mode === "fault") && calls === 2 && length.kind === "number" && length.value === 1 && unchanged.get("0", conversionEntry.context, loc) === conversionToken, "R20 second failure precedes writes/deletion");
    check(conversionEntry.context.realm === conversionA && conversionEntry.calls === 0 && conversionEntry.depth === 0, "R20 second failure restoration");
}


// TS-019B1 P1-P5: protocol-only observer rejects accidental ordinary fallback.
class ProtocolObserved extends GuestObject {
    expected: Value = UNDEFINED;
    events = "";
    getFailure = false;
    override internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        check(key === wellKnownToPrimitive && receiver === this.expected && at === loc, "P2 exact protocol Get");
        this.events += "Get;";
        return this.getFailure ? sentinel : super.internalGet(key, receiver, context, at);
    }
}
const symbolResult: Value = { kind: "symbol", value: new GuestSymbol("result") };
for (const hint of ["default", "number", "string"] as const) {
    for (const inherited of [false, true]) {
        for (const returned of [...primitives, symbolResult]) {
            const source = new ProtocolObserved();
            source.expected = objectValue(source);
            const owner = inherited ? new GuestObject() : source;
            if (inherited) check(source.setPrototypeOf(owner).value, "P2 inheritance");
            define(owner, wellKnownToPrimitive, builtin(realm, (receiver, args, context, at) => {
                check(receiver === source.expected && args.length === 1 && args[0].kind === "string" && args[0].value === hint
                    && context === evaluator.context && at === loc, "P2 exact Call");
                source.events += "Call;";
                return normal(returned);
            }));
            const context: OperationContext = {
                realm,
                tick: (at) => {
                    source.events += "tick;";
                    return evaluator.tick(at);
                },
                call: (callee, receiver, args, at) => evaluator.call(callee, receiver, args, at),
            };
            const result = toPrimitive(source.expected, hint, context, loc);
            check(result.type === "normal" && result.value === returned && source.events === "tick;Get;Call;", "P2 exact result/order");
        }
    }
}
// Nullish fallback and impostors never mask the ordinary number/string order.
for (const hint of ["default", "number", "string"] as const) {
    for (const absent of ["missing", "undefined", "null"]) {
        const source = new GuestObject();
        define(source, new GuestSymbol("Symbol.toPrimitive"), num(99));
        define(source, "@@toPrimitive", num(99));
        define(source, "Symbol.toPrimitive", num(99));
        if (absent !== "missing") define(source, wellKnownToPrimitive, absent === "null" ? { kind: "null" } : UNDEFINED);
        define(source, "valueOf", returns(num(1)));
        define(source, "toString", returns(num(2)));
        const active = new Evaluator(new Realm((_line) => {}));
        numberResult(toPrimitive(objectValue(source), hint, active.context, loc), hint === "string" ? 2 : 1, "P1/P3 canonical versus impostors");
        check(active.steps === 2 && active.calls === 0, "P3 absent lookup charged across independent evaluator");
    }
}
const invalidHooks: Value[] = [
    { kind: "boolean", value: false },
    { kind: "boolean", value: true },
    num(0),
    num(NaN),
    { kind: "string", value: "" },
    symbolResult,
    objectValue(new GuestObject()),
];
for (const invalid of invalidHooks) {
    const source = new ProtocolObserved();
    source.expected = objectValue(source);
    define(source, wellKnownToPrimitive, invalid);
    const result = toPrimitive(source.expected, "default", evaluator.context, loc);
    check(result.type === "throw" && result.diagnostic.phase === "runtime" && result.diagnostic.name === "TypeError"
        && result.diagnostic.message === "symbol toPrimitive method is not callable" && result.diagnostic.loc === loc
        && source.events === "Get;", "P4 noncallable category/no fallback");
}
for (const stage of ["object", "get", "call", "tick"]) {
    const source = new ProtocolObserved();
    source.expected = objectValue(source);
    source.getFailure = stage === "get";
    define(source, wellKnownToPrimitive, builtin(realm, (_receiver, _args, _context, _at) => {
        source.events += "Call;";
        return stage === "call" ? sentinel : normal(source.expected);
    }));
    const context: OperationContext = {
        realm,
        tick: (_at) => stage === "tick" ? sentinel : normal(),
        call: (callee, receiver, args, at) => evaluator.call(callee, receiver, args, at),
    };
    const result = toPrimitive(source.expected, "number", context, loc);
    if (stage === "object") typeError(result);
    else check(result === sentinel && result.value === sentinel.value && result.diagnostic.loc === sentinel.diagnostic.loc, "P5 exact abrupt identity");
    check(source.events === (stage === "tick" ? "" : stage === "get" ? "Get;" : "Get;Call;"), "P4/P5 no later work");
}
// P7: the direct ordinary helper does not even read the canonical key.
const ordinaryOnly = observed();
define(ordinaryOnly, wellKnownToPrimitive, num(0));
define(ordinaryOnly, "valueOf", returns(num(21)));
numberResult(ordinaryToPrimitive(ordinaryOnly.expected, "number", tracedContext(ordinaryOnly), loc), 21, "P7 direct ordinary");
check(ordinaryOnly.trace === "tick;Get valueOf;Call;" && ordinaryOnly.reads === 1 && ordinaryOnly.protocolReads === 0, "P7 unchanged tick/read trace");
const primitiveOnly = new Evaluator(realm, 0, 0);
const unchangedSymbol = toPrimitive(symbolResult, "string", primitiveOnly.context, loc);
check(unchangedSymbol.type === "normal" && unchangedSymbol.value === symbolResult && primitiveOnly.steps === 0, "P1 symbol fast path");

// P6: A -> B hook -> C hook -> B -> A, through one context and budget.
for (const mode of ["normal", "throw", "fault"]) {
    const active = new Evaluator(conversionA);
    let trace = "";
    const outer = new GuestObject();
    const inner = new GuestObject();
    const outerValue = objectValue(outer);
    const innerValue = objectValue(inner);
    define(inner, wellKnownToPrimitive, builtin(conversionC, (receiver, args, context, at): Completion => {
        trace += "C;";
        check(context === active.context && context.realm === conversionC && active.calls === 2 && active.steps === 2
            && receiver === innerValue && args.length === 1 && args[0].kind === "string" && args[0].value === "string" && at === loc, "P6 C shared state");
        if (mode === "fault") throw conversionFault;
        return mode === "throw" ? foreignSentinel : normal(symbolResult);
    }));
    define(outer, wellKnownToPrimitive, builtin(conversionB, (receiver, args, context, at): Completion => {
        trace += "B;";
        check(context.realm === conversionB && active.calls === 1 && active.steps === 1 && receiver === outerValue
            && args.length === 1 && args[0].kind === "string" && args[0].value === "default", "P6 B entry");
        try {
            return toPrimitive(innerValue, "string", context, at);
        } finally {
            check(context.realm === conversionB && active.calls === 1 && active.steps === 2, "P6 B restored in finally");
            trace += "B;";
        }
    }));
    let escaped = false;
    try {
        const result = toPrimitive(outerValue, "default", active.context, loc);
        check(mode === "throw" ? result === foreignSentinel : result.type === "normal" && result.value === symbolResult, "P6 result identity");
    } catch (error) {
        if (!(error instanceof Error) || error !== conversionFault) throw error;
        escaped = true;
    }
    check(escaped === (mode === "fault") && trace === "B;C;B;" && active.context.realm === conversionA
        && active.calls === 0 && active.depth === 0 && active.steps === 2, "P6 all exits restore caller");
    numberResult(active.call(returns(num(22)), UNDEFINED, [], loc), 22, "P6 later bounded call");
}
// P9: recursive exotic calls consume shared slots; absent lookup consumes a step.
for (const limit of ["calls", "steps"]) {
    const active = new Evaluator(realm, limit === "steps" ? 2 : 100, limit === "calls" ? 3 : 20);
    const source = new GuestObject();
    const input = objectValue(source);
    let visits = 0;
    define(source, wellKnownToPrimitive, builtin(realm, (_receiver, _args, context, at) => {
        visits++;
        return toPrimitive(input, "number", context, at);
    }));
    const result = toPrimitive(input, "number", active.context, loc);
    check(result.type === "throw" && result.diagnostic.name === "RangeError" && result.diagnostic.loc === loc
        && result.diagnostic.message === (limit === "calls" ? "call depth limit exceeded" : "execution step limit exceeded"), "P9 exact limit");
    check(visits === (limit === "calls" ? 3 : 2) && active.steps === (limit === "calls" ? 4 : 3)
        && active.calls === 0 && active.context.realm === realm, "P9 recursive budget/cleanup");
    numberResult(active.call(returns(num(23)), UNDEFINED, [], loc), 23, "P9 released call slots without resetting steps");
}
const absentBudget = new Evaluator(realm, 1);
const absentSource = observed();
define(absentSource, "valueOf", returns(num(24)));
const exhaustedAbsent = toPrimitive(absentSource.expected, "number", absentBudget.context, loc);
check(exhaustedAbsent.type === "throw" && exhaustedAbsent.diagnostic.message === "execution step limit exceeded"
    && exhaustedAbsent.diagnostic.loc === loc && absentBudget.steps === 2 && absentSource.reads === 0, "P9 absent lookup prevents ordinary Get at tight limit");

// P8: the saved length Value gets two complete conversions and a fresh hook.
for (const mode of ["normal", "first throw", "second throw", "mismatch"]) {
    const active = new Evaluator(realm);
    const array = realm.createArray();
    define(array, "4", num(40));
    const source = new ProtocolObserved();
    source.expected = objectValue(source);
    let calls = "";
    define(source, wellKnownToPrimitive, builtin(realm, (receiver, args, context, at) => {
        check(receiver === source.expected && args.length === 1 && args[0].kind === "string" && args[0].value === "number", "P8 first hint");
        calls += "first;";
        define(array, "6", num(60));
        define(source, wellKnownToPrimitive, builtin(realm, (secondReceiver, secondArgs, secondContext, secondLoc) => {
            check(secondReceiver === receiver && secondArgs.length === 1 && secondArgs[0].kind === "string" && secondArgs[0].value === "number"
                && secondContext === context && secondLoc === at, "P8 fresh second conversion");
            calls += "second;";
            const grown = array.get("length", active.context, loc);
            check(grown.kind === "number" && grown.value === 7, "P8 prior mutation visible");
            return mode === "second throw" ? sentinel : normal(num(mode === "mismatch" ? 3 : 2));
        }));
        return mode === "first throw" ? sentinel : normal(num(2));
    }));
    const result = array.defineOwnProperty("length", { value: source.expected }, active.context, loc);
    if (mode === "normal") check(result.type === "normal" && result.value, "P8 length succeeds");
    else if (mode === "mismatch") check(result.type === "throw" && result.diagnostic.name === "RangeError" && result.diagnostic.loc === loc, "P8 mismatch");
    else check(result === sentinel, "P8 exact conversion throw");
    const firstOnly = mode === "first throw";
    check(calls === (firstOnly ? "first;" : "first;second;") && source.events === (firstOnly ? "Get;" : "Get;Get;")
        && active.steps === (firstOnly ? 1 : 2), "P8 complete conversion counts");
    const length = array.get("length", active.context, loc);
    check(length.kind === "number" && length.value === (mode === "normal" ? 2 : 7)
        && (array.getOwnProperty("6") === undefined) === (mode === "normal"), "P8 post-hook length and abrupt writes");
}
// Runtime-read consumers retain reference/call order and exercise every integration path.
const protocolRealm = new Realm((_line) => {});
const protocolEvaluator = new Evaluator(protocolRealm);
seed(protocolRealm, "protocolKey", { kind: "symbol", value: wellKnownToPrimitive });
seed(protocolRealm, "resultSymbol", symbolResult);
seed(protocolRealm, "protocolMap", builtin(protocolRealm, (_receiver, args, context, at) => {
    if (args[0].kind !== "object") throw new Error("map bridge object required");
    return mapObjectDefaultArray(args[0].object, args[1], UNDEFINED, context, at);
}));
check(program(readFileSync("test/fixtures/symbol-primitive-conversion.js", "utf8"), protocolEvaluator).type === "normal", "P1/P2 guest consumers");
for (const row of [{ name: "protocolRead", value: 17 }, { name: "protocolSum", value: 5 },
    { name: "protocolNegated", value: -3 }, { name: "protocolProduct", value: 6 }, { name: "protocolCalled", value: 19 }]) {
    const value = binding(protocolRealm, row.name);
    check(value.kind === "number" && value.value === row.value, "P2 exact guest result " + row.name);
}
const less = binding(protocolRealm, "protocolLess");
check(less.kind === "boolean" && less.value, "P2 relational result");
const mapped = binding(protocolRealm, "protocolMapped");
check(mapped.kind === "object" && mapped.object.get("0", protocolEvaluator.context, loc).kind === "number" && mapped.object.getOwnProperty("1") === undefined, "P2 map hole preserved");
if (mapped.kind !== "object") throw new Error("missing mapped object");
numberResult(normal(mapped.object.get("0", protocolEvaluator.context, loc)), 10, "P2 map first");
numberResult(normal(mapped.object.get("2", protocolEvaluator.context, loc)), 14, "P2 map last");
numberResult(normal(mapped.object.get("length", protocolEvaluator.context, loc)), 3, "P2 map converted length");
const protocolTrace = binding(protocolRealm, "protocolTrace");
check(protocolTrace.kind === "string" && protocolTrace.value === "B;K;R;string;string;default;number;number;number;number;number;number;B;K;string;A;M;", "P2 exact consumer hints/reference/call order");

console.log("primitive conversion passed");
