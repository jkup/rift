// N1-N8 and full-stage consumers extend the existing object-valueof driver in both compiled lanes.
import { readFileSync } from "node:fs";
import { thisNumberValue } from "../src/builtins/number.js";
import { lengthOfArrayLike } from "../src/array-like.js";
import { mapObjectDefaultArray } from "../src/array-map.js";
import { toNumber, toString, toUint32, toIntegerOrInfinity, toLength } from "../src/conversion.js";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { GuestNumber } from "../src/primitive-objects.js";
import { toPrimitive, type PrimitiveHint } from "../src/primitive-conversion.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, type Value, type ValueCompletion, type PropertyKey, type OperationContext } from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";

const loc: Location = { line: 91, column: 7 };
function check(ok: boolean, label: string): void {
    if (!ok) throw new Error("N " + label);
}
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function str(value: string): Value { return { kind: "string", value }; }
function num(value: number): Value { return { kind: "number", value }; }
function result(completion: ValueCompletion): Value {
    if (completion.type !== "normal") throw new Error("N expected normal completion");
    return completion.value;
}
function expect(completion: ValueCompletion, expected: Value, label: string): void {
    check(sameValue(result(completion), expected), label);
}
function error(completion: ValueCompletion, message: string, at: Location = loc, name: string = "TypeError"): void {
    check(completion.type === "throw" && completion.diagnostic.phase === "runtime"
        && completion.diagnostic.name === name && completion.diagnostic.message === message
        && completion.diagnostic.loc.line === at.line && completion.diagnostic.loc.column === at.column
        && sameValue(completion.value, str(name + ": " + message)), "exact diagnostic " + message);
}
function put(object: GuestObject, key: PropertyKey, value: Value): void {
    object.bootstrapDefine(key, { value, writable: true, enumerable: false, configurable: true });
}
function keys(actual: PropertyKey[], expected: PropertyKey[]): void {
    check(actual.length === expected.length, "key count");
    for (let i = 0; i < expected.length; i++) check(actual[i] === expected[i], "key identity/order");
}
class NoReads extends GuestObject {
    internalGet(_key: PropertyKey, _receiver: Value, _at: Location): ValueCompletion {
        throw new Error("N unexpected receiver/argument read");
    }
}
class ObservedNumber extends GuestNumber {
    reads: PropertyKey[] = [];
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        this.reads.push(key);
        return super.internalGet(key, receiver, at);
    }
}

export function testNumberConversions(): void {
    const a = new Realm((_line) => {});
    const b = new Realm((_line) => {});
    const c = new Realm((_line) => {});
    const evaluator = new Evaluator(a);
    const ignored = obj(new NoReads());
    const method = b.numberPrototype.get("valueOf");
    const realms = [a, b, c];
    for (let i = 0; i < realms.length; i++) {
        const realm = realms[i];
        const root = realm.numberPrototype;
        keys(root.ownPropertyKeys(), ["toString", "valueOf"]);
        check(root.getPrototypeOf() === realm.objectPrototype && root.callable === null && root.isExtensible(), "root invariants");
        const descriptor = root.getOwnProperty("valueOf");
        check(descriptor !== undefined && descriptor.writable && !descriptor.enumerable && descriptor.configurable, "method flags");
        const value = root.get("valueOf");
        if (value.kind !== "object") throw new Error("N missing method");
        check(value.object.callable !== null && value.object.callable.realm === realm
            && value.object.getPrototypeOf() === realm.functionPrototype, "owner/function root");
        keys(value.object.ownPropertyKeys(), ["name", "length"]);
        check(sameValue(value.object.get("name"), str("valueOf")) && sameValue(value.object.get("length"), num(0)), "metadata");
        for (const key of ["name", "length"]) {
            const metadata = value.object.getOwnProperty(key);
            check(metadata !== undefined && !metadata.writable && !metadata.enumerable && metadata.configurable, "metadata flags");
        }
        for (let j = 0; j < i; j++) check(!sameValue(value, realms[j].numberPrototype.get("valueOf")), "fresh methods");
        expect(evaluator.call(method, obj(root), [ignored], loc), num(0), "N1 real +0 root");
        const text = root.get("toString");
        const descriptorText = root.getOwnProperty("toString");
        check(descriptorText !== undefined && descriptorText.writable && !descriptorText.enumerable && descriptorText.configurable, "toString flags");
        if (text.kind !== "object") throw new Error("missing toString");
        check(text.object.callable !== null && text.object.callable.realm === realm && text.object.getPrototypeOf() === realm.functionPrototype, "toString owner");
        keys(text.object.ownPropertyKeys(), ["name", "length"]);
        check(sameValue(text.object.get("name"), str("toString")) && sameValue(text.object.get("length"), num(1)), "toString metadata");
        for (const key of ["name", "length"]) {
            const metadata = text.object.getOwnProperty(key);
            check(metadata !== undefined && !metadata.writable && !metadata.enumerable && metadata.configurable, "toString metadata flags");
        }
        for (let j = 0; j < i; j++) check(!sameValue(text, realms[j].numberPrototype.get("toString")), "fresh toString");
        expect(evaluator.call(text, obj(root), [], loc), str("0"), "N1 root string");
    }
    for (const payload of [0, -0, NaN, Infinity, -Infinity, 10.5, -255]) {
        const observed = new ObservedNumber(payload, a.numberPrototype);
        const foreign = c.createNumberObject(payload);
        foreign.setPrototypeOf(null);
        put(foreign, "numberData", num(99));
        put(observed, "numberData", num(99));
        put(observed, "valueOf", ignored);
        const receivers: Value[] = [num(payload), obj(a.createNumberObject(payload)), obj(foreign), obj(observed)];
        for (const receiver of receivers) {
            const extracted = thisNumberValue(receiver, loc);
            check(extracted.type === "normal" && sameValue(num(extracted.value), num(payload)), "N1-N4/N8 helper payload");
            expect(evaluator.call(method, receiver, [ignored, ignored], loc), num(payload), "N1-N4/N8 exact payload");
            const expected = payload === 0 ? "0" : Number.isNaN(payload) ? "NaN" : payload === Infinity ? "Infinity" : payload === -Infinity ? "-Infinity" : payload === 10.5 ? "10.5" : "-255";
            expect(evaluator.call(b.numberPrototype.get("toString"), receiver, [UNDEFINED, ignored], loc), str(expected), "N1-N4/N8 string");
            if (payload === 10.5 || payload === -255) expect(evaluator.call(b.numberPrototype.get("toString"), receiver, [num(16)], loc), str(payload === 10.5 ? "a.8" : "-ff"), "N4 radix");
        }
        check(observed.reads.length === 0, "N8 no receiver reads");
    }
    const lookalike = new GuestObject(a.numberPrototype);
    put(lookalike, "numberData", num(2));
    // Pinned scriptc adapts an inferred never-return callback through the dynamic tier.
    // Retained reduction: docs/validation/ts-021a/reduction/. Keep the hook throwing.
    put(lookalike, "valueOf", obj(a.createBuiltin("fake", 0, (_r, _a, _c, _l): ValueCompletion => {
        throw new Error("N fake hook must not run");
    })));
    const namespace = a.global.bindings.get("Number");
    if (namespace === undefined) throw new Error("N missing namespace");
    const invalid: Value[] = [UNDEFINED, { kind: "null" }, { kind: "boolean", value: false }, str("2"),
        { kind: "symbol", value: new GuestSymbol("n") }, obj(a.createObject()), namespace.value,
        obj(a.createArray()), obj(a.functionPrototype), obj(a.createGuestFunction([], [], a.global, null)),
        obj(a.objectPrototype), obj(a.booleanPrototype), obj(a.stringPrototype), obj(a.symbolPrototype),
        obj(a.createBooleanObject(true)), obj(a.createStringObject("2")), obj(a.createSymbolObject(new GuestSymbol("n"))),
        obj(lookalike), ignored];
    for (const receiver of invalid) {
        const extracted = thisNumberValue(receiver, loc);
        if (extracted.type !== "throw") throw new Error("N invalid helper accepted");
        check(extracted.diagnostic.loc === loc, "helper location identity");
        error(extracted, "receiver is not a number");
        error(evaluator.call(method, receiver, [ignored], loc), "receiver is not a number");
        const rejected = evaluator.call(b.numberPrototype.get("toString"), receiver, [ignored], loc);
        error(rejected, "receiver is not a number");
        check(rejected.type === "throw" && rejected.diagnostic.loc === loc, "N5-N7/R16 location identity");
    }
    for (const receiver of [num(-0), obj(c.createNumberObject(-0)), obj(b.numberPrototype), ignored]) {
        const active = new Evaluator(a, 0, 3);
        const bridge = obj(c.createBuiltin("bridge", 0, (_r, _args, context, at) => {
            check(context.realm === c && active.calls === 1, "C entry");
            const returned = context.call(c.functionPrototype.get("call"), method, [receiver, ignored], at);
            check(context.realm === c && active.calls === 1, "C restoration");
            return returned;
        }));
        const returned = active.call(bridge, UNDEFINED, [], loc);
        if (receiver === ignored) error(returned, "receiver is not a number");
        else expect(returned, receiver.kind === "object" && receiver.object === b.numberPrototype ? num(0) : num(-0), "borrowed payload");
        check(active.context.realm === a && active.calls === 0 && active.depth === 0 && active.steps === 0, "zero body ticks and cleanup");
        active.maxCalls = 2;
        error(active.call(bridge, UNDEFINED, [], loc), "call depth limit exceeded", loc, "RangeError");
        check(active.context.realm === a && active.calls === 0 && active.steps === 0, "shared call limit cleanup");
    }
    const shared = new Evaluator(a, 1, 3);
    for (const mode of ["steps", "host"]) {
        const bridge = obj(c.createBuiltin("cleanup", 0, (_r, _args, context, at) => {
            expect(context.call(c.functionPrototype.get("call"), method, [num(2)], at), num(2), "nested success");
            check(context.realm === c, "C restored before abrupt");
            if (mode === "host") throw new Error("N host sentinel");
            const tick = context.tick(at);
            if (tick.type === "throw") return tick;
            return context.tick(at);
        }));
        let hostFault = false;
        try {
            error(shared.call(bridge, UNDEFINED, [], loc), "execution step limit exceeded", loc, "RangeError");
        } catch (fault) {
            check(mode === "host" && fault instanceof Error && fault.message === "N host sentinel", "host fault identity");
            hostFault = true;
        }
        check(hostFault === (mode === "host") && shared.steps === 2 && shared.context.realm === a
            && shared.calls === 0 && shared.depth === 0, "shared exhaustion/host cleanup");
        expect(shared.call(method, num(2), [], loc), num(2), "zero ticks after exhaustion");
    }
    shared.maxCalls = 0;
    error(shared.call(method, ignored, [], loc), "call depth limit exceeded", loc, "RangeError");
    testNumberToString();
    testNumberStringRuntime();
    testRadixBoundaries();
    testLookupAndLengths();
    testMapLimits();
    testGuestConsumers();
}

function testLookupAndLengths(): void {
    const realm = new Realm((_line) => {});
    const other = new Realm((_line) => {});
    const evaluator = new Evaluator(realm);
    const box = new ObservedNumber(2, realm.numberPrototype);
    const boxed = obj(box);
    const saved = realm.numberPrototype.get("valueOf");
    let calls = 0;
    const context: OperationContext = {
        realm,
        tick: (at) => evaluator.context.tick(at),
        call: (callee, receiver, args, at) => {
            calls++;
            return evaluator.context.call(callee, receiver, args, at);
        },
    };
    const hints: PrimitiveHint[] = ["default", "number", "string"];
    for (const hint of hints) {
        box.reads = [];
        calls = 0;
        const before = evaluator.steps;
        expect(toPrimitive(boxed, hint, context, loc), hint === "string" ? str("2") : num(2), "full hints");
        keys(box.reads, hint === "string" ? [wellKnownToPrimitive, "toString"] : [wellKnownToPrimitive, "valueOf"]);
        check(calls === 1 && evaluator.steps === before + 2, "exact hint work");
    }
    box.reads = [];
    for (const converted of [toNumber(boxed, loc), toString(boxed, loc), toUint32(boxed, loc), toIntegerOrInfinity(boxed, loc), toLength(boxed, loc)]) {
        if (converted.type !== "throw") throw new Error("N direct converter accepted box");
        error(converted, "object-to-primitive conversion unsupported");
    }
    check(box.reads.length === 0, "direct converters no hooks");
    const tight = new Evaluator(realm, 0);
    error(toPrimitive(boxed, "number", tight.context, loc), "execution step limit exceeded", loc, "RangeError");
    check(tight.steps === 1 && box.reads.length === 0 && tight.calls === 0, "guard before Get");
    expect(evaluator.call(realm.objectPrototype.get("valueOf"), boxed, [], loc), boxed, "Object identity");
    const fresh = result(evaluator.call(realm.objectPrototype.get("valueOf"), num(-0), [], loc));
    check(fresh.kind === "object" && fresh.object instanceof GuestNumber && 1 / fresh.object.numberData === -Infinity
        && fresh.object.getPrototypeOf() === realm.numberPrototype, "Object boxes rather than extracts");
    expect(evaluator.call(realm.objectPrototype.get("toString"), boxed, [], loc), str("[object Number]"), "borrowed Object tag");
    for (const method of [realm.booleanPrototype.get("valueOf"), realm.booleanPrototype.get("toString"), realm.stringPrototype.get("valueOf"), realm.stringPrototype.get("toString"), realm.symbolPrototype.get("valueOf")]) {
        const returned = evaluator.call(method, boxed, [], loc);
        check(returned.type === "throw", "other families reject Number slot");
    }
    for (const mode of ["delete", "noncallable", "object"]) {
        realm.numberPrototype.internalDelete("valueOf");
        if (mode === "noncallable") put(box, "valueOf", num(9));
        if (mode === "object") put(box, "valueOf", obj(realm.createBuiltin("object", 0, (receiver, _a, _c, _l) => normal(receiver))));
        box.reads = [];
        calls = 0;
        const before = evaluator.steps;
        expect(toPrimitive(boxed, "number", context, loc), str("2"), "actual fallback " + mode);
        keys(box.reads, [wellKnownToPrimitive, "valueOf", "toString"]);
        check(calls === (mode === "noncallable" ? 1 : 2) && evaluator.steps === before + 3, "fallback exact work");
        expect(evaluator.call(saved, boxed, [], loc), num(2), "saved method survives mutation");
        check(other.numberPrototype.getOwnProperty("valueOf") !== undefined, "Realm mutation isolation");
    }
    put(box, "valueOf", obj(realm.createBuiltin("replaceNext", 0, (receiver, _a, _c, _l) => {
        put(box, "toString", obj(realm.createBuiltin("fresh", 0, (_r, _a2, _c2, _l2) => normal(str("fresh")))));
        return normal(receiver);
    })));
    box.reads = [];
    calls = 0;
    let before = evaluator.steps;
    expect(toPrimitive(boxed, "number", context, loc), str("fresh"), "fresh fallback");
    keys(box.reads, [wellKnownToPrimitive, "valueOf", "toString"]);
    check(calls === 2 && evaluator.steps === before + 3, "fresh fallback work");
    const objectResult = obj(realm.createBuiltin("object", 0, (receiver, _a, _c, _l) => normal(receiver)));
    put(box, "valueOf", objectResult);
    put(box, "toString", objectResult);
    calls = 0;
    before = evaluator.steps;
    error(toPrimitive(boxed, "default", context, loc), "cannot convert object to primitive");
    check(calls === 2 && evaluator.steps === before + 3, "both-object negative work");
    put(box, wellKnownToPrimitive, obj(realm.createBuiltin("canonical", 1, (receiver, args, _c, _l) => {
        check(receiver === boxed && sameValue(args[0], str("string")), "canonical receiver/hint");
        return normal(num(7));
    })));
    box.reads = [];
    calls = 0;
    before = evaluator.steps;
    expect(toPrimitive(boxed, "string", context, loc), num(7), "canonical precedence");
    keys(box.reads, [wellKnownToPrimitive]);
    check(calls === 1 && evaluator.steps === before + 1, "canonical exact work");
    const sentinel = failure("RangeError", "sentinel", loc);
    put(box, wellKnownToPrimitive, obj(realm.createBuiltin("throw", 0, (_r, _a, _c, _l) => sentinel)));
    check(toPrimitive(boxed, "default", context, loc) === sentinel, "abrupt identity");
    box.internalDelete(wellKnownToPrimitive);
    box.internalDelete("valueOf");
    box.internalDelete("toString");
    box.setPrototypeOf(null);
    calls = 0;
    before = evaluator.steps;
    error(toPrimitive(boxed, "number", context, loc), "cannot convert object to primitive");
    check(calls === 0 && evaluator.steps === before + 3, "null-root exact negative");
    put(realm.numberPrototype, "valueOf", saved);
    testLengths(realm);
}

function testLengths(realm: Realm): void {
    for (const payload of [2, -0, 2.5, NaN, -1, Infinity]) {
        const evaluator = new Evaluator(realm);
        const box = new ObservedNumber(payload, realm.numberPrototype);
        const target = realm.createArray();
        put(target, "0", num(10));
        put(target, "1", num(20));
        put(target, "2", num(30));
        const returned = target.defineOwnProperty("length", { value: obj(box) }, evaluator.context, loc);
        if (payload === 2 || payload === 0) {
            check(returned.type === "normal" && returned.value, "valid length");
            check(sameValue(target.get("length"), num(payload === 0 ? 0 : 2)) && target.getOwnProperty("2") === undefined, "truncated storage/+0");
        } else {
            if (returned.type !== "throw") throw new Error("N invalid length accepted");
            error(returned, "invalid array length", loc, "RangeError");
            check(sameValue(target.get("length"), num(3)) && sameValue(target.get("2"), num(30)), "invalid length atomicity");
        }
        keys(box.reads, [wellKnownToPrimitive, "valueOf", wellKnownToPrimitive, "valueOf"]);
        check(evaluator.steps === 4, "two uncached length conversions");
    }
    const evaluator = new Evaluator(realm);
    const box = realm.createNumberObject(2);
    let calls = 0;
    put(box, "valueOf", obj(realm.createBuiltin("first", 0, (_r, _a, _c, _l) => {
        calls++;
        put(box, "valueOf", obj(realm.createBuiltin("second", 0, (_r2, _a2, _c2, _l2) => {
            calls++;
            return normal(num(1));
        })));
        return normal(num(2));
    })));
    const target = realm.createArray();
    put(target, "2", num(30));
    const changed = target.defineOwnProperty("length", { value: obj(box) }, evaluator.context, loc);
    if (changed.type !== "throw") throw new Error("N cached length result");
    error(changed, "invalid array length", loc, "RangeError");
    check(calls === 2 && evaluator.steps === 4 && sameValue(target.get("length"), num(3))
        && sameValue(target.get("2"), num(30)), "fresh method/result and atomicity");
    for (const payload of [2.9, -1]) {
        const active = new Evaluator(realm);
        const holder = realm.createObject();
        put(holder, "length", obj(realm.createNumberObject(payload)));
        const length = lengthOfArrayLike(holder, active.context, loc);
        check(length.type === "normal" && length.value === (payload === 2.9 ? 2 : 0) && active.steps === 2, "array-like numeric payload and work");
    }
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function testGuestConsumers(): void {
    const realm = new Realm((_line) => {});
    const evaluator = new Evaluator(realm);
    const rows: { name: string; payload: number }[] = [
        { name: "box", payload: 2 }, { name: "positiveZero", payload: 0 },
        { name: "negativeZero", payload: -0 }, { name: "nanBox", payload: NaN },
        { name: "infinite", payload: Infinity }, { name: "fraction", payload: 2.9 },
        { name: "negative", payload: -1 },
    ];
    for (const row of rows) seed(realm, row.name, obj(realm.createNumberObject(row.payload)));
    seed(realm, "root", obj(realm.numberPrototype));
    seed(realm, "check", obj(realm.createBuiltin("check", 1, (_r, args, _c, _l) => {
        check(args[0].kind === "boolean" && args[0].value, "runtime fixture assertion");
        return normal();
    })));
    seed(realm, "arrayLikeLength", obj(realm.createBuiltin("arrayLikeLength", 1, (_r, args, context, at) => {
        if (args[0].kind !== "object") throw new Error("N length receiver");
        const length = lengthOfArrayLike(args[0].object, context, at);
        return length.type === "throw" ? length : normal(num(length.value));
    })));
    seed(realm, "map", obj(realm.createBuiltin("map", 2, (_r, args, context, at) => {
        if (args[0].kind !== "object") throw new Error("N map receiver");
        return mapObjectDefaultArray(args[0].object, args[1], UNDEFINED, context, at);
    })));
    const parsed = parse(readFileSync("test/fixtures/number-conversions.js", "utf8"));
    check(parsed.error === null, "fixture parse");
    check(evaluator.block(parsed.body, realm.global, UNDEFINED).type === "normal", "fixture execution");
    const primitiveMember = realm.global.bindings.get("primitiveMember");
    if (primitiveMember === undefined) throw new Error("missing primitiveMember");
    const primitiveRead = evaluator.call(primitiveMember.value, UNDEFINED, [], loc);
    check(primitiveRead.type === "normal" && sameValue(primitiveRead.value, realm.numberPrototype.get("valueOf")), "primitiveMember positive read");
    const negatives: { name: string; line: number; column: number; message: string; errorName: string }[] = [
        { name: "invalidLength", line: 75, column: 5, message: "invalid array length", errorName: "RangeError" },
        { name: "invalidReceiver", line: 78, column: 12, message: "receiver is not a number", errorName: "TypeError" },
        { name: "namespaceCall", line: 84, column: 12, message: "value is not callable", errorName: "TypeError" },
        { name: "bothObjects", line: 93, column: 12, message: "cannot convert object to primitive", errorName: "TypeError" },
    ];
    for (const row of negatives) {
        const binding = realm.global.bindings.get(row.name);
        if (binding === undefined) throw new Error("N missing negative function");
        error(evaluator.call(binding.value, UNDEFINED, [], loc), row.message, { line: row.line, column: row.column }, row.errorName);
    }
    const early = realm.global.bindings.get("argumentFirst");
    if (early === undefined) throw new Error("N missing argument test");
    const thrown = evaluator.call(early.value, UNDEFINED, [], loc);
    check(thrown.type === "throw" && sameValue(thrown.value, str("argument sentinel"))
        && thrown.diagnostic.loc.line === 87 && thrown.diagnostic.loc.column === 5, "argument abrupt before receiver validation");
    const target = realm.global.bindings.get("target");
    check(target !== undefined && target.value.kind === "object" && sameValue(target.value.object.get("length"), num(3))
        && sameValue(target.value.object.get("2"), num(3)), "fixture invalid length preserves storage");
}


function testMapLimits(): void {
    const realm = new Realm((_line) => {});
    const input = realm.createObject();
    put(input, "0", num(10));
    put(input, "1", num(20));
    put(input, "length", obj(realm.createNumberObject(2)));
    let order = "";
    const callback = obj(realm.createBuiltin("callback", 3, (_r, args, _c, _l) => {
        check(args[0].kind === "number" && args[1].kind === "number" && args[2].kind === "object"
            && args[2].object === input, "map arguments");
        if (args[1].kind !== "number" || args[0].kind !== "number") throw new Error("N callback values");
        order += args[1].value;
        return normal(num(args[0].value + 1));
    }));
    const evaluator = new Evaluator(realm);
    const mapped = result(mapObjectDefaultArray(input, callback, UNDEFINED, evaluator.context, loc));
    check(mapped.kind === "object" && sameValue(mapped.object.get("0"), num(11))
        && sameValue(mapped.object.get("1"), num(21)) && sameValue(mapped.object.get("length"), num(2))
        && order === "01" && evaluator.steps === 4, "map exact values/order/work");
    order = "";
    const tight = new Evaluator(realm, 2);
    error(mapObjectDefaultArray(input, callback, UNDEFINED, tight.context, loc), "execution step limit exceeded", loc, "RangeError");
    check(order === "" && tight.steps === 3 && tight.calls === 0, "map shared step limit");
    const noCalls = new Evaluator(realm, 20, 0);
    error(mapObjectDefaultArray(input, callback, UNDEFINED, noCalls.context, loc), "call depth limit exceeded", loc, "RangeError");
    check(order === "" && noCalls.steps === 2 && noCalls.calls === 0, "length method shares call limit");
    put(input, "length", obj(realm.createNumberObject(Infinity)));
    const oversized = new Evaluator(realm);
    error(mapObjectDefaultArray(input, callback, UNDEFINED, oversized.context, loc), "map result length exceeds array limit", loc, "RangeError");
    check(order === "" && oversized.steps === 2, "map checks converted length before callbacks");
}

// Radix reads are observable host operations; guest accessors remain outside scope.
class RadixReads extends GuestObject {
    reads: PropertyKey[] = [];
    abrupt: ValueCompletion | null = null;
    fault: Error | null = null;
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        this.reads.push(key);
        if (this.fault !== null) throw this.fault;
        if (this.abrupt !== null) return this.abrupt;
        return super.internalGet(key, receiver, at);
    }
}
function testNumberToString(): void {
    const a = new Realm((_line) => {});
    const b = new Realm((_line) => {});
    const c = new Realm((_line) => {});
    const d = new Realm((_line) => {});
    const method = b.numberPrototype.get("toString");
    const e = new Evaluator(a);
    const range = "radix must be between 2 and 36";
    const symbol: Value = { kind: "symbol", value: new GuestSymbol("radix") };
    for (const args of [[], [UNDEFINED]]) expect(e.call(method, num(255), args, loc), str("255"), "R1");
    const valid: { radix: Value; text: string }[] = [
        { radix: num(2), text: "11111111" }, { radix: num(16), text: "ff" }, { radix: num(36), text: "73" },
        { radix: num(2.9), text: "11111111" }, { radix: num(16.9), text: "ff" }, { radix: num(36.9), text: "73" },
        { radix: str("16"), text: "ff" }, { radix: str(" 0x10 "), text: "ff" },
        { radix: str("2.9"), text: "11111111" }, { radix: str("36.9"), text: "73" },
    ];
    for (const row of valid) expect(e.call(method, num(255), [row.radix, obj(new NoReads())], loc), str(row.text), "R2/R3/R6");
    for (const radix of [num(1.9), num(37), num(-2.9), num(Infinity), num(-Infinity), num(0), num(-0), num(NaN),
        { kind: "null" } as Value, { kind: "boolean", value: false } as Value, { kind: "boolean", value: true } as Value,
        str(""), str(" "), str("bad")]) error(e.call(method, num(255), [radix], loc), range, loc, "RangeError");
    for (const payload of [NaN, Infinity, -Infinity, -0, 0]) {
        error(e.call(method, num(payload), [num(1)], loc), range, loc, "RangeError");
        error(e.call(method, num(payload), [symbol], loc), "cannot convert symbol to number");
        expect(e.call(method, num(payload), [num(2)], loc), str(Number.isNaN(payload) ? "NaN" : payload === Infinity ? "Infinity" : payload === -Infinity ? "-Infinity" : "0"), "R15 valid special");
    }
    // R8-R13: literal results, exact lookup order and conversion-only work.
    for (const mode of ["canonical", "absent", "null", "fallback", "undefined", "false", "true", "nullResult", "symbol", "noncallable", "object", "bothObjects", "empty"]) {
        const radix = new RadixReads(null);
        let calls = 0;
        const hook = obj(d.createBuiltin("radix", 1, (receiver, args, context, _at) => {
            calls++;
            check(receiver.kind === "object" && receiver.object === radix && context.realm === d, "radix receiver/Realm");
            if (mode !== "fallback" && mode !== "absent" && mode !== "null" && mode !== "bothObjects") check(sameValue(args[0], str("number")), "R8 numeric hint");
            if (mode === "undefined") return normal();
            if (mode === "false" || mode === "true") return normal({ kind: "boolean", value: mode === "true" });
            if (mode === "nullResult") return normal({ kind: "null" });
            if (mode === "symbol") return normal(symbol);
            if (mode === "fallback") {
                put(radix, "toString", obj(d.createBuiltin("fresh", 0, (_r, _a, _c, _l) => { calls++; return normal(str("16")); })));
                return normal(receiver);
            }
            if (mode === "object" || mode === "bothObjects") return normal(receiver);
            return normal(num(16));
        }));
        if (mode === "absent" || mode === "null" || mode === "fallback" || mode === "bothObjects") {
            if (mode === "null") put(radix, wellKnownToPrimitive, { kind: "null" });
            put(radix, "valueOf", hook);
            put(radix, "toString", hook);
        } else if (mode !== "empty") put(radix, wellKnownToPrimitive, mode === "noncallable" ? num(1) : hook);
        const active = new Evaluator(a);
        const returned = active.call(method, num(255), [obj(radix)], loc);
        if (["undefined", "false", "true", "nullResult"].includes(mode)) error(returned, range, loc, "RangeError");
        else if (mode === "symbol") error(returned, "cannot convert symbol to number");
        else if (mode === "noncallable") error(returned, "symbol toPrimitive method is not callable");
        else if (mode === "object" || mode === "bothObjects" || mode === "empty") error(returned, "cannot convert object to primitive");
        else expect(returned, str("ff"), "R8-R10");
        const ordinary = mode === "absent" || mode === "null";
        const fallback = mode === "fallback" || mode === "bothObjects" || mode === "empty";
        keys(radix.reads, fallback ? [wellKnownToPrimitive, "valueOf", "toString"] : ordinary ? [wellKnownToPrimitive, "valueOf"] : [wellKnownToPrimitive]);
        check(active.steps === (fallback ? 3 : ordinary ? 2 : 1) && calls === (mode === "empty" || mode === "noncallable" ? 0 : fallback ? 2 : 1), "R exact budgets");
        check(active.context.realm === a && active.calls === 0 && active.depth === 0, "R cleanup");
    }
    testRadixAbrupt(a, b, c, d);
    // Saved methods keep slots after root deletion; string fallback re-exposes Object tags.
    const box = b.createNumberObject(2);
    b.numberPrototype.internalDelete("toString");
    expect(e.call(method, obj(box), [num(16)], loc), str("2"), "saved toString");
    const before = e.steps;
    expect(toPrimitive(obj(box), "string", e.context, loc), str("[object Number]"), "deleted toString Object fallback");
    check(e.steps === before + 3 && a.numberPrototype.getOwnProperty("toString") !== undefined, "deleted fallback budget/isolation");
    put(b.numberPrototype, "toString", num(1));
    expect(toPrimitive(obj(box), "string", e.context, loc), num(2), "noncallable toString falls back valueOf");
}

function testRadixAbrupt(a: Realm, b: Realm, c: Realm, d: Realm): void {
    const method = b.numberPrototype.get("toString");
    const sentinel = failure("RangeError", "radix sentinel", { line: 22, column: 3 });
    const hostFault = new Error("radix host sentinel");
    for (const mode of ["normal", "get", "call", "hostGet", "hostCall", "tick", "callGuard"]) {
        const active = new Evaluator(a, mode === "tick" ? 0 : 100, mode === "callGuard" ? 3 : 4);
        const radix = new RadixReads(null);
        let entries = 0;
        if (mode === "get") radix.abrupt = sentinel;
        if (mode === "hostGet") radix.fault = hostFault;
        put(radix, wellKnownToPrimitive, obj(d.createBuiltin("radix", 1, (_r, _args, context, _at) => {
            entries++;
            check(context.realm === d && active.calls === 4, "A C call B D peak four");
            if (mode === "hostCall") throw hostFault;
            return mode === "call" ? sentinel : normal(num(16));
        })));
        const bridge = obj(c.createBuiltin("bridge", 0, (_r, _args, context, at) => {
            check(context.realm === c && active.calls === 1, "C bridge entry");
            const returned = context.call(c.functionPrototype.get("call"), method, [num(255), obj(radix)], at);
            check(context.realm === c && active.calls === 1, "C forwarding restored");
            return returned;
        }));
        let caught = false;
        try {
            const returned = active.call(bridge, UNDEFINED, [], loc);
            if (mode === "get" || mode === "call") check(returned === sentinel && returned.value === sentinel.value, "R14 exact abrupt identity");
            else if (mode === "tick") error(returned, "execution step limit exceeded", loc, "RangeError");
            else if (mode === "callGuard") error(returned, "call depth limit exceeded", loc, "RangeError");
            else expect(returned, str("ff"), "cross-Realm normal");
        } catch (fault) {
            check(fault instanceof Error && fault === hostFault && (mode === "hostGet" || mode === "hostCall"), "host fault identity");
            caught = true;
        }
        check(caught === (mode === "hostGet" || mode === "hostCall"), "host fault observed");
        check(active.steps === 1 && active.calls === 0 && active.depth === 0 && active.context.realm === a, "all paths restore shared state");
        check(radix.reads.length === (mode === "tick" ? 0 : 1) && entries === (mode === "normal" || mode === "call" || mode === "hostCall" ? 1 : 0), "guard before read/call");
        expect(active.call(method, num(2), [], loc), str("2"), "primitive radix after exhausted steps");
    }
    const radix = new RadixReads(null);
    const context: OperationContext = { realm: a, tick: (_at) => sentinel, call: (_fn, _r, _args, _at) => sentinel };
    // Direct builtin entry isolates an arbitrary tick/call completion from evaluator guards.
    if (method.kind !== "object" || method.object.callable === null || method.object.callable.kind !== "builtin") throw new Error("missing builtin");
    check(method.object.callable.invoke(num(2), [obj(radix)], context, loc) === sentinel && radix.reads.length === 0, "tick completion identity");
    context.tick = (_at) => normal();
    put(radix, wellKnownToPrimitive, obj(d.createBuiltin("unused", 0, (_r, _a, _c, _l) => normal(num(16)))));
    check(method.object.callable.invoke(num(2), [obj(radix)], context, loc) === sentinel, "call completion identity");
    const noCalls = new Evaluator(a, 0, 0);
    error(noCalls.call(method, UNDEFINED, [obj(radix)], loc), "call depth limit exceeded", loc, "RangeError");
    check(noCalls.steps === 0 && noCalls.calls === 0, "entry guard precedes receiver");
}

function testNumberStringRuntime(): void {
    const realm = new Realm((_line) => {});
    const e = new Evaluator(realm);
    seed(realm, "root", obj(realm.numberPrototype));
    seed(realm, "check", obj(realm.createBuiltin("check", 1, (_r, args, _c, _l) => {
        check(args[0].kind === "boolean" && args[0].value, "toString runtime assertion");
        return normal();
    })));
    const parsed = parse(readFileSync("test/fixtures/number-tostring.js", "utf8"));
    check(parsed.error === null, "toString fixture parse");
    check(e.block(parsed.body, realm.global, UNDEFINED).type === "normal", "toString fixture load");
    const run = realm.global.bindings.get("run");
    if (run === undefined) throw new Error("missing runtime function");
    const view = new DataView(new ArrayBuffer(8));
    let count = 0;
    for (const line of readFileSync("test/fixtures/number-tostring-vectors.txt", "utf8").trim().split("\n")) {
        const fields = line.trim().split(" ");
        view.setBigUint64(0, BigInt("0x" + fields[0]), false);
        const value = view.getFloat64(0, false);
        const radix = Number(fields[1]);
        for (const sign of [1, -1]) {
            const expected = sign === 1 ? fields[2] : "-" + fields[2];
            expect(e.call(run.value, UNDEFINED, [num(value * sign), obj(realm.createNumberObject(value * sign)), num(radix), str(expected)], loc), UNDEFINED, "literal runtime radix vector");
        }
        count++;
    }
    check(count === 24, "all frozen literal vectors including seven cross-power choices");
    for (const row of [
        { name: "invalidRadix", line: 20, column: 12, message: "radix must be between 2 and 36", errorName: "RangeError" },
        { name: "invalidStringReceiver", line: 23, column: 12, message: "receiver is not a number", errorName: "TypeError" },
    ]) {
        const binding = realm.global.bindings.get(row.name);
        if (binding === undefined) throw new Error("missing runtime negative");
        error(e.call(binding.value, UNDEFINED, [], loc), row.message, { line: row.line, column: row.column }, row.errorName);
    }
    const early = realm.global.bindings.get("earlyArgument");
    if (early === undefined) throw new Error("missing early argument");
    const thrown = e.call(early.value, UNDEFINED, [], loc);
    check(thrown.type === "throw" && sameValue(thrown.value, str("early radix argument")) && thrown.diagnostic.loc.line === 26 && thrown.diagnostic.loc.column === 5, "argument throw preempts receiver");
}

// Exercise every ordinary boundary, not only the canonical hook's first Get.
class RadixBoundary extends RadixReads {
    target = 1;
    sentinel: ValueCompletion = normal();
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        if (this.reads.length + 1 === this.target) {
            this.reads.push(key);
            return this.sentinel;
        }
        return super.internalGet(key, receiver, at);
    }
}
function testRadixBoundaries(): void {
    const a = new Realm((_line) => {});
    const b = new Realm((_line) => {});
    const d = new Realm((_line) => {});
    const method = b.numberPrototype.get("toString");
    const sentinel = failure("TypeError", "boundary sentinel", loc);
    for (const boundary of [1, 2, 3]) {
        for (const mode of ["get", "tick", "call"]) {
            const e = new Evaluator(a);
            const radix = new RadixBoundary(null);
            radix.target = mode === "get" ? boundary : 99;
            radix.sentinel = sentinel;
            let ticks = 0;
            let calls = 0;
            let restored = 0;
            const originalCall = e.context.call;
            const originalTick = e.context.tick;
            e.context.tick = (at) => {
                ticks++;
                if (mode === "tick" && ticks === boundary) return sentinel;
                return originalTick(at);
            };
            e.context.call = (fn, receiver, args, at) => {
                if (fn !== method) {
                    calls++;
                    check(e.context.realm === b, "B before radix call");
                    if (mode === "call" && calls === (boundary === 3 ? 2 : 1)) return sentinel;
                }
                const returned = originalCall(fn, receiver, args, at);
                if (fn !== method) {
                    check(e.context.realm === b, "B restored after D radix call");
                    restored++;
                }
                return returned;
            };
            const objectResult = obj(d.createBuiltin("object", 0, (receiver, _args, context, _at) => {
                check(context.realm === d, "D boundary entry");
                return normal(receiver);
            }));
            if (boundary === 1 && mode === "call") put(radix, wellKnownToPrimitive, objectResult);
            else {
                put(radix, "valueOf", objectResult);
                put(radix, "toString", objectResult);
            }
            check(e.call(method, num(255), [obj(radix)], loc) === sentinel, "original boundary completion");
            check(ticks === boundary && radix.reads.length === (mode === "tick" ? boundary - 1 : boundary), "exact boundary work");
            check(e.calls === 0 && e.depth === 0 && e.context.realm === a, "boundary cleanup");
            check(restored === (boundary === 3 ? 1 : 0), "completed earlier calls only");
        }
    }
}
