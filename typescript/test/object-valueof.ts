import { testNumberConversions } from "./number-conversions.js";
import { GuestSymbol } from "../src/symbols.js";
import { testSymbolConversions } from "./symbol-conversions.js";
import { testObjectToString } from "./object-tostring.js";
import { testBooleanStringConversions } from "./boolean-string-conversions.js";
import { GuestSymbolObject } from "../src/primitive-objects.js";
import { toObject } from "../src/object-conversion.js";
import { stringKeys } from "./key-assertions.js";
import type { PropertyKey } from "../src/runtime.js";
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { GuestBoolean, GuestNumber, GuestStringObject } from "../src/primitive-objects.js";
import { toPrimitive } from "../src/primitive-conversion.js";
import { toNumber, toString, toUint32, toIntegerOrInfinity, toLength } from "../src/conversion.js";
import { GuestObject, UNDEFINED, failure, normal, sameValue, type Completion, type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void {
    if (!ok) throw new Error(message);
}
function value(object: GuestObject): Value { return { kind: "object", object }; }
function object(v: Value): GuestObject {
    if (v.kind !== "object") throw new Error("expected object");
    return v.object;
}
function result(c: Completion): Value {
    if (c.type !== "normal") throw new Error("expected normal completion");
    return c.value;
}
function binding(r: Realm, name: string): Value {
    const b = r.global.bindings.get(name);
    if (b === undefined) throw new Error("missing binding " + name);
    return b.value;
}
function run(source: string, e: Evaluator): Completion {
    const p = parse(source);
    check(p.error === null, "fixture parses");
    return e.block(p.body, e.context.realm.global, UNDEFINED);
}
function error(c: Completion, name: string, message: string, at: Location): void {
    check(c.type === "throw" && c.diagnostic.phase === "runtime"
        && c.diagnostic.name === name && c.diagnostic.message === message
        && c.diagnostic.loc.line === at.line && c.diagnostic.loc.column === at.column,
    "exact error: " + name + " " + message + " at " + at.line + ":" + at.column);
}
const loc: Location = { line: 71, column: 8 };
const a = new Realm((_line) => { throw new Error("bootstrap output"); });
const b = new Realm((_line) => {});
const c = new Realm((_line) => {});
const e = new Evaluator(a);
const method = b.objectPrototype.get("valueOf", e.context, loc);
const fn = object(method);

// V5: installation and immutable callable ownership use the existing factory.
check(method !== a.objectPrototype.get("valueOf", e.context, loc) && fn.getPrototypeOf() === b.functionPrototype, "fresh method/defining prototype");
check(fn.callable !== null && fn.callable.realm === b, "defining Realm");
check(stringKeys(fn.ownPropertyKeys()).join(",") === "name,length", "only metadata");
for (const key of ["name", "length"]) {
    const d = fn.getOwnProperty(key);
    check(d !== undefined && d.kind === "data" && !d.writable && !d.enumerable && d.configurable, "metadata flags");
}
check(sameValue(fn.get("name", e.context, loc), { kind: "string", value: "valueOf" }), "method name");
check(sameValue(fn.get("length", e.context, loc), { kind: "number", value: 0 }), "method length");
const d = b.objectPrototype.getOwnProperty("valueOf");
check(d !== undefined && d.kind === "data" && d.writable && !d.enumerable && d.configurable, "method flags");
check(stringKeys(b.objectPrototype.ownPropertyKeys()).join(",") === "valueOf,toString" && !b.global.bindings.has("Object"), "bounded installation");

// V1: ToObject must neither inspect the receiver nor invoke its methods.
class NoReads extends GuestObject {
    internalGet(_key: PropertyKey, _receiver: Value, context: OperationContext, _at: Location): ValueCompletion {
        throw new Error("unexpected receiver Get");
    }
}
const kinds: GuestObject[] = [a.createObject(), a.createArray(), a.functionPrototype,
    // Explicit return type avoids the pinned compiler's throw-only adapter;
    // see docs/validation/ts-018b/callback-{inferred,annotated}.ts.
    a.createBuiltin("unused", 0, (_r, _args, _ctx, _at): ValueCompletion => { throw new Error("unexpected receiver Call"); }),
    a.createGuestFunction([], [], a.global, null), a.createBooleanObject(false), a.createNumberObject(-0),
    a.createStringObject("ab"), b.createObject(), new GuestObject(), new NoReads()];
for (const receiver of kinds) {
    const proto = receiver.getPrototypeOf();
    const keys = stringKeys(receiver.ownPropertyKeys()).join(",");
    check(object(result(e.call(method, value(receiver), [value(new NoReads())], loc))) === receiver, "exact identity");
    check(receiver.getPrototypeOf() === proto && stringKeys(receiver.ownPropertyKeys()).join(",") === keys, "unchanged object");
}
check(e.steps === 0 && e.calls === 0 && e.context.realm === a, "no hidden work/restoration");

// V2: boxes are fresh, meaningful, and allocated in B even when A calls.
const primitives: Value[] = [{ kind: "boolean", value: false }, { kind: "boolean", value: true },
    { kind: "number", value: 0 }, { kind: "number", value: -0 }, { kind: "number", value: NaN },
    { kind: "number", value: Infinity }, { kind: "number", value: -Infinity },
    { kind: "string", value: "" }, { kind: "string", value: "A\ud83d\ude00\ud800\0" }];
for (const primitive of primitives) {
    const first = object(result(e.call(method, primitive, [value(new NoReads())], loc)));
    const second = object(result(e.call(method, primitive, [], loc)));
    check(first !== second, "fresh boxes");
    if (primitive.kind === "boolean") {
        check(first instanceof GuestBoolean && first.booleanData === primitive.value && first.getPrototypeOf() === b.booleanPrototype, "Boolean payload/root");
    } else if (primitive.kind === "number") {
        check(first instanceof GuestNumber && sameValue({ kind: "number", value: first.numberData }, primitive) && first.getPrototypeOf() === b.numberPrototype, "Number payload/root including signed zero/NaN");
    } else if (primitive.kind === "string") {
        check(first instanceof GuestStringObject && first.stringData === primitive.value && first.getPrototypeOf() === b.stringPrototype, "String payload/root");
        const length = first.getOwnProperty("length");
        check(length !== undefined && length.kind === "data" && !length.writable && !length.enumerable && !length.configurable
            && sameValue(length.value, { kind: "number", value: primitive.value.length }), "String length");
        for (let i = 0; i < primitive.value.length; i++) {
            const unit = first.getOwnProperty(String(i));
            check(unit !== undefined && unit.kind === "data" && !unit.writable && unit.enumerable && !unit.configurable
                && sameValue(unit.value, { kind: "string", value: primitive.value.charAt(i) }), "UTF-16 unit descriptor");
        }
        check(stringKeys(first.ownPropertyKeys()).join(",") === (primitive.value.length === 0 ? "length" : "0,1,2,3,4,length"), "String key order");
    }
}

// V3: runtime source, strict detached receiver, and argument order before errors.
check(run(readFileSync("test/fixtures/object-valueof.js", "utf8"), e).type === "normal", "runtime-read fixture");
for (const name of ["direct", "arrayIdentity", "functionIdentity", "borrowed", "fresh", "units", "shadowed", "bypass"]) {
    check(sameValue(binding(a, name), { kind: "boolean", value: true }), name);
}
for (const receiver of [UNDEFINED, { kind: "null" } as const]) {
    const failed = e.call(method, receiver, [], loc);
    error(failed, "TypeError", "cannot convert null or undefined to object", loc);
    check(failed.type === "throw" && failed.diagnostic.loc === loc, "exact saved location identity");
}
error(e.call(binding(a, "detachedFailure"), UNDEFINED, [], loc), "TypeError", "cannot convert null or undefined to object", { line: 24, column: 5 });
check(sameValue(binding(a, "trace"), { kind: "string", value: "ab" }), "detached args first");
error(e.call(binding(a, "nullFailure"), UNDEFINED, [], loc), "TypeError", "cannot convert null or undefined to object", { line: 28, column: 5 });
check(sameValue(binding(a, "trace"), { kind: "string", value: "abcd" }), "null args first");
error(e.call(binding(a, "missingFailure"), UNDEFINED, [], loc), "TypeError", "cannot convert null or undefined to object", { line: 32, column: 5 });
const sentinel = failure("RangeError", "sentinel", loc);
a.global.bindings.set("stop", { initialized: true, mutable: true, value: value(b.createBuiltin("stop", 0, (_r, _args, _ctx, _at) => sentinel)) });
check(e.call(binding(a, "abruptArgument"), UNDEFINED, [], loc) === sentinel, "argument throw precedes nullish conversion");
check(sameValue(binding(a, "trace"), { kind: "string", value: "abcde" }), "abrupt argument skips later args");

// V4/V8: observe the real A -> C.call -> B.valueOf dispatch, using one context.
const forwarded = c.functionPrototype.get("call", e.context, loc);
const budget = new Evaluator(a, 1, 3);
let trace = "";
class AllocationRealm extends Realm {
    createNumberObject(payload: number): GuestNumber {
        check(budget.context.realm === this && budget.calls === 3, "B allocation sees same active context and three frames");
        trace += "B;";
        return super.createNumberObject(payload);
    }
}
const allocationRealm = new AllocationRealm((_line) => {});
const allocationMethod = allocationRealm.objectPrototype.get("valueOf", budget.context, loc);
const bridge = value(c.createBuiltin("bridge", 0, (receiver, _args, context, at) => {
    check(context === budget.context && context.realm === c && budget.calls === 1, "C entry/shared context");
    trace += "C;";
    const boxed = context.call(forwarded, allocationMethod, [receiver], at);
    check(context.realm === c && budget.calls === 1, "restore C after B");
    trace += "C;";
    return boxed;
}));
const boxed = object(result(budget.call(bridge, { kind: "number", value: -0 }, [], loc)));
check(boxed instanceof GuestNumber && 1 / boxed.numberData === -Infinity && boxed.getPrototypeOf() === allocationRealm.numberPrototype, "C.call forwards unchanged receiver, B allocation");
check(trace === "C;B;C;" && budget.context.realm === a && budget.calls === 0 && budget.steps === 0, "restore A/no added ticks");
const short = new Evaluator(a, 0, 1);
error(short.call(forwarded, method, [{ kind: "number", value: 1 }], loc), "RangeError", "call depth limit exceeded", loc);
check(short.context.realm === a && short.calls === 0 && short.steps === 0, "forwarding budget cleanup");
const none = new Evaluator(a, 0, 0);
error(none.call(method, UNDEFINED, [], loc), "RangeError", "call depth limit exceeded", loc);
check(none.context.realm === a && none.calls === 0, "guard precedes body");
for (const mode of ["null", "guest", "host", "steps"]) {
    const active = new Evaluator(a, 1, 3);
    const surrounding = value(c.createBuiltin("surrounding", 0, (_receiver, _args, context, at): ValueCompletion => {
        const nested = context.call(forwarded, method, [mode === "null" ? UNDEFINED : { kind: "boolean", value: false }], at);
        check(context.realm === c && active.calls === 1, "C restored for abrupt bridge");
        if (nested.type === "throw") return nested;
        if (mode === "guest") return sentinel;
        if (mode === "host") throw new Error("host sentinel");
        const tick = context.tick(at);
        if (tick.type === "throw") return tick;
        return context.tick(at);
    }));
    let escaped = false;
    try {
        const completion = active.call(surrounding, UNDEFINED, [], loc);
        if (mode === "null") error(completion, "TypeError", "cannot convert null or undefined to object", loc);
        if (mode === "guest") check(completion === sentinel, "exact guest completion");
        if (mode === "steps") {
            error(completion, "RangeError", "execution step limit exceeded", loc);
            check(active.steps === 2, "shared step budget");
            error(active.call(surrounding, UNDEFINED, [], loc), "RangeError", "execution step limit exceeded", loc);
            check(active.steps === 3, "no budget reset");
        }
    } catch (fault) {
        check(mode === "host" && fault instanceof Error && fault.message === "host sentinel", "exact host fault");
        escaped = true;
    }
    check(escaped === (mode === "host") && active.context.realm === a && active.calls === 0 && active.depth === 0, "all abrupt cleanup");
}

// V6/C: actual inherited calls plus the new tag lookup tick.
for (const source of ["{}", "[]", "function() {}"] ) {
    const active = new Evaluator(a);
    const parsed = parse("let operand = " + source + ";");
    check(parsed.error === null, "coercion setup parse");
    const local = new Realm((_line) => {});
    const evaluator = new Evaluator(local);
    check(evaluator.block(parsed.body, local.global, UNDEFINED).type === "normal", "coercion setup");
    const operand = binding(local, "operand");
    let events = "";
    const context: OperationContext = {
        realm: a,
        tick: (at) => { events += "tick;"; return active.tick(at); },
        call: (callee, receiver, args, at) => {
            const first = callee === local.objectPrototype.get("valueOf", context, loc);
            check((first || callee === (source === "[]" ? local.arrayPrototype : source === "{}" ? local.objectPrototype : local.functionPrototype).get("toString", context, loc)) && receiver === operand && args.length === 0, "real inherited method call");
            events += first ? "valueOf;" : "toString;";
            const completion = active.call(callee, receiver, args, at);
            if (first) check(object(result(completion)) === object(operand), "inherited method returns object");
            return completion;
        },
    };
    const converted = result(toPrimitive(operand, "number", context, loc));
    const tag = source === "{}" ? "Object" : source === "[]" ? "Array" : "Function";
    check(converted.kind === "string" && converted.value === (source === "[]" ? "" : source === "{}" ? "[object " + tag + "]" : "function() {}"), "inherited default result");
    // The method body uses the active evaluator context, not this observer adapter.
    check(events === "tick;tick;valueOf;tick;toString;" && active.steps === (source === "[]" ? 5 : source === "{}" ? 4 : 3), "inherited conversion trace");
    const tight = new Evaluator(a, 2, 0);
    error(toPrimitive(operand, "number", tight.context, loc), "RangeError", "call depth limit exceeded", loc);
    check(tight.steps === 2 && tight.calls === 0 && tight.context.realm === a, "new inherited call participates in limit");
}

// V7: direct converters reject objects without consulting methods. Null roots
// perform one protocol lookup and two missing ordinary lookups even with no call
// budget; borrowing never relinks.
const bare = new GuestObject();
check(object(result(e.call(method, value(bare), [], loc))) === bare && bare.getPrototypeOf() === null, "borrow does not relink null root");
const zeroCalls = new Evaluator(a, 3, 0);
error(toPrimitive(value(bare), "number", zeroCalls.context, loc), "TypeError", "cannot convert object to primitive", loc);
check(zeroCalls.steps === 3 && bare.get("valueOf", zeroCalls.context, loc).kind === "undefined", "null root protocol lookup plus two missing ordinary methods");
for (const v of [value(new NoReads()), value(a.createBooleanObject(false)), value(a.createNumberObject(0)), value(a.createStringObject("ab"))]) {
    for (const conversion of [toNumber(v, loc, null), toString(v, loc, null), toUint32(v, loc, null), toIntegerOrInfinity(v, loc, null), toLength(v, loc, null)]) {
        if (conversion.type !== "throw") throw new Error("direct converter accepted object");
        error(conversion, "TypeError", "object-to-primitive conversion unsupported", loc);
    }
}
const explicit = new Evaluator(new Realm((_line) => {}));
check(run(`let hooks = '';
let x = {
    valueOf: function() {
        hooks = hooks + 'v';
        return {};
    },
    toString: function() {
        hooks = hooks + 's';
        return {};
    }
};`, explicit).type === "normal", "explicit hooks setup");
error(run("+x;", explicit), "TypeError", "cannot convert object to primitive", { line: 1, column: 1 });
check(sameValue(binding(explicit.context.realm, "hooks"), { kind: "string", value: "vs" }), "explicit negative trace preserved");

// V5: shadow/replace/delete are ordinary, Realm-local mutations; saved method survives.
const otherMethod = a.objectPrototype.get("valueOf", explicit.context, loc);
check(b.objectPrototype.set("valueOf", { kind: "number", value: 7 }, e.context, loc).type === "normal", "replace method");
check(sameValue(b.createArray().get("valueOf", e.context, loc), { kind: "number", value: 7 }) && a.objectPrototype.get("valueOf", e.context, loc) === otherMethod, "replacement inheritance/isolation");
check(object(result(e.call(method, value(bare), [], loc))) === bare, "saved method survives replacement");
const deleted = b.objectPrototype.internalDelete("valueOf");
check(deleted.type === "normal" && deleted.value && b.createObject().get("valueOf", e.context, loc).kind === "undefined", "deletion visible");
check(a.objectPrototype.get("valueOf", e.context, loc) === otherMethod, "deletion isolation");
check(fn.defineOwnProperty("name", { value: { kind: "string", value: "renamed" } }, e.context, loc).type === "normal", "metadata configurable");
check(sameValue(fn.get("name", e.context, loc), { kind: "string", value: "renamed" }) && sameValue(object(otherMethod).get("name", e.context, loc), { kind: "string", value: "valueOf" }), "metadata isolated");
check(object(result(e.call(method, { kind: "boolean", value: false }, [], loc))).getPrototypeOf() === b.booleanPrototype, "saved defining Realm survives deletion");

// A2/A16-A19/A24: explicit Symbol boxing follows defining Realm, not payload origin.
const symbol = new GuestSymbol("x");
const symbolValue: Value = { kind: "symbol", value: symbol };
const symbolB = new Realm((_line) => {});
const symbolMethod = symbolB.objectPrototype.get("valueOf", e.context, loc);
const symbolEvaluator = new Evaluator(a);
const symbolBox = object(result(symbolEvaluator.call(symbolMethod, symbolValue, [], loc)));
const anotherBox = object(result(symbolEvaluator.call(symbolMethod, symbolValue, [], loc)));
check(symbolBox instanceof GuestSymbolObject && symbolBox.symbolData === symbol && symbolBox.getPrototypeOf() === symbolB.symbolPrototype, "A16 defining Realm payload/root");
check(anotherBox !== symbolBox && anotherBox instanceof GuestSymbolObject && anotherBox.symbolData === symbol, "A16 fresh boxes same symbol");
check(symbolEvaluator.steps === 0 && symbolEvaluator.context.realm === a, "A16 no ticks and restoration");
const transported = new Evaluator(c);
check(object(result(transported.call(symbolMethod, value(symbolBox), [], loc))) === symbolBox, "A2/A16 foreign existing box unchanged");
check(symbolB.symbolPrototype !== a.symbolPrototype && !(symbolB.symbolPrototype instanceof GuestSymbolObject), "A17 root has no payload");
check(symbolB.symbolPrototype.ownPropertyKeys().length === 4 && symbolB.symbolPrototype.getPrototypeOf() === symbolB.objectPrototype && symbolB.symbolPrototype.isExtensible() && symbolB.symbolPrototype.callable === null, "A17/B2 exact root graph");
const lookalike = new GuestObject(symbolB.symbolPrototype);
check(!(lookalike instanceof GuestSymbolObject), "A17 prototype is not a slot");
symbolBox.setPrototypeOf(null);
check(symbolBox instanceof GuestSymbolObject && symbolBox.symbolData === symbol, "A17 payload survives relink");
const direct = toObject(symbolValue, transported.context, loc);
check(direct.type === "normal" && direct.value instanceof GuestSymbolObject && direct.value.symbolData === symbol && direct.value.getPrototypeOf() === c.symbolPrototype, "A2/A16 independent evaluator transport");
for (const box of [symbolBox, anotherBox]) {
    const before = symbolEvaluator.steps;
    for (const conversion of [toNumber(value(box), loc, null), toString(value(box), loc, null)]) {
        check(conversion.type === "throw", "A19 direct box rejection");
        if (conversion.type === "throw") error(conversion, "TypeError", "object-to-primitive conversion unsupported", loc);
    }
    check(symbolEvaluator.steps === before, "A19 direct zero hooks/ticks");
    const converted = toPrimitive(value(box), "default", symbolEvaluator.context, loc);
    if (box === symbolBox) {
        error(converted, "TypeError", "cannot convert object to primitive", loc);
    } else {
        check(sameValue(result(converted), symbolValue), "B2 intact box uses inherited Symbol hook");
    }
}
for (const mode of ["normal", "guest", "host", "steps"]) {
    const active = new Evaluator(a, 1, 3);
    const surrounding = value(c.createBuiltin("symbolBridge", 0, (_receiver, _args, context, at): ValueCompletion => {
        check(context.realm === c && active.calls === 1, "A18 C entry");
        const nested = context.call(forwarded, symbolMethod, [symbolValue], at);
        check(context.realm === c && active.calls === 1, "A18 C restored");
        const box = object(result(nested));
        check(box instanceof GuestSymbolObject && box.symbolData === symbol && box.getPrototypeOf() === symbolB.symbolPrototype, "A18 B boxes symbol");
        if (mode === "guest") return sentinel;
        if (mode === "host") throw new Error("symbol host sentinel");
        if (mode === "steps") {
            const first = context.tick(at);
            if (first.type === "throw") return first;
            return context.tick(at);
        }
        return nested;
    }));
    let hostFault = false;
    try {
        const completion = active.call(surrounding, UNDEFINED, [], loc);
        if (mode === "normal") check(completion.type === "normal", "A18 normal");
        if (mode === "guest") check(completion === sentinel, "A18 exact guest throw");
        if (mode === "steps") {
            error(completion, "RangeError", "execution step limit exceeded", loc);
            check(active.steps === 2, "A18 shared steps");
        }
    } catch (fault) {
        check(mode === "host" && fault instanceof Error && fault.message === "symbol host sentinel", "A18 exact host fault");
        hostFault = true;
    }
    check(hostFault === (mode === "host") && active.context.realm === a && active.calls === 0 && active.depth === 0, "A18 cleanup");
}
const symbolLimit = new Evaluator(a, 0, 1);
error(symbolLimit.call(forwarded, symbolMethod, [symbolValue], loc), "RangeError", "call depth limit exceeded", loc);
check(symbolLimit.calls === 0 && symbolLimit.context.realm === a && symbolLimit.steps === 0, "A18 shared call limit cleanup");
check(!symbolB.global.bindings.has("Symbol") && symbolB.symbolPrototype.ownPropertyKeys().length === 4, "A24/B2 methods without Symbol global");

testSymbolConversions();
testObjectToString();
testBooleanStringConversions();
testNumberConversions();

console.log("object valueOf passed");
