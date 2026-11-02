import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { GuestBoolean, GuestNumber, GuestStringObject, GuestSymbolObject } from "../src/primitive-objects.js";
import { GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import { toNumber } from "../src/conversion.js";
import {
    GuestObject, Environment, UNDEFINED as U, normal, failure, sameValue, getValue, putValue,
    type Value, type Completion, type ValueCompletion, type ThrowCompletion,
    type PropertyKey, type Builtin, type Reference,
} from "../src/runtime.js";
import type { Expr, Stmt, Location } from "../src/syntax.js";

function check(ok: boolean, name: string): void {
    if (!ok) {
        throw new Error("primitive-reads " + name);
    }
}
function s(value: string): Value { return { kind: "string", value }; }
function n(value: number): Value { return { kind: "number", value }; }
function b(value: boolean): Value { return { kind: "boolean", value }; }
function o(object: GuestObject): Value { return { kind: "object", object }; }
function sym(value: GuestSymbol): Value { return { kind: "symbol", value }; }
const nil: Value = { kind: "null" };
const loc: Location = { line: 1, column: 1 };
const refLoc: Location = { line: 7, column: 9 };
const opLoc: Location = { line: 8, column: 4 };
const nullish = "cannot convert null or undefined to object";

const Q: ThrowCompletion = failure("ReferenceError", "sentinel", refLoc);
Q.value = n(91);
const F = new Error("host sentinel");
function bind(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function binding(realm: Realm, name: string): Value {
    const entry = realm.global.bindings.get(name);
    if (entry === undefined) {
        throw new Error("missing binding " + name);
    }
    return entry.value;
}
function put(target: GuestObject, key: PropertyKey, value: Value): void {
    target.bootstrapDefine(key, { value, writable: true, enumerable: true, configurable: true });
}
function fn(realm: Realm, body: Builtin): Value {
    return o(realm.createBuiltin("hook", 0, body));
}
function statement(source: string): Stmt {
    const parsed = parse(source);
    check(parsed.error === null && parsed.body.length === 1, "parse " + source);
    return parsed.body[0];
}
function expression(source: string): Expr {
    const stmt = statement(source);
    if (stmt.kind !== "expression") {
        throw new Error("expected expression");
    }
    return stmt.expression;
}
function run(e: Evaluator, source: string): Completion {
    return e.statement(statement(source), e.context.realm.global, U);
}
function program(e: Evaluator, source: string): Completion {
    const parsed = parse(source);
    check(parsed.error === null, "program parse");
    return e.block(parsed.body, e.context.realm.global, U);
}
function expect(result: Completion, value: Value, name: string): void {
    check(result.type === "normal" && sameValue(result.value, value), name);
}
function error(result: Completion, message: string, name: string, column = 1, line = 1, kind = "TypeError"): void {
    check(result.type === "throw" && result.diagnostic.phase === "runtime" &&
        result.diagnostic.name === kind && result.diagnostic.message === message &&
        result.diagnostic.loc.line === line && result.diagnostic.loc.column === column, name);
}
function exact(result: Completion, name: string): void {
    check(result === Q && result.value === Q.value && result.type === "throw" && result.diagnostic === Q.diagnostic, name);
}
function clean(e: Evaluator, realm: Realm, name: string): void {
    check(e.calls === 0 && e.depth === 0 && e.context.realm === realm, name + " cleanup");
}
function fresh(): Realm { return new Realm((_line) => {}); }
function prototype(realm: Realm, value: Value): GuestObject {
    switch (value.kind) {
        case "boolean": return realm.booleanPrototype;
        case "number": return realm.numberPrototype;
        case "string": return realm.stringPrototype;
        case "symbol": return realm.symbolPrototype;
        default: throw new Error("expected primitive");
    }
}
class Measured extends Evaluator {
    peak = 0;
    invocations = 0;
    evaluate(expr: Expr, env: Environment, receiver: Value, allowUnresolvable = false): Completion {
        this.peak = Math.max(this.peak, this.depth + 1);
        return super.evaluate(expr, env, receiver, allowUnresolvable);
    }
    call(callee: Value, receiver: Value, args: Value[], at: Location): ValueCompletion {
        if (this.calls < this.maxCalls) {
            this.invocations++;
        }
        return super.call(callee, receiver, args, at);
    }
}
// Instrument the actual factory result, never a prototype's internalGet.
class Observation {
    trace = "";
    boxes: GuestObject[] = [];
    reads = 0;
    receiver: Value = U;
    key: PropertyKey = "";
    at: Location = loc;
    abrupt: ThrowCompletion | null = null;
    fault: Error | null = null;
    factoryFault: Error | null = null;
    get(target: GuestObject, key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        this.trace += "G";
        this.reads++;
        this.receiver = receiver;
        this.key = key;
        this.at = at;
        if (this.fault !== null) {
            throw this.fault;
        }
        if (this.abrupt !== null) {
            return this.abrupt;
        }
        // A separate ordinary object with the wrapper as prototype uses the same
        // descriptor walk, including String virtual own properties.
        return new GuestObject(target).internalGet(key, receiver, at);
    }
}
class BooleanBox extends GuestBoolean {
    constructor(value: boolean, proto: GuestObject, public observation: Observation) { super(value, proto); }
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        return this.observation.get(this, key, receiver, at);
    }
}
class NumberBox extends GuestNumber {
    constructor(value: number, proto: GuestObject, public observation: Observation) { super(value, proto); }
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        return this.observation.get(this, key, receiver, at);
    }
}
class StringBox extends GuestStringObject {
    constructor(value: string, proto: GuestObject, public observation: Observation) { super(value, proto); }
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        return this.observation.get(this, key, receiver, at);
    }
}
class SymbolBox extends GuestSymbolObject {
    constructor(value: GuestSymbol, proto: GuestObject, public observation: Observation) { super(value, proto); }
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        return this.observation.get(this, key, receiver, at);
    }
}
class ObservedRealm extends Realm {
    observation = new Observation();
    constructor() { super((_line) => {}); }
    record(box: GuestObject): void {
        if (this.observation.factoryFault !== null) {
            throw this.observation.factoryFault;
        }
        this.observation.boxes.push(box);
    }
    createBooleanObject(value: boolean): GuestBoolean {
        const box = new BooleanBox(value, this.booleanPrototype, this.observation);
        this.record(box);
        return box;
    }
    createNumberObject(value: number): GuestNumber {
        const box = new NumberBox(value, this.numberPrototype, this.observation);
        this.record(box);
        return box;
    }
    createStringObject(value: string): GuestStringObject {
        const box = new StringBox(value, this.stringPrototype, this.observation);
        this.record(box);
        return box;
    }
    createSymbolObject(value: GuestSymbol): GuestSymbolObject {
        const box = new SymbolBox(value, this.symbolPrototype, this.observation);
        this.record(box);
        return box;
    }
}
const identity = new GuestSymbol("x");
const otherIdentity = new GuestSymbol("x");
const primitives: Value[] = [b(false), n(2), s("ab"), sym(identity)];

// V1-V8, V18-V21: existing methods, payloads and the explicit Number limitation.
const valueRows: { name: string; source: string; value: Value; expected: Value }[] = [
    { name: "V1 BooleanTrue", source: "true.valueOf();", value: U, expected: b(true) },
    { name: "V2 BooleanFalse", source: "false.toString();", value: U, expected: s("false") },
    { name: "V3 Number", source: "(2).valueOf();", value: U, expected: n(2) },
    { name: "V4 NegativeZero", source: "p.valueOf();", value: n(-0), expected: n(-0) },
    { name: "V5 NaN", source: "p.valueOf();", value: n(NaN), expected: n(NaN) },
    { name: "V5 Infinity", source: "p.valueOf();", value: n(Infinity), expected: n(Infinity) },
    { name: "V5 NegativeInfinity", source: "p.valueOf();", value: n(-Infinity), expected: n(-Infinity) },
    { name: "V6 StringValue", source: "'ab'.valueOf();", value: U, expected: s("ab") },
    { name: "V6 StringText", source: "'ab'.toString();", value: U, expected: s("ab") },
    { name: "V7 SymbolValue", source: "p.valueOf();", value: sym(identity), expected: sym(identity) },
    { name: "V7 SymbolText", source: "p.toString();", value: sym(identity), expected: s("Symbol(x)") },
    { name: "V8 SymbolHook", source: "p[h]('ignored');", value: sym(identity), expected: sym(identity) },
    { name: "V20 NumberToStringBoundary", source: "(2).toString();", value: U, expected: s("[object Number]") },
];
for (const row of valueRows) {
    const realm = fresh();
    const e = new Evaluator(realm);
    bind(realm, "p", row.value);
    bind(realm, "h", sym(wellKnownToPrimitive));
    const result = run(e, row.source);
    expect(result, row.expected, row.name);
    if (row.name === "V4 NegativeZero") {
        check(result.value.kind === "number" && 1 / result.value.value === -Infinity, row.name + " reciprocal");
    }
}
for (const value of primitives) {
    const realm = fresh();
    const e = new Evaluator(realm);
    const root = prototype(realm, value);
    bind(realm, "p", value);
    bind(realm, "s", sym(identity));
    bind(realm, "t", sym(otherIdentity));
    expect(run(e, "p.absent;"), U, "V9 Missing");
    root.bootstrapDefine("x", { value: n(17), configurable: true });
    expect(run(e, "p.x;"), n(17), "V10 Inherited");
    root.internalDelete("x");
    put(realm.objectPrototype, "x", n(19));
    expect(run(e, "p.x;"), n(19), "V11 RootInherited");
    put(root, "x", U);
    expect(run(e, "p.x;"), U, "V12 UndefinedShadow");
    put(root, identity, n(23));
    expect(run(e, "p[s];"), n(23), "V13 SymbolIdentity");
    expect(run(e, "p[t];"), U, "V13 OtherSymbol");
    root.internalDelete(identity);
    put(root, "Symbol(x)", n(29));
    expect(run(e, "p[s];"), U, "V14 SameTextString");
    put(root, "x", n(41));
    const forbidden = fn(realm, (_r, _a, _c, _l): Completion => { throw F; });
    put(root, wellKnownToPrimitive, forbidden);
    put(root, "toString", forbidden);
    put(root, "valueOf", forbidden);
    expect(run(e, "p.x;"), n(41), "V22 NoBaseCoercion");
}
class ObservedObject extends GuestObject {
    observation = new Observation();
    internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        return this.observation.get(this, key, receiver, at);
    }
}
{
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const target = new ObservedObject();
    const value = o(target);
    put(target, "x", n(31));
    bind(realm, "p", value);
    expect(run(e, "p.x;"), n(31), "V15 ObjectControl");
    check(target.observation.receiver === value && realm.observation.boxes.length === 0, "V15 no wrapper");
    const box = realm.createStringObject("ab");
    put(box, "x", n(37));
    const boxed = o(box);
    bind(realm, "p", boxed);
    expect(run(e, "p.x;"), n(37), "V16 BoxControl own");
    expect(run(e, "p[0];"), s("a"), "V16 BoxControl virtual");
    check(realm.observation.receiver === boxed && realm.observation.boxes.length === 1, "V16 identity");
    bind(realm, "f", fn(realm, (_r, _a, _c, _l) => normal()));
    expect(run(e, "f.name;"), s("hook"), "V17 CallableControl");
    error(run(e, "null.x;"), nullish, "V18 Null");
    error(run(e, "undefined.x;"), nullish, "V19 Undefined");
    expect(run(e, "true.valueOf;"), realm.booleanPrototype.get("valueOf"), "V21 BooleanMethodIdentity");
}
// S1-S12: literal UTF-16 oracles, independent of host property reads.
const stringRows: { name: string; payload: string; key: Value; expected: Value }[] = [
    { name: "S1 ASCII0", payload: "ab", key: n(0), expected: s("a") },
    { name: "S1 ASCII1", payload: "ab", key: n(1), expected: s("b") },
    { name: "S1 Length", payload: "ab", key: s("length"), expected: n(2) },
    { name: "S2 EmptyLength", payload: "", key: s("length"), expected: n(0) },
    { name: "S2 EmptyIndex", payload: "", key: n(0), expected: U },
    { name: "S3 PairLength", payload: "\ud83d\ude00", key: s("length"), expected: n(2) },
    { name: "S3 PairHigh", payload: "\ud83d\ude00", key: n(0), expected: s("\ud83d") },
    { name: "S3 PairLow", payload: "\ud83d\ude00", key: n(1), expected: s("\ude00") },
    { name: "S3 PairMissing", payload: "\ud83d\ude00", key: n(2), expected: U },
    { name: "S4 LoneHigh", payload: "\ud800", key: n(0), expected: s("\ud800") },
    { name: "S4 LoneLow", payload: "\udc00", key: n(0), expected: s("\udc00") },
    { name: "S4 HighLength", payload: "\ud800", key: s("length"), expected: n(1) },
    { name: "S4 LowLength", payload: "\udc00", key: s("length"), expected: n(1) },
    { name: "S5 Nul", payload: "a\0b", key: n(1), expected: s("\0") },
    { name: "S5 NulLength", payload: "a\0b", key: s("length"), expected: n(3) },
    { name: "S6 NumericZero", payload: "ab", key: n(-0), expected: s("a") },
    { name: "S8 Canonical0", payload: "ab", key: s("0"), expected: s("a") },
    { name: "S8 Canonical1", payload: "ab", key: s("1"), expected: s("b") },
];
for (const row of stringRows) {
    const realm = fresh();
    const e = new Evaluator(realm);
    bind(realm, "p", s(row.payload));
    bind(realm, "k", row.key);
    expect(run(e, "p[k];"), row.expected, row.name);
}
for (const key of [s("-0"), s("01"), s("1.0"), s("1e0"), s(""), n(-1), n(0.5), n(2), n(NaN), n(Infinity)]) {
    const realm = fresh();
    bind(realm, "k", key);
    expect(run(new Evaluator(realm), "'ab'[k];"), U, "S7 Nonindices");
}
{
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    put(realm.stringPrototype, "0", s("z"));
    put(realm.stringPrototype, "2", s("z"));
    put(realm.stringPrototype, "-0", s("z"));
    expect(run(e, "'ab'[0];"), s("a"), "S9 VirtualWins");
    expect(run(e, "'ab'[2];"), s("z"), "S10 MissingInherits");
    expect(run(e, "'ab'['-0'];"), s("z"), "S11 NoncanonicalInherits");
    expect(run(e, "'ab'.length;"), n(2), "S12 LengthOwn");
    check(sameValue(realm.stringPrototype.get("length"), n(0)), "S12 prototype length");
    const box = realm.observation.boxes[0];
    const index = box.getOwnProperty("0");
    const length = box.getOwnProperty("length");
    check(index !== undefined && sameValue(index.value, s("a")) && !index.writable && index.enumerable && !index.configurable, "S13 index descriptor");
    check(length !== undefined && sameValue(length.value, n(2)) && !length.writable && !length.enumerable && !length.configurable, "S13 length descriptor");
    box.preventExtensions();
    const defined = box.defineOwnProperty("0", { value: s("a") }, e.context, loc);
    const snapshot = box.properties;
    snapshot.delete("0");
    check(defined.type === "normal" && defined.value && box.ownPropertyKeys().length === 3 && box instanceof GuestStringObject && box.stringData === "ab", "S14 NoMaterialization");
    expect(box.internalGet("0", o(box), loc), s("a"), "S14 virtual survives");
}
// E1-E23/E30 share explicit scenario names and literal trace oracles.
function effects(name: string, value: Value, expectedTrace: string): void {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const observation = realm.observation;
    const root = prototype(realm, value);
    const key = realm.createObject();
    const keyValue = o(key);
    let currentBase = value;
    let currentKey = keyValue;
    let conversions = 0;
    let methods = 0;
    let argumentsSeen = 0;
    let source = "b()[k()](a(), a());";
    if (name === "E2 ReadOrder" || name === "E19 KeyRebinding") {
        source = "b()[k()];";
    }
    const method = fn(realm, (receiver, args, _c, _l) => {
        observation.trace += "M";
        methods++;
        check(receiver === value && args.length === 2, name + " method receiver/arguments");
        return normal(receiver);
    });
    put(root, "m", method);
    const convert = fn(realm, (receiver, args, _c, _l) => {
        observation.trace += "C";
        conversions++;
        check(receiver === keyValue && args.length === 1 && sameValue(args[0], s("string")), name + " key receiver/hint");
        if (name === "E6 HookThrow") {
            return Q;
        }
        if (name === "E13 HookObject") {
            return normal(keyValue);
        }
        if (name === "E21 PrototypeMutation") {
            put(root, "m", method);
        }
        if (name === "E22 PrototypeDeletion") {
            root.internalDelete("m");
        }
        return normal(name === "E17 SymbolResult" ? sym(identity) : s("m"));
    });
    put(key, wellKnownToPrimitive, convert);
    if (name === "E12 HookNoncallable") {
        put(key, wellKnownToPrimitive, n(7));
    }
    if (name === "E14 OrdinaryFirst" || name === "E15 OrdinaryFallback" || name === "E16 OrdinaryMissing") {
        key.internalDelete(wellKnownToPrimitive);
        put(key, "toString", fn(realm, (receiver, args, _c, _l) => {
            observation.trace += "T";
            check(receiver === keyValue && args.length === 0, name + " ordinary hint");
            return normal(name === "E15 OrdinaryFallback" ? keyValue : s("m"));
        }));
        put(key, "valueOf", fn(realm, (_r, _a, _c, _l) => {
            observation.trace += "V";
            return normal(s("m"));
        }));
        if (name === "E16 OrdinaryMissing") {
            put(key, "toString", n(7));
            put(key, "valueOf", n(7));
        }
    }
    if (name === "E17 SymbolResult") {
        put(root, identity, method);
    }
    if (name === "E21 PrototypeMutation") {
        put(root, "m", n(7));
    }
    if (name === "E9 Noncallable" || name === "E11 ArgumentWins") {
        put(root, "m", n(7));
    }
    if (name === "E10 MissingCall") {
        root.internalDelete("m");
    }
    if (name === "E7 GetThrow") {
        observation.abrupt = Q;
    }
    bind(realm, "b", fn(realm, (_r, _a, _c, _l) => {
        observation.trace += "B";
        return name === "E3 BaseThrow" ? Q : normal(currentBase);
    }));
    bind(realm, "k", fn(realm, (_r, _a, _c, _l) => {
        observation.trace += "K";
        const captured = currentKey;
        if (name === "E19 KeyRebinding") {
            currentKey = s("other");
        }
        if (name === "E20 BaseRebinding") {
            currentBase = b(false);
        }
        return name === "E4 KeyExpressionThrow" ? Q : normal(captured);
    }));
    bind(realm, "a", fn(realm, (_r, _a, _c, _l) => {
        observation.trace += "A";
        argumentsSeen++;
        if (name === "E23 ArgumentMutation") {
            put(root, "m", n(7));
            currentBase = b(false);
        }
        return name === "E8 ArgumentThrow" || name === "E11 ArgumentWins" ? Q : normal(n(1));
    }));
    if (name === "E4 KeyExpressionThrow" || name === "E5 NullBeforeHook") {
        currentBase = nil;
    }
    if (name === "E5 UndefinedBeforeHook") {
        currentBase = U;
    }
    const result = run(e, source);
    check(observation.trace === expectedTrace, name + " trace: " + observation.trace);
    if (["E3 BaseThrow", "E4 KeyExpressionThrow", "E6 HookThrow", "E7 GetThrow", "E8 ArgumentThrow", "E11 ArgumentWins"].includes(name)) {
        exact(result, name);
    } else if (name === "E5 NullBeforeHook" || name === "E5 UndefinedBeforeHook") {
        error(result, nullish, name);
        check(observation.boxes.length === 0, name + " no wrapper");
    } else if (["E9 Noncallable", "E10 MissingCall", "E22 PrototypeDeletion"].includes(name)) {
        error(result, "value is not callable", name);
    } else if (name === "E12 HookNoncallable") {
        error(result, "symbol toPrimitive method is not callable", name);
    } else if (name === "E13 HookObject" || name === "E16 OrdinaryMissing") {
        error(result, "cannot convert object to primitive", name);
    } else if (source === "b()[k()];") {
        expect(result, method, name);
    } else {
        expect(result, value, name);
        check(methods === 1 && argumentsSeen === 2, name + " counts");
    }
    if (expectedTrace.includes("C")) {
        check(conversions === 1, name + " one conversion");
    }
    if (expectedTrace.includes("G")) {
        check(observation.reads === 1 && observation.receiver === value, name + " original receiver");
    }
    if (name === "E17 SymbolResult") {
        check(observation.key === identity, name + " exact symbol");
    }
    clean(e, realm, name);
}
const effectRows = [
    ["E1 CallOrder", "BKCGAAM"], ["E2 ReadOrder", "BKCG"], ["E3 BaseThrow", "B"],
    ["E4 KeyExpressionThrow", "BK"], ["E5 NullBeforeHook", "BK"], ["E5 UndefinedBeforeHook", "BK"],
    ["E6 HookThrow", "BKC"], ["E7 GetThrow", "BKCG"], ["E8 ArgumentThrow", "BKCGA"],
    ["E9 Noncallable", "BKCGAA"], ["E10 MissingCall", "BKCGAA"], ["E11 ArgumentWins", "BKCGA"],
    ["E12 HookNoncallable", "BK"], ["E13 HookObject", "BKC"], ["E14 OrdinaryFirst", "BKTGAAM"],
    ["E15 OrdinaryFallback", "BKTVGAAM"], ["E16 OrdinaryMissing", "BK"], ["E17 SymbolResult", "BKCGAAM"],
    ["E19 KeyRebinding", "BKCG"], ["E20 BaseRebinding", "BKCGAAM"],
    ["E21 PrototypeMutation", "BKCGAAM"], ["E22 PrototypeDeletion", "BKCGAA"], ["E23 ArgumentMutation", "BKCGAAM"],
];
for (const row of effectRows) {
    effects(row[0], b(true), row[1]);
}
for (const value of [n(2), s("ab"), sym(identity)]) {
    // E30 KeyEffectsOnPrimitives repeats success, abrupt and invalid hook paths.
    effects("E2 ReadOrder", value, "BKCG");
    effects("E6 HookThrow", value, "BKC");
    effects("E12 HookNoncallable", value, "BK");
}
{
    const keys: Value[] = [nil, U, b(true), b(false), n(0), n(-0), n(NaN), n(Infinity)];
    const expected = ["null", "undefined", "true", "false", "0", "0", "NaN", "Infinity"];
    for (let index = 0; index < keys.length; index++) {
        const realm = new ObservedRealm();
        const e = new Evaluator(realm);
        bind(realm, "k", keys[index]);
        expect(run(e, "true[k];"), U, "E18 PrimitiveKeys");
        check(realm.observation.key === expected[index] && e.steps === 4 && e.calls === 0, "E18 exact key/no hook");
    }
    const realm = fresh();
    const e = new Evaluator(realm);
    expect(run(e, "'ab'[0].length;"), n(1), "E24 Chain");
    error(run(e, "'ab'.x.y;"), nullish, "E25 MissingChain");
    expect(run(e, "typeof false.x;"), s("undefined"), "E26 Typeof");
    expect(run(e, "void false.x;"), U, "E27 Void");
    error(run(e, "'x' in false;"), "right operand of in must be an object", "E28 InControl");
    error(run(e, "delete 'ab'.x.y;"), nullish, "E29 NestedDelete", 8);
}

// M1-M7: calls preserve references only through the specified syntax.
for (const value of [b(true), n(-0), s("ab"), sym(identity)]) {
    const realm = fresh();
    const e = new Evaluator(realm);
    expect(program(e, "function method() { return this; }"), U, "M1 setup");
    put(prototype(realm, value), "m", binding(realm, "method"));
    bind(realm, "p", value);
    expect(run(e, "p.m();"), value, "M1 GuestThis");
    expect(run(e, "(p.m)();"), value, "M2 Parenthesized");
    expect(program(e, "let detached = p.m;"), U, "M3 setup");
    expect(run(e, "detached();"), U, "M3 Detached");
    expect(run(e, "(true ? p.m : missing)();"), U, "M4 ConditionalValue");
    expect(run(e, "(p.m || missing)();"), U, "M5 LogicalValue");
}
{
    const realm = fresh();
    const e = new Evaluator(realm);
    const parsed = parse("let f = 'x'.valueOf; f();");
    check(parsed.error === null, "M6 parse");
    error(e.block(parsed.body, realm.global, U), "receiver is not a string", "M6 DetachedBrand", 22);
    expect(run(e, "'x'.valueOf.call('y');"), s("y"), "M7 BorrowedCall");
}
for (const mode of ["normal", "abrupt", "fault"]) {
    const a = new ObservedRealm();
    const foreign = new ObservedRealm();
    const e = new Evaluator(a);
    const foreignEvaluator = new Evaluator(foreign);
    const value = b(true);
    put(a.booleanPrototype, "x", n(1));
    put(foreign.booleanPrototype, "x", n(2));
    bind(a, "p", value);
    expect(run(e, "p.x;"), n(1), "M8 LocalLookup");
    bind(a, "foreignBox", o(foreign.createBooleanObject(true)));
    expect(run(e, "foreignBox.x;"), n(2), "M9 ForeignBox");
    const effectsObject = a.createObject();
    const method = fn(foreign, (receiver, _args, context, _at) => {
        check(context.realm === foreign && receiver === value, "M10 foreign method Realm/this");
        put(effectsObject, "changed", n(3));
        if (mode === "abrupt") {
            return Q;
        }
        if (mode === "fault") {
            throw F;
        }
        return normal(receiver);
    });
    put(a.booleanPrototype, "m", method);
    if (mode === "fault") {
        let escaped = false;
        try {
            run(e, "p.m();");
        } catch (fault) {
            escaped = fault instanceof Error && fault === F;
        }
        check(escaped, "M17 RetainedEffects fault identity");
    } else {
        const result = run(e, "p.m();");
        if (mode === "abrupt") {
            exact(result, "M17 RetainedEffects abrupt");
        } else {
            expect(result, value, "M10 ForeignMethod");
        }
    }
    check(sameValue(effectsObject.get("changed"), n(3)), "M17 mutation retained");
    clean(e, a, "M17");
    expect(program(foreignEvaluator, "function foreignMethod() { return this.x; }"), U, "M11 setup");
    put(a.booleanPrototype, "m", binding(foreign, "foreignMethod"));
    expect(run(e, "p.m();"), n(2), "M11 ForeignGuest");
    const key = a.createObject();
    put(key, wellKnownToPrimitive, fn(foreign, (_r, _args, context, _at) => {
        check(context.realm === foreign && a.observation.boxes.length > 0, "M12 wrapper before foreign hook");
        const wrapper = a.observation.boxes[a.observation.boxes.length - 1];
        check(wrapper.getPrototypeOf() === a.booleanPrototype, "M12 wrapper active Realm");
        put(a.booleanPrototype, "x", n(3));
        return normal(s("x"));
    }));
    bind(a, "k", o(key));
    expect(run(e, "p[k];"), n(3), "M12 ForeignKey");
    clean(e, a, "M12");
    const count = a.observation.boxes.length;
    expect(run(e, "p.x;"), n(3), "M13 first");
    expect(run(e, "p.x;"), n(3), "M13 second");
    const boxes = a.observation.boxes;
    check(boxes.length === count + 2 && boxes[count] !== boxes[count + 1] && boxes[count].getPrototypeOf() === a.booleanPrototype && boxes[count + 1].getPrototypeOf() === a.booleanPrototype, "M13 SeparateReads");
    check(a.observation.receiver === value && a.observation.at.line === 1 && a.observation.at.column === 1, "M14 ReceiverObservation");
    put(a.booleanPrototype, "m", foreign.objectPrototype.get("valueOf"));
    const boxed = run(e, "p.m();");
    check(boxed.type === "normal" && boxed.value.kind === "object" && boxed.value.object instanceof GuestBoolean && boxed.value.object.booleanData && boxed.value.object.getPrototypeOf() === foreign.booleanPrototype && boxed.value.object !== boxes[boxes.length - 1], "M15 BoxingInsideMethod");
    bind(a, "detached", binding(foreign, "foreignMethod"));
    error(run(e, "detached();"), nullish, "M16 DetachedRead", 35);
    put(a.booleanPrototype, "x", n(1));
    expect(run(e, "p.x;"), n(1), "M18 first");
    put(a.booleanPrototype, "x", n(2));
    expect(run(e, "p.x;"), n(2), "M18 FreshPrototype");
}
// W1-W12/W19: direct reference reuse, success-only publication and retry.
const reuseNames = [
    "W1 ReadTwice", "W2 FreshReferences", "W3 ReadThenWrite", "W4 MutationAfterRead",
    "W5 SymbolCache", "W8 ConversionFailure", "W9 DispatchFailureCache",
    "W10 HostFailureCache", "W11 ConversionHostFault", "W12 NoValueCache", "W19 LocationSplit",
];
for (const name of reuseNames) {
    const realm = fresh();
    const e = new Evaluator(realm);
    const target = new ObservedObject();
    const key = realm.createObject();
    const rawKey = o(key);
    const ref: Reference = { kind: "property", base: o(target), key: rawKey, loc: refLoc };
    let hooks = 0;
    put(target, "x", n(1));
    put(target, "y", n(2));
    put(target, identity, n(1));
    put(target, otherIdentity, n(2));
    put(key, wellKnownToPrimitive, fn(realm, (_r, _a, _c, _l) => {
        hooks++;
        if (hooks === 1 && name === "W8 ConversionFailure") {
            return Q;
        }
        if (hooks === 1 && name === "W11 ConversionHostFault") {
            throw F;
        }
        if (name === "W5 SymbolCache") {
            return normal(sym(hooks === 1 ? identity : otherIdentity));
        }
        if (name === "W8 ConversionFailure" || name === "W11 ConversionHostFault") {
            return normal(s("x"));
        }
        return normal(s(hooks === 1 ? "x" : "y"));
    }));
    if (name === "W9 DispatchFailureCache" || name === "W19 LocationSplit") {
        target.observation.abrupt = Q;
    }
    if (name === "W10 HostFailureCache") {
        target.observation.fault = F;
    }
    if (name === "W10 HostFailureCache" || name === "W11 ConversionHostFault") {
        let escaped = false;
        try {
            getValue(ref, e.context, opLoc);
        } catch (fault) {
            escaped = fault instanceof Error && fault === F;
        }
        check(escaped, name + " identity");
    } else {
        const first = getValue(ref, e.context, opLoc);
        if (name === "W8 ConversionFailure" || name === "W9 DispatchFailureCache" || name === "W19 LocationSplit") {
            exact(first, name);
        } else {
            expect(first, n(1), name + " first");
        }
    }
    clean(e, realm, name);
    if (name === "W8 ConversionFailure" || name === "W11 ConversionHostFault") {
        check(ref.key === rawKey, name + " raw key retained");
    } else if (name === "W5 SymbolCache") {
        check(ref.key.kind === "symbol" && ref.key.value === identity, name + " symbol cache");
    } else {
        check(sameValue(ref.key, s("x")), name + " string cache");
    }
    if (name === "W19 LocationSplit") {
        check(target.observation.at === opLoc, name + " dispatch loc");
    }
    target.observation.abrupt = null;
    target.observation.fault = null;
    if (name === "W4 MutationAfterRead") {
        put(key, wellKnownToPrimitive, fn(realm, (_r, _a, _c, _l): Completion => { throw F; }));
    }
    if (name === "W3 ReadThenWrite" || name === "W4 MutationAfterRead" || name === "W5 SymbolCache") {
        expect(putValue(ref, n(3), e.context, opLoc), n(3), name + " write");
        const changed: PropertyKey = name === "W5 SymbolCache" ? identity : "x";
        const unchanged: PropertyKey = name === "W5 SymbolCache" ? otherIdentity : "y";
        check(sameValue(target.get(changed), n(3)) && sameValue(target.get(unchanged), n(2)), name + " properties");
    } else if (name === "W2 FreshReferences") {
        expect(getValue({ kind: "property", base: ref.base, key: rawKey, loc: refLoc }, e.context, opLoc), n(2), name + " fresh");
    } else {
        if (name === "W12 NoValueCache") {
            put(target, "x", n(4));
        }
        expect(getValue(ref, e.context, opLoc), n(name === "W12 NoValueCache" ? 4 : 1), name + " retry");
    }
    const expectedHooks = name === "W2 FreshReferences" || name === "W8 ConversionFailure" || name === "W11 ConversionHostFault" ? 2 : 1;
    check(hooks === expectedHooks, name + " hook count");
}
for (const value of [...primitives, nil, U]) {
    const realm = new ObservedRealm();
    const e = new Evaluator(realm);
    const key = realm.createObject();
    let hooks = 0;
    put(key, wellKnownToPrimitive, fn(realm, (_r, _a, _c, _l) => {
        hooks++;
        return normal(s("x"));
    }));
    const ref: Reference = { kind: "property", base: value, key: o(key), loc: refLoc };
    const isNullish = value.kind === "null" || value.kind === "undefined";
    if (!isNullish) {
        put(prototype(realm, value), "x", n(1));
    }
    const read = getValue(ref, e.context, opLoc);
    if (isNullish) {
        error(read, nullish, "W7/W19 Nullish", 9, 7);
    } else {
        expect(read, n(1), "W6 PrimitiveReadWrite");
    }
    const writeResult = putValue(ref, n(3), e.context, opLoc);
    if (isNullish) {
        error(writeResult, nullish, "W7 write", 9, 7);
    } else {
        error(writeResult, "property is not writable: x", "W6 write", 4, 8);
        check(realm.observation.boxes.length === 2 && realm.observation.boxes[0] !== realm.observation.boxes[1], "W6 fresh Put box");
    }
    check(hooks === (isNullish ? 0 : 1), "W6/W7 hook count");
    if (!isNullish) {
        check(sameValue(prototype(realm, value).get("x"), n(1)), "W6 prototype unchanged");
    }
}
for (const name of ["W13 SimplePrimitiveWrite", "W14 RHSAbrupt", "W15 SimpleObjectWrite"]) {
    for (const value of primitives) {
        const realm = new ObservedRealm();
        const e = new Evaluator(realm);
        const target = realm.createObject();
        const key = realm.createObject();
        let trace = "";
        put(key, wellKnownToPrimitive, fn(realm, (_r, _a, _c, _l) => {
            trace += "X";
            return normal(s("x"));
        }));
        bind(realm, "p", name === "W15 SimpleObjectWrite" ? o(target) : value);
        bind(realm, "k", o(key));
        bind(realm, "rhs", fn(realm, (_r, _a, _c, _l) => {
            trace += "R";
            put(key, wellKnownToPrimitive, fn(realm, (_rr, _aa, _cc, _ll) => {
                trace += "Y";
                return normal(s("y"));
            }));
            return name === "W14 RHSAbrupt" ? Q : normal(n(3));
        }));
        const result = run(e, "p[k] = rhs();");
        if (name === "W14 RHSAbrupt") {
            exact(result, name);
        } else if (name === "W15 SimpleObjectWrite") {
            expect(result, n(3), name);
            check(sameValue(target.get("y"), n(3)) && target.getOwnProperty("x") === undefined, name + " deferred key");
        } else {
            error(result, "property is not writable: y", name);
        }
        if (name === "W13 SimplePrimitiveWrite") {
            check(trace === "RY" && realm.observation.boxes.length === 1, name + " trace/box");
        } else if (name === "W14 RHSAbrupt") {
            check(trace === "R" && realm.observation.boxes.length === 0, name + " trace/no box");
        } else {
            check(trace === "RY" && realm.observation.boxes.length === 0, name + " trace/no box");
        }
    }
}
const parseRows = [
    { source: "p.x += 1;", column: 5, message: "unsupported operator: +=" },
    { source: "p.x++;", column: 4, message: "unsupported operator: ++" },
    { source: "++p.x;", column: 1, message: "unsupported operator: ++" },
    { source: "p.x &&= 1;", column: 7, message: "unsupported or unexpected syntax: =" },
];
for (const row of parseRows) {
    const parsed = parse(row.source);
    check(parsed.error !== null && parsed.error.phase === "parse" && parsed.error.name === "SyntaxError" && parsed.error.message === row.message && parsed.error.loc.line === 1 && parsed.error.loc.column === row.column, "W16 ParseBoundary");
}
for (const name of ["W17 ReadBeforeNumericFailure", "W18 ReadBeforeRHSFailure"]) {
    const realm = fresh();
    const e = new Evaluator(realm);
    const key = realm.createObject();
    let hooks = 0;
    put(key, wellKnownToPrimitive, fn(realm, (_r, _a, _c, _l) => {
        hooks++;
        return normal(s("x"));
    }));
    put(realm.booleanPrototype, "x", sym(identity));
    const ref: Reference = { kind: "property", base: b(true), key: o(key), loc: refLoc };
    const read = getValue(ref, e.context, opLoc);
    expect(read, sym(identity), name + " read");
    const next = name === "W17 ReadBeforeNumericFailure" ? toNumber(read.value, opLoc) : Q;
    if (name === "W17 ReadBeforeNumericFailure") {
        check(next.type === "throw" && next.diagnostic.message === "cannot convert symbol to number" && next.diagnostic.loc === opLoc, name);
    } else {
        check(next === Q, name);
    }
    check(hooks === 1 && sameValue(realm.booleanPrototype.get("x"), sym(identity)), name + " retained state/no Put");
}
{
    const e = new Evaluator(fresh());
    error(run(e, "delete 'ab'[0];"), "property is not configurable: 0", "W20 DeleteControl");
    expect(run(e, "delete 'ab'.x;"), b(true), "W20 absent");
    const key = new ObservedObject();
    key.observation.abrupt = Q;
    const ref: Reference = { kind: "property", base: b(true), key: o(key), loc: refLoc };
    exact(getValue(ref, e.context, opLoc), "W19 key abrupt identity");
    check(key.observation.at === refLoc, "W19 key location");
    put(key, wellKnownToPrimitive, n(7));
    key.observation.abrupt = null;
    error(getValue(ref, e.context, opLoc), "symbol toPrimitive method is not callable", "W19 conversion location", 9, 7);
}

// R1-R19: guards use literal counts and locations, with setup uncharged.
const resourceRows = [
    "R1 Primitive", "R2 StatementGuard", "R3 MemberGuard", "R4 BaseGuard", "R5 KeyGuard", "R6 Exact",
    "R7 Nullish", "R8 Canonical", "R9 OrdinaryFirst", "R10 OrdinarySecond", "R11 HookTickGuard",
    "R12 CallGuard", "R13 SeededDepth", "R14 ChildDepth", "R15 StepWins", "R16 Calls", "R17 CallArguments",
];
for (const name of resourceRows) {
    for (const nullValue of [nil, U]) {
        if (name !== "R7 Nullish" && nullValue.kind === "undefined") {
            continue;
        }
        const realm = new ObservedRealm();
        const e = new Measured(realm);
        let source = "p[k];";
        let hooks = 0;
        let expectedSteps = 4;
        let expectedColumn = 1;
        let expectedMessage = "";
        let expectedDepth = 0;
        put(realm.booleanPrototype, "x", n(7));
        bind(realm, "p", name === "R7 Nullish" ? nullValue : b(true));
        bind(realm, "k", s("x"));
        if (name === "R2 StatementGuard") {
            e.maxSteps = 0;
            expectedSteps = 1;
        }
        if (name === "R3 MemberGuard") {
            e.maxSteps = 1;
            expectedSteps = 2;
        }
        if (name === "R4 BaseGuard") {
            e.maxSteps = 2;
            expectedSteps = 3;
        }
        if (name === "R5 KeyGuard") {
            e.maxSteps = 3;
            expectedColumn = 3;
        }
        if (name === "R6 Exact" || name === "R7 Nullish") { e.maxSteps = 4; }
        if (["R2 StatementGuard", "R3 MemberGuard", "R4 BaseGuard", "R5 KeyGuard"].includes(name)) {
            expectedMessage = "execution step limit exceeded";
        }
        if (["R7 Nullish", "R8 Canonical", "R9 OrdinaryFirst", "R10 OrdinarySecond", "R11 HookTickGuard", "R12 CallGuard"].includes(name)) {
            const key = realm.createObject();
            const hook = fn(realm, (_r, _a, _c, _l) => {
                hooks++;
                return normal(s("x"));
            });
            if (name === "R9 OrdinaryFirst" || name === "R10 OrdinarySecond") {
                put(key, "toString", fn(realm, (_r, _a, _c, _l) => {
                    hooks++;
                    return normal(name === "R10 OrdinarySecond" ? o(key) : s("x"));
                }));
                put(key, "valueOf", hook);
                expectedSteps = name === "R10 OrdinarySecond" ? 7 : 6;
            } else {
                put(key, wellKnownToPrimitive, hook);
                expectedSteps = 5;
            }
            bind(realm, "k", o(key));
        }
        if (name === "R7 Nullish") {
            expectedSteps = 4;
            expectedMessage = nullish;
        }
        if (name === "R11 HookTickGuard") {
            e.maxSteps = 4;
            expectedMessage = "execution step limit exceeded";
        }
        if (name === "R12 CallGuard") {
            e.maxCalls = 0;
            expectedMessage = "call depth limit exceeded";
        }
        if (name === "R13 SeededDepth" || name === "R14 ChildDepth" || name === "R15 StepWins") {
            e.depth = name === "R13 SeededDepth" ? 256 : 255;
            expectedDepth = e.depth;
            expectedSteps = name === "R13 SeededDepth" ? 1 : 2;
            expectedMessage = "evaluation nesting limit exceeded";
            if (name === "R15 StepWins") {
                e.maxSteps = 1;
                expectedMessage = "execution step limit exceeded";
            }
        }
        if (name === "R16 Calls" || name === "R17 CallArguments") {
            put(realm.booleanPrototype, "m", fn(realm, (_r, _a, _c, _l) => {
                hooks++;
                return normal(n(7));
            }));
            source = name === "R16 Calls" ? "p.m();" : "p.m(1, 2);";
            expectedSteps = name === "R16 Calls" ? 4 : 6;
        }
        const parsed = expression(source);
        const result = expectedDepth === 0 ? run(e, source) : e.evaluate(parsed, realm.global, U);
        if (expectedMessage === "") {
            expect(result, n(7), name);
        } else {
            error(result, expectedMessage, name, expectedColumn, 1, name === "R7 Nullish" ? "TypeError" : "RangeError");
        }
        let expectedHooks = 0;
        if (["R8 Canonical", "R9 OrdinaryFirst", "R16 Calls", "R17 CallArguments"].includes(name)) {
            expectedHooks = 1;
        }
        if (name === "R10 OrdinarySecond") {
            expectedHooks = 2;
        }
        check(e.steps === expectedSteps && hooks === expectedHooks && e.depth === expectedDepth && e.calls === 0 && e.context.realm === realm, name + " counts/cleanup");
        check(realm.observation.reads === (expectedMessage === "" ? 1 : 0), name + " dispatch count");
        if (name === "R1 Primitive" || name === "R16 Calls" || name === "R17 CallArguments") {
            check(e.peak === 3, name + " peak");
        }
    }
}
{
    const realm = fresh();
    const e = new Evaluator(realm);
    put(realm.booleanPrototype, "x", n(7));
    const simple: Reference = { kind: "property", base: b(true), key: s("x"), loc };
    expect(getValue(simple, e.context, loc), n(7), "R18 primitive helper");
    check(e.steps === 0, "R18 no charge");
    const key = realm.createObject();
    put(key, wellKnownToPrimitive, fn(realm, (_r, _a, _c, _l) => normal(s("x"))));
    const converted: Reference = { kind: "property", base: b(true), key: o(key), loc };
    expect(getValue(converted, e.context, loc), n(7), "R18 object helper");
    expect(getValue(converted, e.context, loc), n(7), "R18 repeat");
    check(e.steps === 1 && e.calls === 0, "R18 one conversion charge");
    const monotonic = new Evaluator(realm, 7);
    bind(realm, "p", b(true));
    bind(realm, "k", s("x"));
    expect(run(monotonic, "p[k];"), n(7), "R19 first");
    check(monotonic.steps === 4, "R19 first count");
    error(run(monotonic, "p[k];"), "execution step limit exceeded", "R19 Monotonic", 3, 1, "RangeError");
    check(monotonic.steps === 8, "R19 retained budget");
    error(run(monotonic, "p[k];"), "execution step limit exceeded", "R19 exhausted", 1, 1, "RangeError");
    check(monotonic.steps === 9, "R19 still exhausted");
    expect(run(new Evaluator(realm), "p[k];"), n(7), "R19 fresh success");
}
// R20-R25/R30: actual default64, plus explicit 0/1/2 limits, in both Realms.
for (const guest of [false, true]) {
    for (const foreign of [false, true]) {
        for (const limit of [0, 1, 2, 64]) {
            for (const stepFirst of [false, true]) {
                if (stepFirst && (!guest || limit !== 2)) {
                    continue;
                }
                const a = new ObservedRealm();
                const home = foreign ? new ObservedRealm() : a;
                // Deliberately omit the constructor limit for the default64 run.
                const e = limit === 64 ? new Measured(a) : new Measured(a, 100000, limit);
                if (stepFirst) {
                    e.maxSteps = 14;
                }
                const key = home.createObject();
                bind(a, "p", b(true));
                bind(a, "k", o(key));
                bind(home, "p", b(true));
                bind(home, "k", o(key));
                const member = expression("p[k];");
                if (guest) {
                    const setup = new Evaluator(home);
                    expect(program(setup, "function h() { return p[k]; }"), U, "R22 setup");
                    put(key, wellKnownToPrimitive, binding(home, "h"));
                } else {
                    put(key, wellKnownToPrimitive, fn(home, (_r, _a, context, _l) => {
                        check(context.realm === home, "R20/R25 hook Realm");
                        return e.evaluate(member, home.global, U);
                    }));
                }
                const result = run(e, "p[k];");
                let ticks = 5;
                let peak = 3;
                if (guest) {
                    if (limit === 1) {
                        ticks = 10;
                        peak = 5;
                    }
                    if (limit === 2) {
                        ticks = 15;
                        peak = 7;
                    }
                    if (limit === 64) {
                        ticks = 325;
                        peak = 131;
                    }
                } else {
                    if (limit === 1) {
                        ticks = 9;
                        peak = 4;
                    }
                    if (limit === 2) {
                        ticks = 13;
                        peak = 5;
                    }
                    if (limit === 64) {
                        ticks = 261;
                        peak = 67;
                    }
                }
                const name = guest ? "R22/R23 GuestLimits" : "R20/R21 HostLimits";
                const message = stepFirst ? "execution step limit exceeded" : "call depth limit exceeded";
                const column = guest && limit > 0 ? 23 : 1;
                error(result, message, name, column, 1, "RangeError");
                check(e.steps === ticks && e.invocations === limit && e.peak === peak, name + " literal resources");
                const boxes = a.observation.boxes.length + (foreign ? home.observation.boxes.length : 0);
                check(boxes === limit + 1 && a.observation.reads === 0 && home.observation.reads === 0, "R30 NoWrapperCache");
                for (let index = 1; index < home.observation.boxes.length; index++) {
                    check(home.observation.boxes[index] !== home.observation.boxes[index - 1], "R30 distinct wrappers");
                }
                clean(e, a, "R25 ForeignRecursion");
            }
        }
    }
}
// R26-R28: escape identities, Realm/frame restoration, retained work and retry.
for (const stage of ["factory", "keyGet", "keyCall", "targetGet", "method"]) {
    for (const hostFault of [false, true]) {
        if (stage === "factory" && !hostFault) {
            continue;
        }
        const realm = new ObservedRealm();
        const home = fresh();
        const e = new Evaluator(realm);
        const key = new ObservedObject();
        const keyValue = o(key);
        put(key, wellKnownToPrimitive, fn(home, (_r, _a, context, _l) => {
            check(context.realm === home, "R26 foreign key Realm");
            if (stage === "keyCall") {
                if (hostFault) {
                    throw F;
                }
                return Q;
            }
            return normal(s("m"));
        }));
        put(realm.booleanPrototype, "m", fn(home, (_r, _a, context, _l) => {
            check(context.realm === home, "R26 foreign method Realm");
            if (hostFault) {
                throw F;
            }
            return Q;
        }));
        bind(realm, "p", b(true));
        bind(realm, "k", keyValue);
        if (stage === "factory") {
            realm.observation.factoryFault = F;
        }
        if (stage === "keyGet") {
            if (hostFault) {
                key.observation.fault = F;
            } else {
                key.observation.abrupt = Q;
            }
        }
        if (stage === "targetGet") {
            if (hostFault) {
                realm.observation.fault = F;
            } else {
                realm.observation.abrupt = Q;
            }
        }
        const source = stage === "method" ? "p[k]();" : "p[k];";
        if (hostFault) {
            let escaped = false;
            try {
                run(e, source);
            } catch (fault) {
                escaped = fault instanceof Error && fault === F;
            }
            check(escaped, "R27 HostCleanup " + stage);
        } else {
            exact(run(e, source), "R26 AbruptCleanup " + stage);
        }
        clean(e, realm, "R26/R27 " + stage);
        const used = e.steps;
        realm.observation.factoryFault = null;
        realm.observation.fault = null;
        realm.observation.abrupt = null;
        put(realm.booleanPrototype, "x", n(7));
        expect(run(e, "p.x;"), n(7), "R28 Retry " + stage);
        check(e.steps === used + 4, "R28 monotonic ticks");
        clean(e, realm, "R28");
    }
}
// W11 also requires a key-Get host fault to retain the raw reference.
{
    const realm = fresh();
    const e = new Evaluator(realm);
    const key = new ObservedObject();
    key.observation.fault = F;
    const raw = o(key);
    const ref: Reference = { kind: "property", base: b(true), key: raw, loc: refLoc };
    let escaped = false;
    try {
        getValue(ref, e.context, opLoc);
    } catch (fault) {
        escaped = fault instanceof Error && fault === F;
    }
    check(escaped && ref.key === raw, "W11 key Get host fault/raw key");
    clean(e, realm, "W11 key Get");
}
{
    const realm = fresh();
    const e = new Measured(realm);
    let chain = new GuestObject();
    put(chain, "x", n(7));
    for (let index = 0; index < 1000; index++) {
        chain = new GuestObject(chain);
    }
    check(realm.booleanPrototype.setPrototypeOf(chain).value, "R29 setup");
    bind(realm, "p", b(true));
    bind(realm, "k", s("x"));
    expect(run(e, "p[k];"), n(7), "R29 LookupDepth");
    check(e.steps === 4 && e.invocations === 0, "R29 iterative lookup");
}
// C6: a runtime-read injected-symbol fixture, with a literal output oracle.
{
    let output = "";
    const realm = new Realm((line) => { output += line + "\n"; });
    const e = new Evaluator(realm);
    bind(realm, "s", sym(identity));
    const source = readFileSync("test/fixtures/primitive-reads-symbol.js", "utf8");
    expect(program(e, source), U, "C6 Injected");
    check(output === "Symbol(x) true\n", "C6 output");
}
// C10: source slices retain comments and spacing across the new read path.
{
    const realm = fresh();
    const e = new Evaluator(realm);
    const source = "function f() { /*keep*/ return 'ab'[0]; }";
    expect(program(e, source), U, "C10 setup");
    expect(run(e, "f.toString();"), s(source), "C10 SourceRetention");
}
console.log("primitive-reads ok");
