// Both C matrices run through the existing object-valueof native/Node driver.
import { readFileSync } from "node:fs";
import { lengthOfArrayLike } from "../src/array-like.js";
import { GuestArray } from "../src/array-object.js";
import { mapObjectDefaultArray } from "../src/array-map.js";
import { toPropertyKey } from "../src/conversion.js";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { GuestSymbolObject } from "../src/primitive-objects.js";
import { toPrimitive, type PrimitiveHint } from "../src/primitive-conversion.js";
import { Realm } from "../src/realm.js";
import { GuestObject, UNDEFINED, failure, normal, sameValue, type Callable, type PropertyKey, type Value, type ValueCompletion, type OperationContext } from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";

const loc: Location = { line: 73, column: 11 };
function check(ok: boolean, label: string): void { if (!ok) throw new Error("C " + label); }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function str(value: string): Value { return { kind: "string", value }; }
function num(value: number): Value { return { kind: "number", value }; }
function result(completion: ValueCompletion): Value {
    if (completion.type !== "normal") throw new Error("C expected normal completion");
    return completion.value;
}
function expect(completion: ValueCompletion, expected: Value, label: string): void {
    check(sameValue(result(completion), expected), label);
}
function error(completion: ValueCompletion, name: string, message: string, at: Location = loc): void {
    check(completion.type === "throw" && completion.diagnostic.name === name
        && completion.diagnostic.phase === "runtime" && completion.diagnostic.message === message
        && completion.diagnostic.loc.line === at.line && completion.diagnostic.loc.column === at.column
        && sameValue(completion.value, str(name + ": " + message)), "exact error " + message);
}
function put(object: GuestObject, key: PropertyKey, value: Value): void {
    object.bootstrapDefine(key, { value, writable: true, enumerable: false, configurable: true });
}
function keys(actual: PropertyKey[], expected: PropertyKey[], label: string): void {
    check(actual.length === expected.length, label + " length");
    for (let i = 0; i < expected.length; i++) check(actual[i] === expected[i], label + " identity/order");
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function binding(realm: Realm, name: string): Value {
    const found = realm.global.bindings.get(name);
    if (found === undefined) throw new Error("C missing " + name);
    return found.value;
}
type GetObserver = (key: PropertyKey, receiver: Value, at: Location) => ValueCompletion;
class Observed extends GuestObject {
    constructor(readonly observe: GetObserver, proto: GuestObject | null = null) { super(proto); }
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion { return this.observe(key, receiver, at); }
}
class ObservedSymbol extends GuestSymbolObject {
    reads = 0;
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        check(key === wellKnownToStringTag && receiver.kind === "object" && receiver.object === this && at === loc, "boxed Get receiver/key/location");
        this.reads++;
        return super.internalGet(key, receiver, at);
    }
}
class BoxingRealm extends Realm {
    boxes: ObservedSymbol[] = [];
    createSymbolObject(symbol: GuestSymbol): GuestSymbolObject {
        const box = new ObservedSymbol(symbol, this.symbolPrototype);
        this.boxes.push(box);
        return box;
    }
}
// Host-only observer changes its classification during Get. Avoid host class
// prototype reflection: the retained SC1090 reduction documents that limitation.
class ClassificationObserver extends GuestObject {
    callable: Callable | null = null;
    constructor(readonly replacement: Callable) { super(); }
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        check(key === wellKnownToStringTag && receiver.kind === "object" && receiver.object === this && at === loc, "classification observer boundary");
        this.callable = this.replacement;
        return normal(UNDEFINED);
    }
}
class CallableArray extends GuestArray {
    // Explicit initializer avoids the pinned compiler's inherited-field SC1090;
    // the minimal rejected declaration is retained with this task's evidence.
    callable: Callable | null = null;
    constructor(realm: Realm) {
        super(realm.arrayPrototype);
        this.callable = { kind: "builtin", realm, invoke: (_r, _args, _context, _at) => normal() };
    }
}

export function testObjectToString(): void {
    const a = new Realm((_line) => {});
    const b = new BoxingRealm((_line) => {});
    const c = new Realm((_line) => {});
    const evaluator = new Evaluator(a);
    const method = b.objectPrototype.get("toString");
    const symbol: Value = { kind: "symbol", value: new GuestSymbol("transported") };

    // Metadata, canonical key order and independent mutable Realm properties.
    for (const realm of [a, b, c]) {
        keys(realm.objectPrototype.ownPropertyKeys(), ["valueOf", "toString"], "Object keys");
        keys(realm.symbolPrototype.ownPropertyKeys(), ["toString", "valueOf", wellKnownToPrimitive, wellKnownToStringTag], "Symbol keys");
        const tag = realm.symbolPrototype.getOwnProperty(wellKnownToStringTag);
        check(tag !== undefined && !tag.writable && !tag.enumerable && tag.configurable && sameValue(tag.value, str("Symbol")), "tag descriptor");
        const descriptor = realm.objectPrototype.getOwnProperty("toString");
        check(descriptor !== undefined && descriptor.writable && !descriptor.enumerable && descriptor.configurable, "method descriptor");
        const own = realm.objectPrototype.get("toString");
        if (own.kind !== "object") throw new Error("C missing method");
        check(own.object.callable !== null && own.object.callable.realm === realm && own.object.getPrototypeOf() === realm.functionPrototype, "method ownership");
        if (realm !== b) check(!sameValue(own, method), "fresh method");
        keys(own.object.ownPropertyKeys(), ["name", "length"], "metadata keys");
        check(sameValue(own.object.get("name"), str("toString")) && sameValue(own.object.get("length"), num(0)), "metadata values");
        for (const key of ["name", "length"]) {
            const d = own.object.getOwnProperty(key);
            check(d !== undefined && !d.writable && !d.enumerable && d.configurable, "metadata flags");
        }
        check(!realm.global.bindings.has("Object") && !realm.global.bindings.has("Symbol"), "no globals");
    }

    // W-T1/S-T1: every representable primitive, root and ordinary object kind.
    const inputs: Value[] = [UNDEFINED, { kind: "null" }, { kind: "boolean", value: true }, num(-0), num(NaN), str(""), str("TypeError: diagnostic"), symbol,
        obj(a.objectPrototype), obj(a.functionPrototype), obj(a.arrayPrototype), obj(a.booleanPrototype), obj(a.numberPrototype), obj(a.stringPrototype), obj(a.symbolPrototype),
        obj(a.createObject()), obj(a.createArray()), obj(a.createBooleanObject(false)), obj(a.createNumberObject(3)), obj(a.createStringObject("abc")), obj(a.createSymbolObject(symbol.value)),
        binding(a, "console"), binding(a, "Number"), obj(new GuestObject())];
    const tags = ["Undefined", "Null", "Boolean", "Number", "Number", "String", "String", "Symbol", "Object", "Function", "Array", "Boolean", "Number", "String", "Symbol", "Object", "Array", "Boolean", "Number", "String", "Symbol", "Object", "Object", "Object"];
    for (let i = 0; i < inputs.length; i++) {
        const before = evaluator.steps;
        expect(evaluator.call(method, inputs[i], [], loc), str("[object " + tags[i] + "]"), "kind " + i);
        check(evaluator.steps - before === (i < 2 ? 0 : 1), "one tag tick or nullish fast path");
    }
    for (const root of [a.arrayPrototype, a.functionPrototype, a.booleanPrototype, a.numberPrototype, a.stringPrototype]) {
        expect(evaluator.call(method, obj(new GuestObject(root)), [], loc), str("[object Object]"), "prototype lookalike lacks slot");
    }
    const relinked = [a.createArray(), a.createBooleanObject(false), a.createNumberObject(2), a.createStringObject("x")];
    const relinkedTags = ["Array", "Boolean", "Number", "String"];
    for (let i = 0; i < relinked.length; i++) {
        relinked[i].setPrototypeOf(null);
        expect(evaluator.call(method, obj(relinked[i]), [], loc), str("[object " + relinkedTags[i] + "]"), "relinked slot");
    }
    expect(evaluator.call(method, obj(new CallableArray(a)), [], loc), str("[object Array]"), "Array before callable classification");

    // W-T2/T3, S-T2/T3/T4: exact key identity, strings verbatim, no tag coercion.
    const parent = a.createObject();
    const child = new GuestObject(parent);
    for (const key of ["toStringTag", "@@toStringTag", "Symbol.toStringTag", new GuestSymbol("Symbol.toStringTag")]) put(child, key, str("Impostor"));
    expect(evaluator.call(method, obj(child), [], loc), str("[object Object]"), "impostors ignored");
    for (const text of ["Custom", "", "a\0\ud800\udfff\ud83d\ude00"]) {
        put(parent, wellKnownToStringTag, str(text));
        expect(evaluator.call(method, obj(child), [], loc), str("[object " + text + "]"), "inherited exact tag");
        put(child, wellKnownToStringTag, str("Own"));
        expect(evaluator.call(method, obj(child), [], loc), str("[object Own]"), "own tag wins");
        child.internalDelete(wellKnownToStringTag);
    }
    const trap = obj(new Observed((_key, _receiver, _at): ValueCompletion => { throw new Error("tag value converted"); }));
    const throwing = obj(a.createBuiltin("throwing", 0, (_receiver, _args, _context, _at): ValueCompletion => { throw new Error("tag hook called"); }));
    const hooked = a.createObject();
    for (const key of ["valueOf", "toString", wellKnownToPrimitive]) put(hooked, key, throwing);
    for (const tag of [UNDEFINED, { kind: "null" } as const, { kind: "boolean", value: false } as const, num(0), symbol, trap, obj(hooked), throwing]) {
        put(child, wellKnownToStringTag, tag);
        expect(evaluator.call(method, obj(child), [trap], loc), str("[object Object]"), "nonstring tag fallback without hooks");
    }

    // S-T5/T6, W-T5: Symbol's tag is a property, not a classification slot.
    put(a.symbolPrototype, wellKnownToStringTag, str("A"));
    put(b.symbolPrototype, wellKnownToStringTag, str("B"));
    const existing = a.createSymbolObject(symbol.value);
    const boxesBefore = b.boxes.length;
    for (let i = 0; i < 2; i++) expect(evaluator.call(method, symbol, [], loc), str("[object B]"), "defining Realm boxing");
    check(b.boxes.length === boxesBefore + 2 && b.boxes[boxesBefore] !== b.boxes[boxesBefore + 1], "fresh boxes");
    for (const box of b.boxes) check(box.reads === 1 && box.symbolData === symbol.value && box.getPrototypeOf() === b.symbolPrototype, "actual boxed receiver");
    expect(evaluator.call(method, obj(existing), [], loc), str("[object A]"), "existing A box retains chain");
    const forwarded = c.functionPrototype.get("call");
    const forwardingSteps = evaluator.steps;
    expect(evaluator.call(forwarded, method, [symbol], loc), str("[object B]"), "A through C.call to B boxing");
    check(evaluator.steps === forwardingSteps + 1 && evaluator.context.realm === a && evaluator.calls === 0, "forwarded shared tick/cleanup");
    const limited = new Evaluator(a, 10, 1);
    error(limited.call(forwarded, method, [symbol], loc), "RangeError", "call depth limit exceeded");
    check(limited.steps === 0 && limited.calls === 0 && limited.context.realm === a, "forwarded target limit");
    expect(evaluator.call(method, obj(new GuestObject(a.symbolPrototype)), [], loc), str("[object A]"), "lookalike can inherit public tag");
    a.symbolPrototype.internalDelete(wellKnownToStringTag);
    for (const input of [obj(existing), obj(a.symbolPrototype)]) expect(evaluator.call(method, input, [], loc), str("[object Object]"), "deleted Symbol tag fallback");
    put(a.symbolPrototype, wellKnownToStringTag, num(8));
    expect(evaluator.call(method, obj(existing), [], loc), str("[object Object]"), "nonstring Symbol root tag");
    put(a.symbolPrototype, wellKnownToStringTag, str("Restored"));
    put(existing, wellKnownToStringTag, UNDEFINED);
    expect(evaluator.call(method, obj(existing), [], loc), str("[object Object]"), "own nonstring shadows root");
    existing.internalDelete(wellKnownToStringTag);
    existing.setPrototypeOf(null);
    expect(evaluator.call(method, obj(existing), [], loc), str("[object Object]"), "relinked Symbol fallback");
    expect(toPrimitive(obj(new GuestSymbolObject(symbol.value, b.symbolPrototype)), "default", evaluator.context, loc), symbol, "B2 default conversion unchanged");

    testTagCompletions(a, b, c, method);
    testDefaultConsumers();

    // Saved method survives replacement/deletion; mutations stay in B.
    put(b.objectPrototype, "toString", num(9));
    check(!sameValue(a.objectPrototype.get("toString"), num(9)), "method isolation");
    b.objectPrototype.internalDelete("toString");
    expect(evaluator.call(method, obj(a.createObject()), [], loc), str("[object Object]"), "saved method after deletion");
    check(evaluator.context.realm === a && evaluator.calls === 0 && evaluator.depth === 0, "final cleanup");
}

function testTagCompletions(a: Realm, b: Realm, c: Realm, method: Value): void {
    // W-T4/S-T7: host observers are data-only test seams, not guest accessors.
    const sentinel = failure("TagSentinel", "unchanged", loc);
    for (const mode of ["normal", "throw", "host", "reenter", "recursive"]) {
        const evaluator = new Evaluator(a, 20, 3);
        let reads = 0;
        let observer: GuestObject = new GuestObject();
        observer = new Observed((key, receiver, at): ValueCompletion => {
            reads++;
            check(key === wellKnownToStringTag && receiver.kind === "object" && receiver.object === observer && at === loc, "exact Get boundary");
            check(evaluator.context.realm === b && evaluator.steps === reads, "B active and charged before Get");
            if (mode === "throw") return sentinel;
            if (mode === "host") throw new Error("tag host sentinel");
            if (mode === "recursive") return evaluator.context.call(method, receiver, [], at);
            if (mode === "reenter") {
                const nested = obj(c.createBuiltin("nested", 0, (_r, _args, context, _loc) => {
                    check(context.realm === c && evaluator.calls === 2, "C nested entry");
                    return normal(str("Nested"));
                }));
                const answer = evaluator.context.call(nested, UNDEFINED, [], at);
                check(evaluator.context.realm === b && evaluator.calls === 1, "B restored after reentry");
                return answer;
            }
            return normal(str("Observed"));
        });
        let fault = false;
        try {
            const completion = evaluator.call(method, obj(observer), [], loc);
            if (mode === "throw") {
                check(completion === sentinel, "exact Get abrupt identity");
            } else if (mode === "recursive") {
                error(completion, "RangeError", "call depth limit exceeded");
            } else {
                expect(completion, str(mode === "reenter" ? "[object Nested]" : "[object Observed]"), "Get result");
            }
        } catch (caught) {
            check(mode === "host" && caught instanceof Error && caught.message === "tag host sentinel", "exact host fault");
            fault = true;
        }
        check(fault === (mode === "host") && reads === (mode === "recursive" ? 3 : 1), "exact Get count");
        check(evaluator.context.realm === a && evaluator.calls === 0 && evaluator.depth === 0, "all path restoration");
        expect(evaluator.call(method, { kind: "null" }, [], loc), str("[object Null]"), "later bounded call");
    }
    const zero = new Evaluator(a, 0, 1);
    const noGet = obj(new Observed((_key, _receiver, _at): ValueCompletion => { throw new Error("exhaustion reached Get"); }));
    error(zero.call(method, noGet, [], loc), "RangeError", "execution step limit exceeded");
    check(zero.steps === 1 && zero.calls === 0 && zero.context.realm === a, "step exhaustion cleanup");
    expect(zero.call(method, UNDEFINED, [], loc), str("[object Undefined]"), "undefined after exhausted steps");
    expect(zero.call(method, { kind: "null" }, [], loc), str("[object Null]"), "null after exhausted steps");
    check(zero.steps === 1, "nullish zero ticks");
    const noCalls = new Evaluator(a, 10, 0);
    error(noCalls.call(method, noGet, [], loc), "RangeError", "call depth limit exceeded");
    check(noCalls.steps === 0 && noCalls.calls === 0 && noCalls.context.realm === a, "call failure before body");

    // Direct body invocation isolates tick completion identity from call handling.
    if (method.kind !== "object" || method.object.callable === null || method.object.callable.kind !== "builtin") throw new Error("C missing builtin");
    const context: OperationContext = {
        realm: b,
        tick: (at) => {
            check(at === loc, "tick location");
            return sentinel;
        },
        call: (_callee, _receiver, _args, _at): ValueCompletion => { throw new Error("unexpected direct call"); },
    };
    check(method.object.callable.invoke(noGet, [], context, loc) === sentinel, "exact tick completion");

    // Classification must precede Get even if host-observed Get changes the
    // classification surface. Guest code cannot change this internal slot.
    const evaluator = new Evaluator(a);
    const changing = new ClassificationObserver({ kind: "builtin", realm: a, invoke: (_r, _args, _context, _at) => normal() });
    expect(evaluator.call(method, obj(changing), [], loc), str("[object Object]"), "classification before Get effects");
    expect(evaluator.call(method, obj(changing), [], loc), str("[object Function]"), "next classification observes changed slot");
}

function testDefaultConsumers(): void {
    const realm = new Realm((_line) => {});
    const evaluator = new Evaluator(realm);
    const source = readFileSync("test/fixtures/object-tostring.js", "utf8");
    seed(realm, "tagKey", { kind: "symbol", value: wellKnownToStringTag });
    seed(realm, "savedToString", realm.objectPrototype.get("toString"));
    seed(realm, "objectRoot", obj(realm.objectPrototype));
    const bare = new GuestObject();
    seed(realm, "bare", obj(bare));
    seed(realm, "check", obj(realm.createBuiltin("check", 1, (_receiver, args, _context, _at) => {
        check(args[0].kind === "boolean" && args[0].value, "runtime-read assertion");
        return normal();
    })));
    seed(realm, "arrayLikeLength", obj(realm.createBuiltin("arrayLikeLength", 1, (_receiver, args, context, at) => {
        if (args[0].kind !== "object") throw new Error("C fixture length receiver");
        const length = lengthOfArrayLike(args[0].object, context, at);
        return length.type === "throw" ? length : normal(num(length.value));
    })));
    seed(realm, "map", obj(realm.createBuiltin("map", 2, (_receiver, args, context, at) => {
        if (args[0].kind !== "object") throw new Error("C fixture map receiver");
        return mapObjectDefaultArray(args[0].object, args[1], UNDEFINED, context, at);
    })));
    const parsed = parse(source);
    check(parsed.error === null, "fixture parse");
    check(evaluator.block(parsed.body, realm.global, UNDEFINED).type === "normal", "fixture execution");
    const negatives = [
        { name: "bothObjects", line: 79, column: 12, error: "TypeError", message: "cannot convert object to primitive" },
        { name: "nullRoot", line: 85, column: 12, error: "TypeError", message: "cannot convert object to primitive" },
        { name: "invalidLength", line: 89, column: 5, error: "RangeError", message: "invalid array length" },
        { name: "primitiveMember", line: 92, column: 12, error: "TypeError", message: "property base must be an object" },
    ];
    for (const row of negatives) {
        const completion = evaluator.call(binding(realm, row.name), UNDEFINED, [], loc);
        error(completion, row.error, row.message, { line: row.line, column: row.column });
    }
    const lengthTarget = binding(realm, "lengthTarget");
    check(lengthTarget.kind === "object" && sameValue(lengthTarget.object.get("length"), num(3)), "guest failed length assignment preserves storage");
    error(toPrimitive(obj(bare), "number", evaluator.context, loc), "TypeError", "cannot convert object to primitive");

    // W-T6/T7/T8: fixed lookup sequences, ticks and two uncached conversions.
    const fresh = new Realm((_line) => {});
    const active = new Evaluator(fresh);
    let reads: PropertyKey[] = [];
    const operand = new Observed((key, receiver, at) => {
        reads.push(key);
        return fresh.objectPrototype.internalGet(key, receiver, at);
    }, fresh.objectPrototype);
    const hints: PrimitiveHint[] = ["default", "number", "string"];
    for (const hint of hints) {
        reads = [];
        const before = active.steps;
        expect(toPrimitive(obj(operand), hint, active.context, loc), str("[object Object]"), "ordinary default hint");
        keys(reads, hint === "string" ? [wellKnownToPrimitive, "toString", wellKnownToStringTag] : [wellKnownToPrimitive, "valueOf", "toString", wellKnownToStringTag], "default lookup sequence");
        check(active.steps - before === (hint === "string" ? 3 : 4), "exact default ticks");
    }
    const key = toPropertyKey(obj(operand), active.context, loc);
    check(key.type === "normal" && key.value === "[object Object]", "default key");
    const array = fresh.createArray();
    array.bootstrapDefine("length", { value: num(3) });
    reads = [];
    const before = active.steps;
    const changed = array.defineOwnProperty("length", { value: obj(operand) }, active.context, loc);
    check(changed.type === "throw", "invalid array length completion");
    if (changed.type === "throw") error(changed, "RangeError", "invalid array length");
    keys(reads, [wellKnownToPrimitive, "valueOf", "toString", wellKnownToStringTag, wellKnownToPrimitive, "valueOf", "toString", wellKnownToStringTag], "two full length conversions");
    check(active.steps - before === 8 && sameValue(array.get("length"), num(3)), "two conversions and no length write");
    // The second conversion sees a changed method, not a cached first result.
    const mutation = fresh.createObject();
    let conversions = 0;
    put(mutation, "valueOf", obj(fresh.createBuiltin("changeNext", 0, (_r, _args, _context, _at) => {
        conversions++;
        if (conversions === 2) {
            put(mutation, "toString", obj(fresh.createBuiltin("numericSecond", 0, (_rr, _aa, _cc, _ll) => normal(num(0)))));
        }
        return normal(obj(mutation));
    })));
    const beforeMutation = active.steps;
    const uncached = array.defineOwnProperty("length", { value: obj(mutation) }, active.context, loc);
    check(uncached.type === "normal" && uncached.value && sameValue(array.get("length"), num(0)), "fresh second hook changes NaN/Uint32 zero into valid zero length");
    check(conversions === 2 && active.steps - beforeMutation === 7, "first default tag tick, second explicit hook has no tag tick");
    const tight = new Evaluator(fresh, 3);
    error(toPrimitive(obj(fresh.createObject()), "number", tight.context, loc), "RangeError", "execution step limit exceeded");
    check(tight.steps === 4 && tight.calls === 0 && tight.context.realm === fresh, "default tag lookup is fourth tick");
}
