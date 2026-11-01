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
function builtin(invoke: Builtin): Value {
    const object = new GuestObject();
    object.callable = { kind: "builtin", invoke };
    return objectValue(object);
}
function define(object: GuestObject, key: string, value: Value): void { object.bootstrapDefine(key, { value: value, writable: true, enumerable: true, configurable: true }); }
function returns(value: Value): Value { return builtin((_receiver, _args, _context, _loc) => normal(value)); }
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
    expected: Value = UNDEFINED;
    override internalGet(key: string, receiver: Value, location: Location): ValueCompletion {
        check(receiver === this.expected && (!this.requireLocation || location === loc), "exact Get receiver/location");
        this.reads++;
        this.trace += "Get " + key + ";";
        if (this.reads === this.failAt) return sentinel;
        return super.internalGet(key, receiver, location);
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
    check(object.trace === "tick;Get " + first + ";Call;", "first trace");
    for (const candidate of [...primitives, objectValue(new GuestObject())]) {
        const skip = observed();
        define(skip, first, candidate);
        define(skip, second, returns(num(9)));
        numberResult(toPrimitive(skip.expected, hint, tracedContext(skip), loc), 9, "skip noncallable");
        check(skip.trace === "tick;Get " + first + ";tick;Get " + second + ";Call;", "skip trace");
    }
    for (const primitive of primitives) {
        for (const fallback of [false, true]) {
            const item = observed();
            define(item, first, returns(fallback ? objectValue(new GuestObject()) : primitive));
            define(item, second, returns(primitive));
            const result = toPrimitive(item.expected, hint, tracedContext(item), loc);
            check(result.type === "normal" && result.value === primitive, "all primitive returns exact");
            const trace = "tick;Get " + first + ";Call;" + (fallback ? "tick;Get " + second + ";Call;" : "");
            check(item.trace === trace, "primitive return trace");
        }
    }
    const missing = observed();
    define(missing, second, returns(num(9)));
    numberResult(toPrimitive(missing.expected, hint, tracedContext(missing), loc), 9, "missing candidate fallback");
    check(missing.trace === "tick;Get " + first + ";tick;Get " + second + ";Call;", "missing trace");
    const fallback = observed();
    define(fallback, first, returns(objectValue(new GuestObject())));
    define(fallback, second, returns(num(9)));
    numberResult(toPrimitive(fallback.expected, hint, tracedContext(fallback), loc), 9, "object fallback");
    check(fallback.trace === "tick;Get " + first + ";Call;tick;Get " + second + ";Call;", "fallback trace");
    // H7-H9: no prefetch; replacement/deletion/prototype mutation in either order.
    for (const mode of ["missing", "noncallable", "objects"]) {
        const bad = observed();
        if (mode !== "missing") {
            define(bad, first, mode === "objects" ? returns(objectValue(new GuestObject())) : num(1));
            define(bad, second, mode === "objects" ? returns(objectValue(new GuestObject())) : num(2));
        }
        typeError(toPrimitive(bad.expected, hint, tracedContext(bad), loc));
        const callTrace = mode === "objects" ? "Call;" : "";
        check(bad.trace === "tick;Get " + first + ";" + callTrace + "tick;Get " + second + ";" + callTrace, "two failed lookup groups");
    }
    for (const mode of ["replace", "delete", "prototype"]) {
        const item = observed();
        define(item, second, builtin((_r, _a, _c, _l): Completion => { throw new Error("stale method called"); }));
        define(item, first, builtin((_r, _a, _c, _l) => {
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
    override internalGet(key: string, receiver: Value, location: Location): ValueCompletion {
        check(receiver === this.expected && location === loc && key === "valueOf", "array Get receiver/key/location");
        this.reads++;
        return super.internalGet(key, receiver, location);
    }
}
// H10: ordinary, array and callable inputs, own and inherited methods.
const argumentLists: Value[][] = [];
for (const kind of ["ordinary", "array", "function"]) {
    for (const inherited of [false, true]) {
        const object = kind === "array" ? new ObservedArray() : new Observed();
        if (kind === "function") object.callable = { kind: "builtin", invoke: (_r, _a, _c, _l): Completion => { throw new Error("input called"); } };
        const input = objectValue(object);
        object.expected = input;
        const owner = inherited ? new GuestObject() : object;
        if (inherited) check(object.setPrototypeOf(owner).value, "inherit method");
        define(owner, "valueOf", builtin((receiver, args, context, location) => {
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
    define(object, "valueOf", builtin((_r, _a, _c, _l) => {
        mutations++;
        return stage === "call1" ? sentinel : normal(object.expected);
    }));
    define(object, "toString", builtin((_r, _a, _c, _l) => sentinel));
    const result = toPrimitive(object.expected, "number", tracedContext(object, stage === "tick1" ? 1 : stage === "tick2" ? 2 : 0), loc);
    check(result === sentinel && result.value === sentinel.value && result.diagnostic === sentinel.diagnostic && result.diagnostic.loc === sentinel.diagnostic.loc, "exact abrupt " + stage);
    const expected = stage === "tick1" ? "tick;" : stage === "get1" ? "tick;Get valueOf;" : stage === "call1" ? "tick;Get valueOf;Call;" : stage === "tick2" ? "tick;Get valueOf;Call;tick;" : stage === "get2" ? "tick;Get valueOf;Call;tick;Get toString;" : "tick;Get valueOf;Call;tick;Get toString;Call;";
    check(object.trace === expected && mutations === (stage === "tick1" || stage === "get1" ? 0 : 1), "abrupt trace/mutation " + stage);
}
// H13: builtin-only nested coercion shares both limits.
for (const mode of ["finite", "steps", "calls"]) {
    const active = new Evaluator(realm, mode === "steps" ? 3 : 1000, mode === "calls" ? 4 : 20);
    const object = new GuestObject();
    const input = objectValue(object);
    let visits = 0;
    define(object, "valueOf", builtin((_r, _a, context, location) => {
        check(context === active.context && active.calls === visits + 1, "nested active context/depth");
        visits++;
        if (mode === "finite" && visits === 3) return normal(num(13));
        return toPrimitive(input, "default", context, location);
    }));
    const result = toPrimitive(input, "number", active.context, loc);
    if (mode === "finite") numberResult(result, 13, "finite nesting");
    else check(result.type === "throw" && result.diagnostic.name === "RangeError" && result.diagnostic.loc === loc, "bounded builtin nesting");
    check(active.calls === 0 && active.steps === (mode === "finite" ? 3 : mode === "steps" ? 4 : 5), "shared steps and cleanup");
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
    seed(target, "bridge", builtin((_receiver, args, context, location) => {
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
    define(object, "valueOf", builtin((_r, _a, _c, _l): Completion => {
        if (mode === "host") throw fault;
        return { type: mode, value: UNDEFINED };
    }));
    let escaped = false;
    try { toPrimitive(object.expected, "number", tracedContext(object), loc); }
    catch (error) {
        escaped = error instanceof Error && (mode === "host" ? error === fault : error.message === "invalid completion escaped call boundary: " + mode);
    }
    check(escaped && evaluator.calls === 0 && object.trace === "tick;Get valueOf;Call;", "host fault cleanup/no fallback");
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
console.log("primitive conversion passed");
