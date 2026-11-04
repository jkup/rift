// Included by object-valueof.ts in both compiled lanes; not a separate driver.
import { readFileSync } from "node:fs";
import { thisSymbolValue } from "../src/builtins/symbol.js";
import { toNumber, toString, toPropertyKey } from "../src/conversion.js";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { GuestSymbolObject } from "../src/primitive-objects.js";
import { toPrimitive, type PrimitiveHint } from "../src/primitive-conversion.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, normal, sameValue, type Value, type ValueCompletion, type PropertyKey, type OperationContext } from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";

const loc: Location = { line: 83, column: 9 };
function check(ok: boolean, label: string): void {
    if (!ok) throw new Error("B2 " + label);
}
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function sym(value: GuestSymbol): Value { return { kind: "symbol", value }; }
function str(value: string): Value { return { kind: "string", value }; }
function result(completion: ValueCompletion): Value {
    if (completion.type !== "normal") throw new Error("B2 expected normal completion");
    return completion.value;
}
function error(completion: ValueCompletion, message: string, at: Location = loc, name: string = "TypeError"): void {
    check(completion.type === "throw" && completion.diagnostic.name === name
        && completion.diagnostic.phase === "runtime" && completion.diagnostic.message === message
        && completion.diagnostic.loc.line === at.line && completion.diagnostic.loc.column === at.column
        && sameValue(completion.value, str(name + ": " + message)), "exact located error " + message);
}
function put(object: GuestObject, key: PropertyKey, value: Value): void {
    object.bootstrapDefine(key, { value, writable: true, enumerable: false, configurable: true });
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function binding(realm: Realm, name: string): Value {
    const found = realm.global.bindings.get(name);
    if (found === undefined) throw new Error("B2 missing binding " + name);
    return found.value;
}

class NoReads extends GuestObject {
    internalGet(_key: PropertyKey, _receiver: Value, context: OperationContext, _loc: Location): ValueCompletion {
        throw new Error("B2 receiver or argument property read");
    }
}
class ObservedSymbol extends GuestSymbolObject {
    reads: PropertyKey[] = [];
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        this.reads.push(key);
        return super.internalGet(key, receiver, context, at);
    }
}
function keys(actual: PropertyKey[], expected: PropertyKey[], label: string): void {
    check(actual.length === expected.length, label + " length");
    for (let i = 0; i < expected.length; i++) check(actual[i] === expected[i], label + " identity/order");
}

export function testSymbolConversions(): void {
    const a = new Realm((_line) => {});
    const b = new Realm((_line) => {});
    const c = new Realm((_line) => {});
    const evaluator = new Evaluator(a);
    const methodKeys: PropertyKey[] = ["toString", "valueOf", wellKnownToPrimitive];
    const names = ["toString", "valueOf", "[Symbol.toPrimitive]"];
    const lengths = [0, 0, 1];
    const methods = methodKeys.map((key) => b.symbolPrototype.get(key, evaluator.context, loc));

    // P10 metadata, exact canonical key, and per-Realm function ownership.
    for (const realm of [a, b, c]) {
        keys(realm.symbolPrototype.ownPropertyKeys(), [...methodKeys, wellKnownToStringTag], "root keys");
        check(!(realm.symbolPrototype instanceof GuestSymbolObject), "root lacks payload");
        check(!realm.global.bindings.has("Symbol"), "no global");
        for (const absent of ["constructor", "description", "Symbol.toPrimitive", "@@toPrimitive"]) {
            check(realm.symbolPrototype.get(absent, evaluator.context, loc).kind === "undefined", "partial surface " + absent);
        }
        check(realm.symbolPrototype.get(new GuestSymbol("Symbol.toPrimitive"), evaluator.context, loc).kind === "undefined", "no description matching");
        for (let i = 0; i < methodKeys.length; i++) {
            const descriptor = realm.symbolPrototype.getOwnProperty(methodKeys[i]);
            check(descriptor !== undefined && descriptor.kind === "data" && descriptor.writable === (i < 2)
                && !descriptor.enumerable && descriptor.configurable, "method flags");
            const method = realm.symbolPrototype.get(methodKeys[i], evaluator.context, loc);
            if (method.kind !== "object") throw new Error("B2 missing function");
            check(method.object.getPrototypeOf() === realm.functionPrototype
                && method.object.callable !== null && method.object.callable.realm === realm, "method ownership");
            if (realm !== b) check(!sameValue(method, methods[i]), "fresh methods");
            keys(method.object.ownPropertyKeys(), ["name", "length"], "function metadata keys");
            check(sameValue(method.object.get("name", evaluator.context, loc), str(names[i]))
                && sameValue(method.object.get("length", evaluator.context, loc), { kind: "number", value: lengths[i] }), "metadata values");
            for (const key of ["name", "length"]) {
                const metadata = method.object.getOwnProperty(key);
                check(metadata !== undefined && metadata.kind === "data" && !metadata.writable && !metadata.enumerable && metadata.configurable, "metadata flags");
            }
        }
    }

    // P10 slot extraction and descriptive UTF-16 strings never inspect properties.
    const descriptions: (string | undefined)[] = [undefined, "", "x", "a\0\ud800\udfff\ud83d\ude00"];
    const expectedStrings = ["Symbol()", "Symbol()", "Symbol(x)", "Symbol(a\0\ud800\udfff\ud83d\ude00)"];
    const ignored = obj(new NoReads());
    for (let d = 0; d < descriptions.length; d++) {
        const identity = new GuestSymbol(descriptions[d]);
        const foreign = c.createSymbolObject(identity);
        foreign.setPrototypeOf(null);
        put(foreign, "symbolData", sym(new GuestSymbol("fake")));
        const observed = new ObservedSymbol(identity, a.symbolPrototype);
        const receivers = [sym(identity), obj(a.createSymbolObject(identity)), obj(foreign), obj(observed)];
        for (const receiver of receivers) {
            const extracted = thisSymbolValue(receiver, loc, null);
            check(extracted.type === "normal" && extracted.value === identity, "helper exact payload");
            for (let i = 0; i < methods.length; i++) {
                const before = evaluator.steps;
                const returned = result(evaluator.call(methods[i], receiver, [ignored, ignored], loc));
                check(sameValue(returned, i === 0 ? str(expectedStrings[d]) : sym(identity)), "receiver/description result");
                check(evaluator.steps === before && evaluator.calls === 0 && evaluator.context.realm === a, "zero method ticks/cleanup");
            }
        }
        check(observed.reads.length === 0, "slot methods do not Get");
    }
    const lookalike = new NoReads(b.symbolPrototype);
    put(lookalike, "symbolData", sym(new GuestSymbol("fake")));
    const invalid: Value[] = [UNDEFINED, { kind: "null" }, { kind: "boolean", value: false },
        { kind: "number", value: 0 }, { kind: "number", value: NaN }, str("x"),
        obj(b.symbolPrototype), obj(lookalike), obj(a.createObject()), obj(a.createArray()),
        obj(a.functionPrototype), obj(a.createBooleanObject(false)), obj(a.createNumberObject(1)), obj(a.createStringObject("x"))];
    for (const receiver of invalid) {
        const extracted = thisSymbolValue(receiver, loc, null);
        check(extracted.type === "throw", "helper rejects non-slot");
        for (const method of methods) error(evaluator.call(method, receiver, [ignored], loc), "receiver is not a symbol");
    }

    // P10 A -> C Function.call -> B method: shared limits and restored ownership.
    const identity = new GuestSymbol("x");
    const payload = sym(identity);
    for (const args of [[], [UNDEFINED], [{ kind: "null" } as Value], [str("invalid hint")], [payload], [ignored, ignored]]) {
        check(sameValue(result(evaluator.call(methods[2], payload, args, loc)), payload), "hook ignores any hint and arity");
    }
    const forwarded = c.functionPrototype.get("call", evaluator.context, loc);
    for (const receiver of [payload, obj(c.createSymbolObject(identity)), obj(b.symbolPrototype)]) {
        for (let i = 0; i < methods.length; i++) {
            const active = new Evaluator(a, 0, 3);
            let calls = 0;
            const bridge = c.createBuiltin("bridge", 0, (_receiver, _args, context, at) => {
                check(context === active.context && context.realm === c && active.calls === 1, "C bridge entry");
                const returned = context.call(forwarded, methods[i], [receiver, ignored], at);
                check(context.realm === c && active.calls === 1, "restore C after B");
                calls++;
                return returned;
            });
            const returned = active.call(obj(bridge), UNDEFINED, [], loc);
            if (receiver.kind === "object" && receiver.object === b.symbolPrototype) error(returned, "receiver is not a symbol");
            else check(sameValue(result(returned), i === 0 ? str("Symbol(x)") : payload), "borrowed result");
            check(calls === 1 && active.context.realm === a && active.calls === 0 && active.depth === 0 && active.steps === 0, "restoration and no body ticks");
        }
    }
    const limited = new Evaluator(a, 0, 1);
    error(limited.call(forwarded, methods[1], [payload], loc), "call depth limit exceeded", loc, "RangeError");
    check(limited.context.realm === a && limited.calls === 0 && limited.steps === 0, "shared call guard cleanup");
    check(sameValue(result(limited.call(methods[1], payload, [], loc)), payload), "call depth reusable");

    // P11 intact conversions charge exactly the protocol Get and one method Call.
    const box = new ObservedSymbol(identity, b.symbolPrototype);
    const boxed = obj(box);
    for (const hint of ["default", "number", "string"] as PrimitiveHint[]) {
        error(toPrimitive(obj(b.symbolPrototype), hint, evaluator.context, loc), "receiver is not a symbol");
        error(toPrimitive(obj(new GuestObject(b.symbolPrototype)), hint, evaluator.context, loc), "receiver is not a symbol");
    }
    let calls = 0;
    const context: OperationContext = {
        realm: a,
        tick: (at) => evaluator.context.tick(at),
        call: (callee, receiver, args, at) => {
            calls++;
            return evaluator.context.call(callee, receiver, args, at);
        },
    };
    const hints: PrimitiveHint[] = ["default", "number", "string"];
    for (const hint of hints) {
        box.reads = [];
        const before = evaluator.steps;
        calls = 0;
        check(sameValue(result(toPrimitive(boxed, hint, context, loc)), payload), "intact hint " + hint);
        keys(box.reads, [wellKnownToPrimitive], "intact lookup");
        check(evaluator.steps === before + 1 && calls === 1, "intact exact work");
    }
    const key = toPropertyKey(boxed, context, loc);
    check(key.type === "normal" && key.value === identity, "boxed key identity");
    const beforeDirect = evaluator.steps;
    box.reads = [];
    for (const converted of [toNumber(boxed, loc, null), toString(boxed, loc, null)]) {
        if (converted.type !== "throw") throw new Error("B2 direct converter accepted object");
        error(converted, "object-to-primitive conversion unsupported");
    }
    check(box.reads.length === 0 && evaluator.steps === beforeDirect, "direct converters unchanged");
    const noSteps = new Evaluator(a, 0, 3);
    error(toPrimitive(boxed, "default", noSteps.context, loc), "execution step limit exceeded", loc, "RangeError");
    check(box.reads.length === 0 && noSteps.calls === 0 && noSteps.steps === 1, "exhaustion prevents lookup");

    // Readonly inheritance rejects assignment; explicit own definition can shadow.
    const write = box.internalSet(wellKnownToPrimitive, methods[1], boxed, evaluator.context, loc);
    check(write.type === "normal" && !write.value && box.getOwnProperty(wellKnownToPrimitive) === undefined, "inherited readonly assignment");
    const shadow = box.defineOwnProperty(wellKnownToPrimitive, { value: methods[1], writable: true, configurable: true }, evaluator.context, loc);
    check(shadow.type === "normal" && shadow.value, "explicit own shadow");
    check(sameValue(result(toPrimitive(boxed, "string", context, loc)), payload), "shadow calls method");
    const removeShadow = box.internalDelete(wellKnownToPrimitive);
    check(removeShadow.type === "normal" && removeShadow.value, "remove own shadow");
    const deleted = b.symbolPrototype.internalDelete(wellKnownToPrimitive);
    check(deleted.type === "normal" && deleted.value, "configurable hook deletion");
    keys(a.symbolPrototype.ownPropertyKeys(), [...methodKeys, wellKnownToStringTag], "other Realm unchanged");
    check(sameValue(result(evaluator.call(methods[2], boxed, [ignored], loc)), payload), "saved deleted hook works");
    for (const hint of hints) {
        box.reads = [];
        calls = 0;
        const before = evaluator.steps;
        const converted = result(toPrimitive(boxed, hint, context, loc));
        check(sameValue(converted, hint === "string" ? str("Symbol(x)") : payload), "deleted hook fallback " + hint);
        keys(box.reads, [wellKnownToPrimitive, hint === "string" ? "toString" : "valueOf"], "ordinary first lookup");
        check(evaluator.steps === before + 2 && calls === 1, "fallback exact work");
    }

    // Fresh ordinary lookup after a first method returns an object and replaces the next.
    const replacement = obj(b.createBuiltin("replacement", 0, (_receiver, _args, _context, _loc) => normal(str("fresh"))));
    put(b.symbolPrototype, "valueOf", obj(b.createBuiltin("replaceNext", 0, (receiver, _args, _context, _loc) => {
        put(b.symbolPrototype, "toString", replacement);
        return normal(receiver);
    })));
    box.reads = [];
    calls = 0;
    const beforeFallback = evaluator.steps;
    check(sameValue(result(toPrimitive(boxed, "number", context, loc)), str("fresh")), "fresh ordinary replacement");
    keys(box.reads, [wellKnownToPrimitive, "valueOf", "toString"], "two-method order");
    check(calls === 2 && evaluator.steps === beforeFallback + 3, "two-method exact work");
    check(sameValue(result(evaluator.call(methods[0], boxed, [], loc)), str("Symbol(x)")), "saved replaced toString");
    check(sameValue(result(evaluator.call(methods[1], boxed, [], loc)), payload), "saved replaced valueOf");
    put(b.symbolPrototype, wellKnownToPrimitive, obj(b.createBuiltin("objectResult", 1, (receiver, _args, _context, _loc) => normal(receiver))));
    box.reads = [];
    calls = 0;
    const beforeObject = evaluator.steps;
    error(toPrimitive(boxed, "number", context, loc), "cannot convert object to primitive");
    keys(box.reads, [wellKnownToPrimitive], "object hook no fallback");
    check(calls === 1 && evaluator.steps === beforeObject + 1, "object hook exact work");
    put(b.symbolPrototype, wellKnownToPrimitive, str("bad"));
    error(toPrimitive(boxed, "default", context, loc), "symbol toPrimitive method is not callable");
    put(b.symbolPrototype, wellKnownToPrimitive, { kind: "null" });
    check(sameValue(result(toPrimitive(boxed, "string", context, loc)), str("fresh")), "null hook ordinary fallback");
    check(sameValue(result(toPrimitive(obj(a.createSymbolObject(identity)), "string", context, loc)), payload), "Realm mutation isolation");

    testGuestCalls(a, identity);
}

function testGuestCalls(realm: Realm, identity: GuestSymbol): void {
    const evaluator = new Evaluator(realm);
    seed(realm, "box", obj(realm.createSymbolObject(identity)));
    seed(realm, "s", sym(identity));
    seed(realm, "hookKey", sym(wellKnownToPrimitive));
    seed(realm, "symbolRoot", obj(realm.symbolPrototype));
    seed(realm, "ignored", obj(new NoReads()));
    const parsed = parse(readFileSync("test/fixtures/symbol-conversions.js", "utf8"));
    check(parsed.error === null, "runtime fixture parse");
    check(evaluator.block(parsed.body, realm.global, UNDEFINED).type === "normal", "runtime fixture execution");
    check(sameValue(binding(realm, "text"), str("Symbol(x)")), "guest explicit text");
    for (const name of ["unboxed", "primitive", "hintIgnored"]) check(sameValue(binding(realm, name), sym(identity)), "guest payload " + name);
    check(sameValue(binding(realm, "effects"), { kind: "number", value: 4 }), "ignored arguments evaluated exactly once");
    check(sameValue(binding(realm, "keyResult"), { kind: "number", value: 17 }), "guest box key matches symbol");
    const implicitRead = evaluator.call(binding(realm, "implicitMember"), UNDEFINED, [], loc);
    check(implicitRead.type === "normal" && sameValue(implicitRead.value, realm.symbolPrototype.get("valueOf", evaluator.context, loc)), "implicitMember positive read");
    const names = ["numeric", "implicitString", "invalidRoot", "readonlyHook"];
    const messages = ["cannot convert symbol to number", "cannot convert symbol to string", "receiver is not a symbol",
        "property is not writable: Symbol(Symbol.toPrimitive)"];
    const lines = [12, 15, 18, 24];
    const columns = [12, 12, 12, 5];
    for (let i = 0; i < names.length; i++) {
        error(evaluator.call(binding(realm, names[i]), UNDEFINED, [], loc), messages[i], { line: lines[i], column: columns[i] });
        check(evaluator.calls === 0 && evaluator.context.realm === realm, "guest failure cleanup");
    }
}
