// M1-M8 extend the existing object-valueof driver in both compiled lanes.
import { readFileSync } from "node:fs";
import { thisBooleanValue } from "../src/builtins/boolean.js";
import { thisStringValue } from "../src/builtins/string.js";
import { lengthOfArrayLike } from "../src/array-like.js";
import { mapObjectDefaultArray } from "../src/array-map.js";
import { toNumber, toString, toUint32, toIntegerOrInfinity, toLength } from "../src/conversion.js";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { GuestBoolean, GuestStringObject } from "../src/primitive-objects.js";
import { toPrimitive, type PrimitiveHint } from "../src/primitive-conversion.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, type Value, type ValueCompletion, type PropertyKey, type OperationContext } from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";

const loc: Location = { line: 91, column: 7 };
function check(ok: boolean, label: string): void {
    if (!ok) throw new Error("M " + label);
}
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function str(value: string): Value { return { kind: "string", value }; }
function num(value: number): Value { return { kind: "number", value }; }
function result(completion: ValueCompletion): Value {
    if (completion.type !== "normal") throw new Error("M expected normal completion");
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
    internalGet(_key: PropertyKey, _receiver: Value, context: OperationContext, _at: Location): ValueCompletion {
        throw new Error("M unexpected receiver/argument read");
    }
}
class ObservedBoolean extends GuestBoolean {
    reads: PropertyKey[] = [];
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        this.reads.push(key);
        return super.internalGet(key, receiver, context, at);
    }
}
class ObservedString extends GuestStringObject {
    reads: PropertyKey[] = [];
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        this.reads.push(key);
        return super.internalGet(key, receiver, context, at);
    }
}
type Family = { root: GuestObject; otherRoots: GuestObject[]; payload: Value; text: Value; label: string };

export function testBooleanStringConversions(): void {
    const a = new Realm((_line) => {});
    const b = new Realm((_line) => {});
    const c = new Realm((_line) => {});
    const evaluator = new Evaluator(a);
    const ignored = obj(new NoReads());
    const families: Family[] = [
        { root: b.booleanPrototype, otherRoots: [a.booleanPrototype, c.booleanPrototype], payload: { kind: "boolean", value: false }, text: str("false"), label: "boolean" },
        { root: b.stringPrototype, otherRoots: [a.stringPrototype, c.stringPrototype], payload: str(""), text: str(""), label: "string" },
    ];
    for (const family of families) {
        const roots = [family.otherRoots[0], family.root, family.otherRoots[1]];
        const realms = [a, b, c];
        const methods = [family.root.get("toString", evaluator.context, loc), family.root.get("valueOf", evaluator.context, loc)];
        for (let r = 0; r < roots.length; r++) {
            keys(roots[r].ownPropertyKeys(), family.label === "string" ? ["length", "toString", "valueOf", "charAt", "charCodeAt", "slice"] : ["toString", "valueOf"]);
            check(!sameValue(roots[r].get("toString", evaluator.context, loc), roots[r].get("valueOf", evaluator.context, loc)), "distinct methods");
            for (const name of ["toString", "valueOf"]) {
                const descriptor = roots[r].getOwnProperty(name);
                check(descriptor !== undefined && descriptor.kind === "data" && descriptor.writable && !descriptor.enumerable && descriptor.configurable, "M1 method flags");
                const method = roots[r].get(name, evaluator.context, loc);
                if (method.kind !== "object") throw new Error("M missing method");
                check(method.object.callable !== null && method.object.callable.realm === realms[r]
                    && method.object.getPrototypeOf() === realms[r].functionPrototype, "M1 owner/prototype");
                keys(method.object.ownPropertyKeys(), ["name", "length"]);
                check(sameValue(method.object.get("name", evaluator.context, loc), str(name)) && sameValue(method.object.get("length", evaluator.context, loc), num(0)), "M1 metadata");
                for (const key of ["name", "length"]) {
                    const metadata = method.object.getOwnProperty(key);
                    check(metadata !== undefined && metadata.kind === "data" && !metadata.writable && !metadata.enumerable && metadata.configurable, "M1 metadata flags");
                }
                for (let other = 0; other < r; other++) check(!sameValue(method, roots[other].get(name, evaluator.context, loc)), "M1 three-Realm freshness");
            }
        }
        expect(evaluator.call(methods[0], obj(family.root), [ignored], loc), family.text, "M2 root text");
        expect(evaluator.call(methods[1], obj(family.root), [ignored], loc), family.payload, "M2 root payload");

        const lookalike = new GuestObject(family.root);
        put(lookalike, "booleanData", { kind: "boolean", value: false });
        put(lookalike, "stringData", str(""));
        const invalid: Value[] = [UNDEFINED, { kind: "null" }, num(0), num(NaN), { kind: "symbol", value: new GuestSymbol("x") },
            obj(a.createObject()), obj(new NoReads()), obj(lookalike), obj(a.createArray()),
            obj(a.functionPrototype), obj(a.createGuestFunction([], [], a.global, null)), obj(a.createNumberObject(2)),
            obj(a.createSymbolObject(new GuestSymbol("x"))), obj(a.symbolPrototype), obj(a.numberPrototype), obj(a.objectPrototype)];
        if (family.label === "boolean") invalid.push(str("false"), obj(a.createStringObject("")), obj(a.stringPrototype));
        else invalid.push({ kind: "boolean", value: false }, obj(a.createBooleanObject(false)), obj(a.booleanPrototype));
        for (const receiver of invalid) {
            const extracted = family.label === "boolean" ? thisBooleanValue(receiver, loc, null) : thisStringValue(receiver, loc, null);
            if (extracted.type !== "throw") throw new Error("M helper accepted invalid receiver");
            error(extracted, "receiver is not a " + family.label);
            for (const method of methods) error(evaluator.call(method, receiver, [ignored], loc), "receiver is not a " + family.label);
        }
        // A -> C bridge -> C.call -> B; even exhausted step budgets permit these bodies.
        for (let i = 0; i < methods.length; i++) {
            const borrowedBox = family.label === "boolean" ? obj(c.createBooleanObject(false)) : obj(c.createStringObject(""));
            for (const receiver of [family.payload, borrowedBox, obj(family.root), ignored]) {
                const active = new Evaluator(a, 0, 3);
                const valid = receiver !== ignored;
                const bridge = obj(c.createBuiltin("bridge", 0, (_receiver, _args, context, at) => {
                    check(context.realm === c && active.calls === 1, "M4 C entry");
                    const returned = context.call(c.functionPrototype.get("call", active.context, loc), methods[i], [receiver, ignored], at);
                    check(context.realm === c && active.calls === 1, "M4 C restoration");
                    return returned;
                }));
                const returned = active.call(bridge, UNDEFINED, [], loc);
                if (valid) expect(returned, i === 0 ? family.text : family.payload, "M4 forwarded result");
                else error(returned, "receiver is not a " + family.label);
                check(active.context.realm === a && active.calls === 0 && active.depth === 0 && active.steps === 0, "M4 cleanup/zero ticks");
                active.maxCalls = 2;
                error(active.call(bridge, UNDEFINED, [], loc), "call depth limit exceeded", loc, "RangeError");
                check(active.context.realm === a && active.calls === 0 && active.steps === 0, "M4 shared call guard");
            }
        }
        const shared = new Evaluator(a, 1, 3);
        for (const mode of ["steps", "host"]) {
            const bridge = obj(c.createBuiltin("cleanup", 0, (_r, _args, context, at) => {
                const returned = context.call(c.functionPrototype.get("call", shared.context, loc), methods[1], [family.payload], at);
                expect(returned, family.payload, "M4 nested success before abrupt");
                check(context.realm === c, "M4 owner restored before abrupt");
                if (mode === "host") throw new Error("M host sentinel");
                const tick = context.tick(at);
                if (tick.type === "throw") return tick;
                return context.tick(at);
            }));
            let hostFault = false;
            try {
                const returned = shared.call(bridge, UNDEFINED, [], loc);
                error(returned, "execution step limit exceeded", loc, "RangeError");
            } catch (fault) {
                check(mode === "host" && fault instanceof Error && fault.message === "M host sentinel", "M4 host fault identity");
                hostFault = true;
            }
            check(hostFault === (mode === "host") && shared.steps === 2 && shared.context.realm === a
                && shared.calls === 0 && shared.depth === 0, "M4 shared exhaustion/host cleanup");
            expect(shared.call(methods[1], family.payload, [], loc), family.payload, "M4 reusable after abrupt");
        }
    }
    for (const payload of [false, true]) {
        const observed = new ObservedBoolean(payload, a.booleanPrototype);
        const foreign = c.createBooleanObject(payload);
        foreign.setPrototypeOf(null);
        put(foreign, "booleanData", { kind: "boolean", value: !payload });
        const receivers: Value[] = [{ kind: "boolean", value: payload }, obj(a.createBooleanObject(payload)), obj(foreign), obj(observed)];
        for (const receiver of receivers) {
            const extracted = thisBooleanValue(receiver, loc, null);
            check(extracted.type === "normal" && extracted.value === payload, "M2 Boolean helper");
            expect(evaluator.call(b.booleanPrototype.get("valueOf", evaluator.context, loc), receiver, [ignored], loc), { kind: "boolean", value: payload }, "M2 Boolean payload");
            expect(evaluator.call(b.booleanPrototype.get("toString", evaluator.context, loc), receiver, [ignored], loc), str(payload ? "true" : "false"), "M2 Boolean text");
        }
        check(observed.reads.length === 0, "M2 Boolean no reads");
    }
    for (const payload of ["", "0", "ab", "\0", "\ud800", "\udfff", "\ud83d\ude00"]) {
        const observed = new ObservedString(payload, a.stringPrototype);
        const foreign = c.createStringObject(payload);
        foreign.setPrototypeOf(null);
        put(foreign, "stringData", str("fake"));
        for (const receiver of [str(payload), obj(a.createStringObject(payload)), obj(foreign), obj(observed)]) {
            const extracted = thisStringValue(receiver, loc, null);
            check(extracted.type === "normal" && extracted.value === payload, "M2 String helper");
            for (const name of ["toString", "valueOf"]) expect(evaluator.call(b.stringPrototype.get(name, evaluator.context, loc), receiver, [ignored], loc), str(payload), "M2 UTF-16 payload");
        }
        check(observed.reads.length === 0, "M2 String no reads");
    }
    testLookupAndBoundaries();
    testGuestConsumers();
}

function testLookupAndBoundaries(): void {
    const hints: PrimitiveHint[] = ["default", "number", "string"];
    for (const isBoolean of [true, false]) {
        const realm = new Realm((_line) => {});
        const evaluator = new Evaluator(realm);
        const root = isBoolean ? realm.booleanPrototype : realm.stringPrototype;
        const untouched = new Realm((_line) => {});
        const box = isBoolean ? new ObservedBoolean(false, root) : new ObservedString("12", root);
        const boxed = obj(box);
        const payload: Value = isBoolean ? { kind: "boolean", value: false } : str("12");
        const text = isBoolean ? str("false") : payload;
        const saved = [root.get("toString", evaluator.context, loc), root.get("valueOf", evaluator.context, loc)];
        let calls = 0;
        const context: OperationContext = {
            realm,
            tick: (at) => evaluator.context.tick(at),
            call: (callee, receiver, args, at) => {
                calls++;
                return evaluator.context.call(callee, receiver, args, at);
            },
        };
        for (const hint of hints) {
            box.reads = [];
            calls = 0;
            const before = evaluator.steps;
            expect(toPrimitive(boxed, hint, context, loc), hint === "string" ? text : payload, "M5 intact hint");
            keys(box.reads, [wellKnownToPrimitive, hint === "string" ? "toString" : "valueOf"]);
            check(calls === 1 && evaluator.steps === before + 2, "M5 exact work");
        }
        box.reads = [];
        const target = realm.createArray();
        const beforeLength = evaluator.steps;
        const lengthWrite = target.defineOwnProperty("length", { value: boxed }, evaluator.context, loc);
        check(lengthWrite.type === "normal" && lengthWrite.value, "M6 wrapper length write");
        check(sameValue(target.get("length", evaluator.context, loc), num(isBoolean ? 0 : 12)), "M6 exact wrapper length");
        keys(box.reads, [wellKnownToPrimitive, "valueOf", wellKnownToPrimitive, "valueOf"]);
        check(evaluator.steps === beforeLength + 4, "M6 two uncached conversions");
        box.reads = [];
        for (const converted of [toNumber(boxed, loc, null), toString(boxed, loc, null), toUint32(boxed, loc, null), toIntegerOrInfinity(boxed, loc, null), toLength(boxed, loc, null)]) {
            if (converted.type !== "throw") throw new Error("M direct converter accepted box");
            error(converted, "object-to-primitive conversion unsupported");
        }
        check(box.reads.length === 0, "M7 direct converters no hooks");
        const noSteps = new Evaluator(realm, 0);
        error(toPrimitive(boxed, "number", noSteps.context, loc), "execution step limit exceeded", loc, "RangeError");
        check(noSteps.steps === 1 && box.reads.length === 0, "M5 guard before Get");
        expect(evaluator.call(realm.objectPrototype.get("valueOf", noSteps.context, loc), boxed, [], loc), boxed, "M8 Object valueOf identity");
        const boxedAgain = result(evaluator.call(realm.objectPrototype.get("valueOf", noSteps.context, loc), payload, [], loc));
        check(boxedAgain.kind === "object" && boxedAgain.object !== box && boxedAgain.object.getPrototypeOf() === root, "M8 explicit fresh box");
        const tag = isBoolean ? "Boolean" : "String";
        expect(evaluator.call(realm.objectPrototype.get("toString", noSteps.context, loc), boxed, [], loc), str("[object " + tag + "]"), "M8 Object tag unchanged");
        put(box, wellKnownToStringTag, str("Custom"));
        expect(evaluator.call(realm.objectPrototype.get("toString", noSteps.context, loc), boxed, [], loc), str("[object Custom]"), "M8 tag property");
        box.internalDelete(wellKnownToStringTag);
        root.internalDelete("toString");
        const untouchedRoot = isBoolean ? untouched.booleanPrototype : untouched.stringPrototype;
        check(untouchedRoot.getOwnProperty("toString") !== undefined, "M1 mutation isolation");
        box.reads = [];
        calls = 0;
        let before = evaluator.steps;
        expect(toPrimitive(boxed, "string", context, loc), str("[object " + tag + "]"), "M5 deleted toString exposes Object");
        keys(box.reads, [wellKnownToPrimitive, "toString", wellKnownToStringTag]);
        check(calls === 1 && evaluator.steps === before + 3, "M5 deleted toString work");
        expect(evaluator.call(saved[0], boxed, [], loc), text, "M4 saved deleted method");
        put(root, "toString", saved[0]);
        root.internalDelete("valueOf");
        box.reads = [];
        calls = 0;
        before = evaluator.steps;
        expect(toPrimitive(boxed, "number", context, loc), text, "M5 inherited Object valueOf falls back");
        keys(box.reads, [wellKnownToPrimitive, "valueOf", "toString"]);
        check(calls === 2 && evaluator.steps === before + 3, "M5 deletion fallback work");
        const replacement = obj(realm.createBuiltin("fresh", 0, (_r, _args, _c, _at) => normal(str("fresh"))));
        put(box, "valueOf", obj(realm.createBuiltin("replaceNext", 0, (receiver, _args, _c, _at) => {
            put(box, "toString", replacement);
            return normal(receiver);
        })));
        box.reads = [];
        calls = 0;
        before = evaluator.steps;
        expect(toPrimitive(boxed, "number", context, loc), str("fresh"), "M5 fresh fallback lookup");
        keys(box.reads, [wellKnownToPrimitive, "valueOf", "toString"]);
        check(calls === 2 && evaluator.steps === before + 3, "M5 fresh lookup work");
        expect(evaluator.call(saved[1], boxed, [], loc), payload, "M4 saved valueOf");
        const objectResult = obj(realm.createBuiltin("objectResult", 0, (receiver, _args, _c, _at) => normal(receiver)));
        put(box, "valueOf", objectResult);
        put(box, "toString", objectResult);
        box.reads = [];
        calls = 0;
        before = evaluator.steps;
        error(toPrimitive(boxed, "number", context, loc), "cannot convert object to primitive");
        keys(box.reads, [wellKnownToPrimitive, "valueOf", "toString"]);
        check(calls === 2 && evaluator.steps === before + 3, "M5 both-object exact work");
        put(box, wellKnownToPrimitive, saved[1]);
        expect(toPrimitive(boxed, "string", context, loc), payload, "M5 canonical hook precedes ordinary");
        const sentinel = failure("RangeError", "sentinel", loc);
        put(box, wellKnownToPrimitive, obj(realm.createBuiltin("throw", 0, (_r, _a, _c, _l) => sentinel)));
        check(toPrimitive(boxed, "default", context, loc) === sentinel, "M5 abrupt identity");
        box.internalDelete(wellKnownToPrimitive);
        box.internalDelete("valueOf");
        box.internalDelete("toString");
        box.setPrototypeOf(null);
        error(toPrimitive(boxed, "number", context, loc), "cannot convert object to primitive");
    }
    const realm = new Realm((_line) => {});
    const evaluator = new Evaluator(realm);
    const rows: { object: GuestObject; tag: string }[] = [
        { object: realm.createArray(), tag: "Array" },
        { object: realm.functionPrototype, tag: "Function" },
    ];
    for (const row of rows) {
        expect(toPrimitive(obj(row.object), "default", evaluator.context, loc), str(row.tag === "Array" ? "" : "function () { [native code] }"), "M8 Array join/Function native default");
    }
    expect(toPrimitive(obj(realm.createNumberObject(2)), "default", evaluator.context, loc), num(2), "N Number default payload");
    const identity = new GuestSymbol("boundary");
    const symbolBox = obj(realm.createSymbolObject(identity));
    expect(toPrimitive(symbolBox, "default", evaluator.context, loc), { kind: "symbol", value: identity }, "M8 Symbol protocol retained");
    expect(evaluator.call(realm.objectPrototype.get("toString", evaluator.context, loc), symbolBox, [], loc), str("[object Symbol]"), "M8 Symbol tag retained");
}

function seed(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function testGuestConsumers(): void {
    const realm = new Realm((_line) => {});
    const evaluator = new Evaluator(realm);
    seed(realm, "falseBox", obj(realm.createBooleanObject(false)));
    seed(realm, "trueBox", obj(realm.createBooleanObject(true)));
    seed(realm, "stringBox", obj(realm.createStringObject("2")));
    seed(realm, "badLength", obj(realm.createStringObject("2.5")));
    seed(realm, "booleanRoot", obj(realm.booleanPrototype));
    seed(realm, "stringRoot", obj(realm.stringPrototype));
    seed(realm, "check", obj(realm.createBuiltin("check", 1, (_r, args, _c, _l) => {
        check(args[0].kind === "boolean" && args[0].value, "M6 guest assertion");
        return normal();
    })));
    seed(realm, "arrayLikeLength", obj(realm.createBuiltin("arrayLikeLength", 1, (_r, args, context, at) => {
        if (args[0].kind !== "object") throw new Error("M length receiver");
        const length = lengthOfArrayLike(args[0].object, context, at);
        return length.type === "throw" ? length : normal(num(length.value));
    })));
    seed(realm, "map", obj(realm.createBuiltin("map", 2, (_r, args, context, at) => {
        if (args[0].kind !== "object") throw new Error("M map receiver");
        return mapObjectDefaultArray(args[0].object, args[1], UNDEFINED, context, at);
    })));
    const parsed = parse(readFileSync("test/fixtures/boolean-string-conversions.js", "utf8"));
    check(parsed.error === null, "M6 parse");
    check(evaluator.block(parsed.body, realm.global, UNDEFINED).type === "normal", "M6 execution");
    const primitiveMember = realm.global.bindings.get("primitiveMember");
    if (primitiveMember === undefined) throw new Error("missing primitiveMember");
    const primitiveRead = evaluator.call(primitiveMember.value, UNDEFINED, [], loc);
    check(primitiveRead.type === "normal" && sameValue(primitiveRead.value, realm.stringPrototype.get("toString", evaluator.context, loc)), "primitiveMember positive read");
    const negatives: { name: string; line: number; column: number; message: string; errorName: string }[] = [
        { name: "invalidLength", line: 63, column: 5, message: "invalid array length", errorName: "RangeError" },
        { name: "invalidBoolean", line: 66, column: 12, message: "receiver is not a boolean", errorName: "TypeError" },
        { name: "invalidString", line: 69, column: 12, message: "receiver is not a string", errorName: "TypeError" },
    ];
    for (const row of negatives) {
        const binding = realm.global.bindings.get(row.name);
        if (binding === undefined) throw new Error("M missing negative function");
        error(evaluator.call(binding.value, UNDEFINED, [], loc), row.message, { line: row.line, column: row.column }, row.errorName);
    }
    const target = realm.global.bindings.get("lengthTarget");
    check(target !== undefined && target.value.kind === "object" && sameValue(target.value.object.get("length", evaluator.context, loc), num(3)), "M6 failed length preserves storage");
}
