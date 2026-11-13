import type { PropertyDescriptor } from "../src/runtime.js";
import { wellKnownToPrimitive } from "../src/symbols.js";
import { GuestSymbol } from "../src/symbols.js";
import { stringKeys } from "./key-assertions.js";
import type { PropertyKey } from "../src/runtime.js";
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { GuestArray } from "../src/array-object.js";
import { mapObject } from "../src/array-map.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, type Builtin, type Completion, type Value, type ValueCompletion, type InternalBooleanCompletion, type DataDescriptor, type DataDescriptorUpdate, type OperationContext } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

const loc: Location = { line: 23, column: 7 };
function check(ok: boolean, label: string): void {
    if (!ok) throw new Error(label);
}
function num(value: number): Value { return { kind: "number", value }; }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function str(value: string): Value { return { kind: "string", value }; }
function object(value: Value): GuestObject {
    if (value.kind !== "object") throw new Error("expected object");
    return value.object;
}
function put(target: GuestObject, key: string, value: Value): void {
    target.bootstrapDefine(key, { value, writable: true, enumerable: true, configurable: true });
}
function builtin(realm: Realm, invoke: Builtin): Value {
    const value = new GuestObject(null, false, { kind: "builtin", initialName: null, realm, invoke });
    return obj(value);
}
function seed(active: Evaluator, key: string, value: Value): void {
    active.context.realm.global.bindings.set(key, { initialized: true, mutable: true, value });
}
function binding(active: Evaluator, key: string): Value {
    const entry = active.context.realm.global.bindings.get(key);
    if (entry === undefined) throw new Error(key);
    return entry.value;
}
function bool(result: InternalBooleanCompletion, expected: boolean): void {
    check(result.type === "normal" && result.value === expected, "Define boolean " + expected);
}
function error(result: InternalBooleanCompletion | Completion, name: string, message: string): void {
    check(result.type === "throw" && result.diagnostic.name === name && result.diagnostic.message === message, "expected " + name + ": " + message);
}
function length(target: GuestObject, expected: number, writable = true): void {
    const desc = target.getOwnProperty("length");
    check(desc !== undefined && desc.kind === "data" && sameValue(desc.value, num(expected)), "length " + expected);
    check(desc !== undefined && desc.kind === "data" && desc.writable === writable && !desc.enumerable && !desc.configurable, "length flags");
}
function hits(active: Evaluator, expected: number, trace: string): void {
    check(sameValue(binding(active, "hits"), num(expected)), "hook count " + expected);
    check(sameValue(binding(active, "trace"), str(trace)), "trace " + trace);
}
function three(): GuestArray {
    const value = new GuestArray();
    put(value, "0", num(10));
    put(value, "1", num(11));
    put(value, "2", num(12));
    return value;
}
const fixture = readFileSync("test/fixtures/array-length-coercion.js", "utf8");
function setup(): Evaluator {
    const active = new Evaluator(new Realm((_line) => {}), 100000, 12);
    const host = new GuestObject();
    put(host, "effect", builtin(active.context.realm, (_receiver, _args, _context, _at) => normal()));
    put(host, "payload", obj(new GuestObject()));
    seed(active, "host", obj(host));
    seed(active, "target", obj(three()));
    const parsed = parse(fixture);
    if (parsed.error !== null) throw new Error(parsed.error.message);
    check(active.block(parsed.body, active.context.realm.global, UNDEFINED).type === "normal", "fixture setup");
    return active;
}
function call(active: Evaluator, name: string): ValueCompletion {
    return active.context.call(binding(active, name), UNDEFINED, [], loc);
}
function define(active: Evaluator, desc: DataDescriptorUpdate): InternalBooleanCompletion {
    const savedValue = desc.value;
    const savedWritable = desc.writable;
    const savedEnumerable = desc.enumerable;
    const savedConfigurable = desc.configurable;
    const result = object(binding(active, "target")).defineOwnProperty("length", desc, active.context, loc);
    check(desc.value === savedValue && desc.writable === savedWritable && desc.enumerable === savedEnumerable && desc.configurable === savedConfigurable, "caller descriptor unchanged");
    return result;
}
function effect(active: Evaluator, invoke: Builtin): void {
    put(object(binding(active, "host")), "effect", builtin(active.context.realm, invoke));
}

// L1, L2: real assignments return the original object; mismatches never shrink.
for (const assignment of [false, true]) {
    for (const mismatch of [false, true]) {
        const active = setup();
        seed(active, "second", num(mismatch ? 3 : 2));
        const rhs = binding(active, "rhs");
        const result = assignment ? call(active, "assign") : define(active, { value: rhs });
        if (mismatch) {
            error(result, "RangeError", "invalid array length");
            length(object(binding(active, "target")), 3);
        } else {
            if (assignment) {
                check(result.type === "normal" && typeof result.value !== "boolean" && result.value === rhs, "assignment RHS identity");
            } else {
                check(result.type === "normal" && typeof result.value === "boolean" && result.value, "Define success");
            }
            length(object(binding(active, "target")), 2);
        }
        hits(active, 2, "vv");
        check((object(binding(active, "target")).getOwnProperty("2") !== undefined) === mismatch, "outer shrink only on match");
    }
}
// L3: second method lookup is fresh, including deletion exposing inheritance.
for (const inherited of [false, true]) {
    const active = setup();
    const rhs = object(binding(active, "rhs"));
    const parent = new GuestObject();
    put(parent, "valueOf", binding(active, "replacement"));
    bool(rhs.setPrototypeOf(parent), true);
    effect(active, (_receiver, _args, context, _at) => {
        check(context === active.context, "active context through parsed method");
        if (inherited) bool(rhs.internalDelete("valueOf"), true);
        else put(rhs, "valueOf", binding(active, "replacement"));
        return normal();
    });
    bool(define(active, { value: obj(rhs) }), true);
    hits(active, 2, "vr");
}
// L5-L8: each primitive is returned by parsed ordinary/array/function methods.
const rows: { first: Value; second: Value; expected: number; valid: boolean }[] = [
    { first: { kind: "null" }, second: { kind: "null" }, expected: 0, valid: true },
    { first: { kind: "boolean", value: false }, second: { kind: "boolean", value: false }, expected: 0, valid: true },
    { first: str(""), second: str(""), expected: 0, valid: true },
    { first: { kind: "boolean", value: true }, second: { kind: "boolean", value: true }, expected: 1, valid: true },
    { first: str("2"), second: str("2"), expected: 2, valid: true },
    { first: str("0x10"), second: str("0x10"), expected: 16, valid: true },
    { first: num(-0), second: num(-0), expected: 0, valid: true },
    { first: num(-0), second: num(0), expected: 0, valid: true },
    { first: num(0), second: num(-0), expected: 0, valid: true },
    { first: num(2.9), second: num(2), expected: 2, valid: true },
    { first: num(Infinity), second: num(0), expected: 0, valid: true },
    { first: num(4294967295), second: num(4294967295), expected: 4294967295, valid: true },
    { first: num(2), second: num(2.9), expected: 3, valid: false },
];
for (const value of [UNDEFINED, num(NaN), num(Infinity), num(-Infinity), num(-1), num(1.5), num(4294967296), str("x")]) {
    rows.push({ first: value, second: value, expected: 3, valid: false });
}
for (const name of ["rhs", "arrayRhs", "functionRhs"]) {
    for (const inherited of [false, true]) {
        for (const row of rows) {
            const active = setup();
            const rhs = binding(active, name);
            if (inherited) {
                const parent = new GuestObject();
                put(parent, "valueOf", object(rhs).get("valueOf", active.context, loc));
                bool(object(rhs).internalDelete("valueOf"), true);
                bool(object(rhs).setPrototypeOf(parent), true);
            }
            seed(active, "first", row.first);
            seed(active, "second", row.second);
            const firstReciprocal = row.first.kind === "number" ? 1 / row.first.value : 0;
            const secondReciprocal = row.second.kind === "number" ? 1 / row.second.value : 0;
            const result = define(active, { value: rhs });
            if (row.valid) bool(result, true);
            else {
                error(result, "RangeError", "invalid array length");
                check(result.type === "throw" && result.diagnostic.loc === loc, "located length error");
            }
            length(object(binding(active, "target")), row.expected);
            hits(active, 2, "vv");
            if (row.expected === 0) check(stringKeys(object(binding(active, "target")).ownPropertyKeys()).join(",") === "length", "zero removes indices");
            if (row.first.kind === "number" && row.first.value === 0) check(1 / row.first.value === firstReciprocal, "first zero sign retained");
            if (row.second.kind === "number" && row.second.value === 0) check(1 / row.second.value === secondReciprocal, "second zero sign retained");
        }
    }
}
for (const mode of ["noncallable", "object", "missing", "both-object"]) {
    const active = setup();
    const rhs = object(binding(active, "rhs"));
    if (mode === "noncallable") put(rhs, "valueOf", num(1));
    else put(rhs, "valueOf", binding(active, "objectResult"));
    if (mode === "missing") {
        bool(rhs.internalDelete("valueOf"), true);
        bool(rhs.internalDelete("toString"), true);
    }
    if (mode === "both-object") put(rhs, "toString", binding(active, "objectResult"));
    const result = define(active, { value: obj(rhs) });
    if (mode === "missing" || mode === "both-object") {
        error(result, mode === "missing" ? "RangeError" : "TypeError", mode === "missing" ? "invalid array length" : "cannot convert object to primitive");
        length(object(binding(active, "target")), 3);
        hits(active, 0, mode === "missing" ? "" : "oo");
    } else {
        bool(result, true);
        hits(active, 2, mode === "object" ? "osos" : "ss");
    }
}

// L4: exact lookup/call/tick abrupt records at both conversion boundaries.
const sentinel = failure("Sentinel", "array length boundary", loc);
class Observed extends GuestObject {
    reads = 0;
    failAt = 0;
    original: Value = UNDEFINED;
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        if (key === wellKnownToPrimitive) return normal(UNDEFINED);
        this.reads++;
        check(receiver === this.original && at === loc && key === "valueOf", "lookup original receiver/location/hint");
        if (this.reads === this.failAt) return sentinel;
        return super.internalGet(key, receiver, context, at);
    }
}
for (const stage of ["get", "call", "tick"]) {
    for (const failAt of [1, 2]) {
        const active = setup();
        const target = object(binding(active, "target"));
        const rhs = new Observed();
        const original = obj(rhs);
        rhs.original = original;
        rhs.failAt = stage === "get" ? failAt : 0;
        let calls = 0;
        let ticks = 0;
        put(rhs, "valueOf", builtin(active.context.realm, (receiver, args, context, at) => {
            calls++;
            check(receiver === original && args.length === 0 && context === active.context && at === loc, "call identity/zero args");
            put(target, "note", num(calls));
            return stage === "call" && calls === failAt ? sentinel : normal(num(2));
        }));
        const context: OperationContext = {
            realm: active.context.realm,
            call: (callee, receiver, args, at) => active.context.call(callee, receiver, args, at),
            tick: (_at) => {
                ticks++;
                return stage === "tick" && ticks === failAt * 2 ? sentinel : normal();
            },
        };
        const result = target.defineOwnProperty("length", { value: original, writable: false }, context, loc);
        check(result === sentinel, "exact abrupt record " + stage);
        check(ticks === failAt * 2 && rhs.reads === (stage === "tick" ? failAt - 1 : failAt), "no later ticks or reads");
        check(calls === (stage === "call" ? failAt : failAt - 1), "no later calls");
        length(target, 3);
        if (calls > 0) check(sameValue(target.get("note", context, loc), num(calls)), "hook mutations survive throw");
        check(active.calls === 0, "abrupt call cleanup");
    }
}
// L9-L13: storage observes the post-hook descriptor and preserves hook effects.
for (const mode of ["grow", "shrink", "freeze-same", "freeze-lower", "freeze-thaw", "throw-first", "throw-second", "mismatch"]) {
    const active = setup();
    const target = object(binding(active, "target"));
    const parent = new GuestObject();
    put(parent, "8", num(88));
    bool(target.setPrototypeOf(parent), true);
    put(target, "note", num(9));
    if (mode === "freeze-lower") {
        seed(active, "first", num(1));
        seed(active, "second", num(1));
    }
    if (mode === "mismatch") seed(active, "second", num(3));
    effect(active, (_receiver, args, context, at) => {
        const count = args[0];
        if (count.kind !== "number") throw new Error("count");
        if (mode === "grow" || mode === "throw-first" || mode === "throw-second" || mode === "mismatch") {
            put(target, "5", num(55));
            bool(target.internalDelete("1"), true);
        } else if (mode === "shrink") {
            bool(target.defineOwnProperty("length", { value: num(1) }, context, at), true);
        } else {
            bool(target.defineOwnProperty("length", { value: num(2), writable: false }, context, at), true);
        }
        if ((mode === "throw-first" && count.value === 1) || (mode === "throw-second" && count.value === 2)) return sentinel;
        return normal();
    });
    const desc: DataDescriptorUpdate = { value: binding(active, "rhs") };
    if (mode === "freeze-thaw") desc.writable = true;
    const result = define(active, desc);
    if (mode === "throw-first" || mode === "throw-second") check(result === sentinel, "mutation exact throw");
    else if (mode === "mismatch") error(result, "RangeError", "invalid array length");
    else bool(result, mode !== "freeze-lower" && mode !== "freeze-thaw");
    const abrupt = mode === "throw-first" || mode === "throw-second" || mode === "mismatch";
    length(target, abrupt ? 6 : 2, !mode.startsWith("freeze"));
    check((target.getOwnProperty("5") !== undefined) === abrupt, "hook index persists until outer successful shrink");
    check(sameValue(target.get("note", active.context, loc), num(9)) && sameValue(parent.get("8", active.context, loc), num(88)), "nonindex/inherited indices retained");
    if (mode === "shrink") check(target.getOwnProperty("1") === undefined && target.getOwnProperty("2") === undefined, "growth never resurrects deleted indices");
    hits(active, mode === "throw-first" ? 1 : 2, mode === "throw-first" ? "v" : "vv");
}
// L11: a Set that reaches conversion can fail after the hook freezes length.
{
    const active = setup();
    const target = object(binding(active, "target"));
    seed(active, "first", num(1));
    seed(active, "second", num(1));
    effect(active, (_receiver, _args, context, at) => {
        bool(target.defineOwnProperty("length", { value: num(2), writable: false }, context, at), true);
        return normal();
    });
    const result = call(active, "assign");
    check(result.type === "throw" && result.diagnostic.name === "TypeError", "Set translates post-hook false");
    hits(active, 2, "vv");
    length(target, 2, false);
}
// L12: readonly Set rejects before hooks, direct Define converts first.
for (const mode of ["same", "different", "invalid", "throw"]) {
    const active = setup();
    const target = object(binding(active, "target"));
    bool(define(active, { writable: false }), true);
    const before = active.steps;
    const rejected = target.set("length", binding(active, "rhs"), active.context, loc);
    check(rejected.type === "throw" && rejected.diagnostic.name === "TypeError", "readonly Set TypeError");
    check(active.steps === before, "readonly Set zero helper ticks");
    hits(active, 0, "");
    const base = new GuestObject();
    base.bootstrapDefine("length", { value: num(3), writable: false });
    bool(base.internalSet("length", binding(active, "rhs"), obj(three()), active.context, loc), false);
    const writableBase = new GuestObject();
    put(writableBase, "length", num(3));
    bool(writableBase.internalSet("length", binding(active, "rhs"), obj(target), active.context, loc), false);
    hits(active, 0, "");
    seed(active, "first", num(mode === "same" ? 3 : 2));
    seed(active, "second", num(mode === "same" ? 3 : mode === "invalid" ? 2.9 : 2));
    if (mode === "throw") effect(active, (_receiver, _args, _context, _at) => sentinel);
    const result = define(active, { value: binding(active, "rhs") });
    if (mode === "throw") check(result === sentinel, "readonly direct exact throw");
    else if (mode === "invalid") error(result, "RangeError", "invalid array length");
    else bool(result, mode === "same");
    hits(active, mode === "throw" ? 1 : 2, mode === "throw" ? "v" : "vv");
    length(target, 3, false);
}
// L14-L15: sparse rollback, delayed freeze and validation after conversion.
for (const mode of ["partial", "success", "enumerable", "configurable"]) {
    for (const freeze of [false, true]) {
        const active = setup();
        const target = new GuestArray();
        put(target, "1", num(1));
        target.bootstrapDefine("3", { value: num(3), writable: true, enumerable: true, configurable: mode !== "partial" });
        put(target, "5", num(5));
        seed(active, "target", obj(target));
        seed(active, "first", num(1));
        seed(active, "second", num(1));
        const desc: DataDescriptorUpdate = { value: binding(active, "rhs") };
        if (freeze) desc.writable = false;
        if (mode === "enumerable") desc.enumerable = true;
        if (mode === "configurable") desc.configurable = true;
        bool(define(active, desc), mode === "success");
        const invalidFlags = mode === "enumerable" || mode === "configurable";
        length(target, invalidFlags ? 6 : mode === "partial" ? 4 : 1, invalidFlags || !freeze);
        check(stringKeys(target.ownPropertyKeys()).join(",") === (invalidFlags ? "1,3,5,length" : mode === "partial" ? "1,3,length" : "length"), "sparse descending deletion/rollback");
        hits(active, 2, "vv");
    }
}
{
    const active = setup();
    const target = new GuestArray();
    put(target, "1", num(1));
    target.bootstrapDefine("3", { value: num(3), configurable: false });
    put(target, "5", num(5));
    seed(active, "target", obj(target));
    seed(active, "first", num(1));
    seed(active, "second", num(1));
    const result = call(active, "assign");
    check(result.type === "throw" && result.diagnostic.name === "TypeError", "partial Set false translates");
    length(target, 4);
    check(target.getOwnProperty("5") === undefined && target.getOwnProperty("3") !== undefined, "partial Set deletion retained");
}
// All optional flags are snapshotted; absent value performs no conversion.
for (const writable of [undefined, true, false]) {
    for (const enumerable of [undefined, false, true]) {
        for (const configurable of [undefined, false, true]) {
            const active = setup();
            const desc: DataDescriptorUpdate = { value: binding(active, "rhs"), writable, enumerable, configurable };
            const accepted = enumerable !== true && configurable !== true;
            bool(define(active, desc), accepted);
            hits(active, 2, "vv");
            length(object(binding(active, "target")), accepted ? 2 : 3, !accepted || writable !== false);
        }
    }
}
{
    const active = setup();
    const before = active.steps;
    bool(define(active, {}), true);
    bool(define(active, { writable: false }), true);
    check(active.steps === before, "absent value adds no ticks");
    hits(active, 0, "");
    length(object(binding(active, "target")), 3, false);
}
{
    const active = setup();
    const saved = binding(active, "rhs");
    const desc: DataDescriptorUpdate = { value: saved, writable: false, enumerable: false, configurable: false };
    effect(active, (_receiver, _args, _context, _at) => {
        desc.value = num(9);
        desc.writable = true;
        desc.enumerable = true;
        desc.configurable = true;
        return normal();
    });
    const target = object(binding(active, "target"));
    bool(target.defineOwnProperty("length", desc, active.context, loc), true);
    length(target, 2, false);
    hits(active, 2, "vv");
    check(desc.value !== saved && desc.writable === true, "host mutation is not overwritten by runtime");
}
// L16: receiver dispatch determines whether length is an array length or data.
{
    const active = setup();
    const base = new GuestObject();
    put(base, "length", num(3));
    const receiver = object(binding(active, "target"));
    const rhs = binding(active, "rhs");
    bool(base.internalSet("length", rhs, obj(receiver), active.context, loc), true);
    length(receiver, 2);
    hits(active, 2, "vv");
    const ordinary = new GuestObject();
    bool(receiver.internalSet("length", rhs, obj(ordinary), active.context, loc), true);
    check(ordinary.get("length", active.context, loc) === rhs, "array base ordinary receiver stores original RHS");
    length(receiver, 2);
    hits(active, 2, "vv");
}
// L17-L18: nested assignments and coercions share the active evaluator budget.
for (const name of ["nested", "reentrant", "compound"]) {
    const active = setup();
    const other = three();
    const inner = new GuestObject();
    let innerCalls = 0;
    put(inner, "valueOf", builtin(active.context.realm, (_receiver, _args, context, _at) => {
        check(context === active.context, "nested context identity");
        innerCalls++;
        return normal(num(1));
    }));
    seed(active, "inner", obj(inner));
    seed(active, "other", obj(other));
    put(object(binding(active, "rhs")), "valueOf", binding(active, name));
    let mapCalls = 0;
    put(object(binding(active, "host")), "map", builtin(active.context.realm, (_receiver, _args, context, at) => {
        mapCalls++;
        const input = new GuestObject();
        put(input, "length", obj(inner));
        return mapObject(input, builtin(active.context.realm, (_this, _values, _ctx, _loc) => normal()), UNDEFINED, context, at);
    }));
    const before = active.steps;
    bool(define(active, { value: binding(active, "rhs") }), true);
    length(object(binding(active, "target")), 2);
    check(innerCalls === (name === "reentrant" ? 2 : 4), "deterministic nested conversion counts");
    check(active.steps > before && active.calls === 0 && active.depth === 0, "shared steps and cleanup");
    if (name === "nested") length(other, 1);
    if (name === "reentrant") check(object(binding(active, "target")).getOwnProperty("1") === undefined, "reentrant deletion survives outer growth");
    if (name === "compound") check(mapCalls === 2 && sameValue(object(binding(active, "target")).get("note", active.context, loc), num(1)), "nested key/operator/map effects");
}
for (const name of ["loop", "recursive"]) {
    const active = setup();
    active.maxSteps = active.steps + 1000;
    put(object(binding(active, "rhs")), "valueOf", binding(active, name));
    const result = define(active, { value: binding(active, "rhs") });
    error(result, "RangeError", name === "loop" ? "execution step limit exceeded" : "call depth limit exceeded");
    check(active.calls === 0 && active.depth === 0, "runaway call/frame cleanup");
    length(object(binding(active, "target")), 3);
}
// L19: parsed closures and arrays remain realm-local across repeated operations.
{
    const first = setup();
    const second = setup();
    bool(define(first, { value: binding(first, "rhs") }), true);
    bool(define(first, { value: binding(first, "rhs") }), true);
    hits(first, 4, "vvvv");
    hits(second, 0, "");
    length(object(binding(second, "target")), 3);
    bool(define(second, { value: binding(second, "rhs") }), true);
    hits(second, 2, "vv");
    check(first.context.realm !== second.context.realm, "independent realms");
}
// L20: RHS/key failures happen before length hooks; ordinary/index writes do not coerce.
for (const name of ["rhsFailure", "keyFailure"]) {
    const active = setup();
    const badKey = new GuestObject();
    put(badKey, "toString", binding(active, "throwing"));
    seed(active, "badKey", obj(badKey));
    const result = call(active, name);
    check(result.type === "throw" && result.value === object(binding(active, "host")).get("payload", active.context, loc), "earlier guest throw payload");
    hits(active, 0, "");
    length(object(binding(active, "target")), 3);
    const rhs = binding(active, "rhs");
    const ordinary = new GuestObject();
    const target = object(binding(active, "target"));
    check(ordinary.set("length", rhs, active.context, loc).type === "normal", "ordinary storage");
    check(target.set("0", rhs, active.context, loc).type === "normal", "element storage");
    check(ordinary.get("length", active.context, loc) === rhs && target.get("0", active.context, loc) === rhs, "data RHS identity");
    hits(active, 0, "");
}
// L21: exact guest throw record capture, host faults and illegal completions.
for (const mode of ["guest", "fault", "break"]) {
    const active = setup();
    const rhs = object(binding(active, "rhs"));
    const fault = new Error("array length host fault");
    let captured: ValueCompletion = normal();
    put(rhs, "valueOf", builtin(active.context.realm, (receiver, args, context, at): Completion => {
        if (mode === "fault") throw fault;
        if (mode === "break") return { type: "break", value: UNDEFINED };
        captured = context.call(binding(active, "throwing"), receiver, args, at);
        return captured;
    }));
    let escaped = false;
    try {
        const result = define(active, { value: obj(rhs) });
        check(mode === "guest" && result.type === "throw" && captured.type === "throw" && result === captured, "exact guest throw record");
    } catch (caught) {
        escaped = caught instanceof Error && (mode === "fault" ? caught === fault : mode === "break" && caught.message.includes("invalid completion"));
    }
    check(escaped === (mode !== "guest") && active.calls === 0, "fault cleanup without wrapping");
    length(object(binding(active, "target")), 3);
}
// Direct definition must not inspect old length before either conversion.
class LengthReadObserver extends GuestArray {
    observations = "";
    getOwnProperty(key: PropertyKey): PropertyDescriptor | undefined {
        if (key === "length") this.observations += "L";
        return super.getOwnProperty(key);
    }
}
for (const mismatch of [false, true]) {
    const active = setup();
    const target = new LengthReadObserver();
    target.bootstrapDefine("length", { value: num(3) });
    target.observations = "";
    seed(active, "target", obj(target));
    if (mismatch) seed(active, "second", num(3));
    effect(active, (_receiver, _args, _context, _at) => {
        target.observations += "H";
        return normal();
    });
    const result = define(active, { value: binding(active, "rhs") });
    if (mismatch) error(result, "RangeError", "invalid array length");
    else bool(result, true);
    check(target.observations === (mismatch ? "HH" : "HHL"), "old length read follows both conversions and comparison");
}
// Fallback lookup/tick failures also retain identity in either conversion.
class FallbackObserver extends GuestObject {
    reads = 0;
    failAt = 0;
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        if (key === wellKnownToPrimitive) return normal(UNDEFINED);
        this.reads++;
        check(key === (this.reads % 2 === 1 ? "valueOf" : "toString"), "fallback lookup order");
        if (this.reads === this.failAt) return sentinel;
        return super.internalGet(key, receiver, context, at);
    }
}
for (const stage of ["get", "tick", "call"]) {
    for (const conversion of [1, 2]) {
        const active = setup();
        const target = object(binding(active, "target"));
        const rhs = new FallbackObserver();
        const original = obj(rhs);
        const failAt = conversion * 2;
        rhs.failAt = stage === "get" ? failAt : 0;
        let ticks = 0;
        let calls = 0;
        put(rhs, "valueOf", num(9));
        put(rhs, "toString", builtin(active.context.realm, (receiver, args, context, at) => {
            calls++;
            check(receiver === original && args.length === 0 && context === active.context && at === loc, "fallback call identity");
            put(target, "note", num(calls));
            return stage === "call" && calls === conversion ? sentinel : normal(num(2));
        }));
        const context: OperationContext = {
            realm: active.context.realm,
            call: (callee, receiver, args, at) => active.context.call(callee, receiver, args, at),
            tick: (_at) => {
                ticks++;
                return stage === "tick" && ticks === conversion * 3 ? sentinel : normal();
            },
        };
        const result = target.defineOwnProperty("length", { value: original, writable: false }, context, loc);
        check(result === sentinel, "fallback exact abrupt record");
        check(ticks === conversion * 3 && rhs.reads === (stage === "tick" ? failAt - 1 : failAt), "fallback stops at failing lookup/tick");
        check(calls === (stage === "call" ? conversion : conversion - 1), "fallback stops calls");
        length(target, 3);
        if (calls > 0) check(sameValue(target.get("note", context, loc), num(calls)), "fallback prior effects remain");
        check(active.calls === 0, "fallback cleanup");
    }
}


// A23/O6: original RHS is converted twice, but neither rejection commits length.
const symbolLength: Value = { kind: "symbol", value: new GuestSymbol("2") };
for (const secondConversion of [false, true]) {
    const active = setup();
    seed(active, secondConversion ? "second" : "first", symbolLength);
    const target = object(binding(active, "target"));
    const completion = call(active, "assign");
    error(completion, "TypeError", "cannot convert symbol to number");
    check(completion.type === "throw" && completion.diagnostic.loc.line === 37 && completion.diagnostic.loc.column === 12, "O6 assignment error location");
    hits(active, secondConversion ? 2 : 1, secondConversion ? "vv" : "v");
    length(target, 3);
    check(sameValue(target.get("2", active.context, loc), num(12)), "O6 no storage commit");
}
const directSymbolArray = three();
const directSymbolFailure = directSymbolArray.defineOwnProperty("length", { value: symbolLength }, new Evaluator(new Realm((_line) => {})).context, loc);
error(directSymbolFailure, "TypeError", "cannot convert symbol to number");
check(directSymbolFailure.type === "throw" && directSymbolFailure.diagnostic.loc === loc, "A23 direct length location");
length(directSymbolArray, 3);

console.log("array length coercion passed");
