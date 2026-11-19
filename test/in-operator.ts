import type {
    DataDescriptor as InspectionDataDescriptor,
    PropertyDescriptor as InspectionDescriptor,
} from "../src/runtime.js";
function dataDescriptor(d: InspectionDescriptor | undefined): InspectionDataDescriptor | undefined {
    if (d !== undefined && d.kind !== "data") {
        throw new Error("expected data descriptor");
    }
    return d;
}
import type { OperationContext } from "../src/runtime.js";
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { run as interpret } from "../src/interpreter.js";
import { GuestArray } from "../src/array-object.js";
import { GuestStringObject } from "../src/primitive-objects.js";
import {
    GuestObject,
    Environment,
    UNDEFINED as U,
    normal,
    failure,
    sameValue,
    type Value,
    type Completion,
    type ValueCompletion,
    type PropertyKey,
    type Builtin,
    type InternalBooleanCompletion,
    type ThrowCompletion,
} from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import type { Expr, Stmt, Location } from "../src/syntax.js";

function check(ok: boolean, name: string): void {
    if (!ok) {
        throw new Error("in-operator " + name);
    }
}
function s(value: string): Value {
    return { kind: "string", value };
}
function n(value: number): Value {
    return { kind: "number", value };
}
function b(value: boolean): Value {
    return { kind: "boolean", value };
}
function o(object: GuestObject): Value {
    return { kind: "object", object };
}
const nil: Value = { kind: "null" };
const loc: Location = { line: 1, column: 1 };
function fresh(): Realm {
    return new Realm((_line) => {});
}
function bind(env: Environment, name: string, value: Value): void {
    env.bindings.set(name, { initialized: true, mutable: true, value });
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
function run(e: Evaluator, source = "k in o;"): Completion {
    return e.statement(statement(source), e.context.realm.global, U);
}
function program(e: Evaluator, source: string): Completion {
    const parsed = parse(source);
    check(parsed.error === null, "program parse " + source);
    return e.block(parsed.body, e.context.realm.global, U);
}
function expect(result: Completion, value: Value, name: string): void {
    check(result.type === "normal" && sameValue(result.value, value), name);
}
function error(
    result: Completion,
    message: string,
    column: number,
    name: string,
    errorName = "TypeError",
    line = 1,
): void {
    check(
        result.type === "throw" &&
            result.diagnostic.phase === "runtime" &&
            result.diagnostic.name === errorName &&
            result.diagnostic.message === message &&
            result.diagnostic.loc.line === line &&
            result.diagnostic.loc.column === column,
        name,
    );
}
class Measured extends Evaluator {
    peak = 0;
    invocations = 0;
    trace: Trace | null = null;
    evaluate(expr: Expr, env: Environment, receiver: Value, allowUnresolvable = false): Completion {
        this.peak = Math.max(this.peak, this.depth + 1);
        if (
            this.trace !== null &&
            expr.kind === "identifier" &&
            ["a", "p", "b", "q"].includes(expr.name)
        ) {
            this.trace.text += expr.name;
        }
        return super.evaluate(expr, env, receiver, allowUnresolvable);
    }
    call(callee: Value, receiver: Value, args: Value[], at: Location): ValueCompletion {
        if (this.calls < this.maxCalls) {
            this.invocations++;
        }
        return super.call(callee, receiver, args, at);
    }
}
class Trace {
    text = "";
}
class Target extends GuestObject {
    has = 0;
    lastKey: PropertyKey = "";
    abrupt: ThrowCompletion | null = null;
    fault: Error | null = null;
    evaluator: Evaluator | null = null;
    realm: Realm | null = null;
    constructor(
        public trace: Trace = new Trace(),
        proto: GuestObject | null = null,
    ) {
        super(proto);
    }
    internalGet(
        _key: PropertyKey,
        _receiver: Value,
        context: OperationContext,
        _at: Location,
    ): ValueCompletion {
        throw new Error("target Get forbidden");
    }
    internalHasProperty(key: PropertyKey, at: Location): InternalBooleanCompletion {
        this.has++;
        this.lastKey = key;
        this.trace.text += "H";
        if (this.evaluator !== null) {
            check(this.evaluator.context.realm === this.realm, "Has caller Realm");
        }
        if (this.fault !== null) {
            throw this.fault;
        }
        if (this.abrupt !== null) {
            return this.abrupt;
        }
        return super.internalHasProperty(key, at);
    }
}
// These subclasses retain the real exotic descriptor/definition dispatch.
class ArrayTarget extends GuestArray {
    has = 0;
    internalGet(
        _key: PropertyKey,
        _receiver: Value,
        context: OperationContext,
        _at: Location,
    ): ValueCompletion {
        throw new Error("array target Get forbidden");
    }
    internalHasProperty(key: PropertyKey, at: Location): InternalBooleanCompletion {
        this.has++;
        return super.internalHasProperty(key, at);
    }
}
class StringTarget extends GuestStringObject {
    has = 0;
    internalGet(
        _key: PropertyKey,
        _receiver: Value,
        context: OperationContext,
        _at: Location,
    ): ValueCompletion {
        throw new Error("string target Get forbidden");
    }
    internalHasProperty(key: PropertyKey, at: Location): InternalBooleanCompletion {
        this.has++;
        return super.internalHasProperty(key, at);
    }
}
class Key extends GuestObject {
    abrupt: ThrowCompletion | null = null;
    fault: Error | null = null;
    constructor(public trace: Trace) {
        super();
    }
    internalGet(
        key: PropertyKey,
        receiver: Value,
        context: OperationContext,
        at: Location,
    ): ValueCompletion {
        this.trace.text += key === wellKnownToPrimitive ? "K" : key === "toString" ? "S" : "V";
        check(receiver.kind === "object" && receiver.object === this, "key receiver");
        if (this.fault !== null) {
            throw this.fault;
        }
        if (this.abrupt !== null) {
            return this.abrupt;
        }
        return super.internalGet(key, receiver, context, at);
    }
}
function preserved(target: GuestObject, key: Value, expected: boolean, name: string): void {
    const realm = fresh();
    const e = new Measured(realm);
    const keys = target.ownPropertyKeys();
    const descriptors = keys.map((k) => target.getOwnProperty(k)!);
    const proto = target.getPrototypeOf();
    bind(realm.global, "k", key);
    bind(realm.global, "o", o(target));
    const before =
        target instanceof Target || target instanceof ArrayTarget || target instanceof StringTarget
            ? target.has
            : 0;
    expect(run(e), b(expected), name);
    check(realm.global.bindings.get("o")!.value.kind === "object", name + " identity");
    check(sameValue(realm.global.bindings.get("o")!.value, o(target)), name + " captured target");
    check(
        target.getPrototypeOf() === proto && target.ownPropertyKeys().length === keys.length,
        name + " shape",
    );
    for (let i = 0; i < keys.length; i++) {
        const d = target.getOwnProperty(keys[i]);
        check(
            target.ownPropertyKeys()[i] === keys[i] &&
                d !== undefined &&
                d.kind === "data" &&
                sameValue(d.value, dataDescriptor(descriptors[i])!.value) &&
                d.writable === dataDescriptor(descriptors[i])!.writable &&
                d.enumerable === descriptors[i].enumerable &&
                d.configurable === descriptors[i].configurable,
            name + " descriptors",
        );
    }
    if (
        target instanceof Target ||
        target instanceof ArrayTarget ||
        target instanceof StringTarget
    ) {
        check(target.has === before + 1, name + " one Has");
    }
    check(e.depth === 0 && e.calls === 0 && e.context.realm === realm, name + " cleanup");
}

// V1-V3, V9, V16, V20-V23: parsed ordinary, namespace and array operands.
for (const test of [
    { name: "V1 Own", source: "'x' in {x: 7};", value: true },
    { name: "V2 Missing", source: "'x' in {};", value: false },
    { name: "V3 Undefined", source: "'x' in {x: undefined};", value: true },
    { name: "V9 DefaultPrototype", source: "'toString' in {};", value: true },
    {
        name: "V16 OrdinaryKey",
        source: "({toString: function() { return 'x'; }}) in {x: 1};",
        value: true,
    },
    { name: "V20 NumberNamespace", source: "'isNaN' in Number;", value: true },
    { name: "V21 ArrayHole", source: "0 in [,];", value: false },
    { name: "V22 ArrayUndefined", source: "0 in [undefined];", value: true },
    { name: "V23 ArrayLength", source: "'length' in [];", value: true },
]) {
    expect(run(new Measured(fresh()), test.source), b(test.value), test.name);
}
for (const value of [U, nil, b(false), n(0), n(NaN), s("")]) {
    const target = new Target();
    put(target, "x", value);
    preserved(target, s("x"), true, "V4 Falsy");
}
for (const inherited of [false, true]) {
    const parent = new Target();
    parent.bootstrapDefine("x", { value: U });
    const target = inherited ? new Target(new Trace(), parent) : parent;
    preserved(target, s("x"), true, inherited ? "V6 Inherited" : "V5 Nonenumerable");
    if (inherited) {
        check(target.getOwnProperty("x") === undefined, "V6 no own");
    }
}
{
    const parent = new Target();
    put(parent, "x", n(7));
    const target = new Target(new Trace(), parent);
    put(target, "x", U);
    preserved(target, s("x"), true, "V7 Shadow before");
    target.internalDelete("x");
    preserved(target, s("x"), true, "V7 Shadow after");
    check(
        sameValue(dataDescriptor(parent.getOwnProperty("x"))!.value, n(7)),
        "V7 parent unchanged",
    );
}
for (const key of ["x", "toString"]) {
    preserved(new Target(), s(key), false, "V8 NullChain");
}
for (const test of [
    { key: U, spelling: "undefined" },
    { key: nil, spelling: "null" },
    { key: b(true), spelling: "true" },
    { key: b(false), spelling: "false" },
    { key: n(0), spelling: "0" },
    { key: n(-0), spelling: "0" },
    { key: n(NaN), spelling: "NaN" },
    { key: n(Infinity), spelling: "Infinity" },
    { key: n(-Infinity), spelling: "-Infinity" },
    { key: n(1.5), spelling: "1.5" },
]) {
    const target = new Target();
    put(target, test.spelling, U);
    preserved(target, test.key, true, "V10 PrimitiveKeys " + test.spelling);
}
for (const key of ["", "01", "-0", "\0", "\ud800"]) {
    const target = new Target();
    put(target, key, U);
    preserved(target, s(key), true, "V11 ExactStrings");
    preserved(target, s("unrelated"), false, "V11 unrelated");
}
{
    const realm = fresh();
    const symbol = new GuestSymbol("x");
    const other = new GuestSymbol("x");
    const sv: Value = { kind: "symbol", value: symbol };
    const tv: Value = { kind: "symbol", value: other };
    const target = new Target();
    put(target, symbol, U);
    preserved(target, sv, true, "V12 SymbolIdentity");
    preserved(target, tv, false, "V12 different identity");
    preserved(target, s("x"), false, "V12 description");
    const child = new Target(new Trace(), target);
    preserved(child, sv, true, "V13 InheritedSymbol");
    check(child.ownPropertyKeys().length === 0, "V13 no materialization");
    const key = new GuestObject();
    put(
        key,
        wellKnownToPrimitive,
        fn(realm, (_r, args, _c, _l) => {
            check(args.length === 1 && sameValue(args[0], s("string")), "V14 hint");
            return normal(sv);
        }),
    );
    preserved(target, o(key), true, "V14 SymbolResult");
    check(target.lastKey === symbol, "V14 symbol delivered");
    preserved(target, o(realm.createSymbolObject(symbol)), true, "V15 SymbolWrapper");
    const booleanBox = realm.createBooleanObject(false);
    const numberBox = realm.createNumberObject(-0);
    const symbolBox = realm.createSymbolObject(symbol);
    for (const box of [booleanBox, numberBox, symbolBox]) {
        put(box, "x", U);
        preserved(box, s("x"), true, "V17 BooleanNumberBoxes/V18 SymbolBoxRHS");
        preserved(box, s("absent"), false, "V17/V18 missing");
    }
    check(
        booleanBox.booleanData === false &&
            Object.is(numberBox.numberData, -0) &&
            symbolBox.symbolData === symbol,
        "V17/V18 payloads",
    );
    const e = new Measured(realm);
    program(e, "function f() { throw 'must not call'; }");
    const guest = realm.global.bindings.get("f")!.value;
    check(guest.kind === "object", "V19 function setup");
    if (guest.kind === "object") {
        const builtin = realm.createBuiltin("poison", 0, (_r, _a, _c, _l): Completion => {
            throw new Error("RHS invoked");
        });
        for (const callable of [guest.object, builtin, realm.functionPrototype]) {
            preserved(callable, s("toString"), true, "V19 Callable");
            preserved(callable, s("uniqueAbsent"), false, "V19 missing");
        }
    }
}
{
    const array = new ArrayTarget();
    array.bootstrapDefine("length", { value: n(3) });
    const parent = new GuestObject();
    put(parent, "1", U);
    array.setPrototypeOf(parent);
    preserved(array, n(1), true, "V24 ArrayInheritedHole");
    check(array.getOwnProperty("1") === undefined, "V24 no index");
    parent.internalDelete("1");
    preserved(array, n(1), false, "V24 deleted prototype");
    const deleted = new ArrayTarget();
    put(deleted, "0", U);
    deleted.internalDelete("0");
    preserved(deleted, n(0), false, "V25 ArrayDeletedIndex");
    check(sameValue(dataDescriptor(deleted.getOwnProperty("length"))!.value, n(1)), "V25 length");
    const boundary = new ArrayTarget();
    put(boundary, "4294967295", U);
    preserved(boundary, s("4294967295"), true, "V26 ArrayBoundary");
    check(sameValue(dataDescriptor(boundary.getOwnProperty("length"))!.value, n(0)), "V26 length");
    for (const source of ["[,];", "[undefined];", "[];"]) {
        const value = run(new Measured(fresh()), source).value;
        check(value.kind === "object", "V21-V23 array setup");
        if (value.kind === "object") {
            const d = value.object.getOwnProperty("length")!;
            check(
                d.kind === "data" &&
                    sameValue(d.value, n(source === "[];" ? 0 : 1)) &&
                    !d.enumerable,
                "V21-V23 length",
            );
            check(
                (value.object.getOwnProperty("0") !== undefined) === (source === "[undefined];"),
                "V21-V23 own index",
            );
        }
    }
}
{
    const realm = fresh();
    const box = new StringTarget("\ud83d\ude00", realm.stringPrototype);
    for (const key of [n(0), n(1), s("length"), n(-0)]) {
        preserved(box, key, true, "V27 StringVirtual");
    }
    for (const key of [n(2), s("01"), s("-0"), s("1.0")]) {
        preserved(box, key, false, "V27 nonindex");
    }
    check(box.stringData === "\ud83d\ude00", "V27 payload");
    const empty = new StringTarget("", realm.stringPrototype);
    preserved(empty, s("length"), true, "V28 EmptyStringBox");
    preserved(empty, n(0), false, "V28 absent");
    const child = new Target(new Trace(), new StringTarget("a", realm.stringPrototype));
    preserved(child, n(0), true, "V29 InheritedVirtual index");
    preserved(child, s("length"), true, "V29 length");
    const ordinary = new StringTarget("a", realm.stringPrototype);
    const symbol = new GuestSymbol("x");
    put(ordinary, "01", U);
    put(ordinary, symbol, U);
    preserved(ordinary, s("01"), true, "V30 StringOrdinary");
    preserved(ordinary, { kind: "symbol", value: symbol }, true, "V30 symbol");
    preserved(
        ordinary,
        { kind: "symbol", value: new GuestSymbol("x") },
        false,
        "V30 absent symbol",
    );
}
{
    const trace = new Trace();
    const key = new Key(trace);
    key.fault = new Error("poison value");
    const target = new Target();
    put(target, "x", o(key));
    preserved(target, s("x"), true, "V31 PoisonValue");
    check(trace.text === "", "V31 untouched");
    let parent = new GuestObject();
    put(parent, "x", U);
    for (let i = 0; i < 10000; i++) {
        parent = new GuestObject(parent);
    }
    const deep = new Target(new Trace(), parent);
    preserved(deep, s("x"), true, "V32 DeepPrototype");
    preserved(deep, s("absent"), false, "V32 missing");
    const realm = fresh();
    const e = new Measured(realm);
    bind(realm.global, "k", s("x"));
    bind(realm.global, "o", o(deep));
    expect(run(e), b(true), "R25 PresenceWalk");
    check(e.steps === 4 && e.peak === 3 && e.invocations === 0, "R25 resources");
}

// Each ordering scenario owns fresh state. Synthetic overrides expose internal
// operations; they do not add guest accessor or Proxy support.
class Scenario {
    realm = fresh();
    owner: Realm;
    e: Measured;
    trace = new Trace();
    target = new Target(this.trace);
    key = new Key(this.trace);
    sentinel = failure("Sentinel", "original", { line: 9, column: 7 });
    fault = new Error("original host fault");
    constructor(foreign = false) {
        this.owner = foreign ? fresh() : this.realm;
        this.e = new Measured(this.realm);
        this.target.evaluator = this.e;
        this.target.realm = this.realm;
        put(this.target, "x", U);
        this.canonical(
            fn(this.owner, (receiver, args, context, _at) => {
                this.trace.text += "C";
                check(
                    context.realm === this.owner &&
                        sameValue(receiver, o(this.key)) &&
                        sameValue(args[0], s("string")),
                    "hook Realm/receiver/hint",
                );
                return normal(s("x"));
            }),
        );
        bind(this.realm.global, "k", o(this.key));
        bind(this.realm.global, "o", o(this.target));
        bind(
            this.realm.global,
            "left",
            fn(this.realm, (_r, _a, _c, _l) => {
                this.trace.text += "L";
                return normal(o(this.key));
            }),
        );
        bind(
            this.realm.global,
            "right",
            fn(this.realm, (_r, _a, _c, _l) => {
                this.trace.text += "R";
                return normal(o(this.target));
            }),
        );
    }
    canonical(value: Value): void {
        put(this.key, wellKnownToPrimitive, value);
    }
    ordinary(first: Value, second: Value = s("x")): void {
        this.canonical(U);
        put(
            this.key,
            "toString",
            fn(this.owner, (_r, _a, _c, _l) => {
                this.trace.text += "s";
                return normal(first);
            }),
        );
        put(
            this.key,
            "valueOf",
            fn(this.owner, (_r, _a, _c, _l) => {
                this.trace.text += "v";
                return normal(second);
            }),
        );
    }
    finish(trace: string, name: string): void {
        check(this.trace.text === trace, name + " trace: " + this.trace.text);
        check(this.target.has === (trace.includes("H") ? 1 : 0), name + " Has count");
        check(
            this.e.calls === 0 && this.e.depth === 0 && this.e.context.realm === this.realm,
            name + " R24 cleanup",
        );
        const steps = this.e.steps;
        expect(run(this.e, "'x' in {x: 0};"), b(true), name + " R24 reuse");
        check(this.e.steps > steps, name + " R24 monotonic");
    }
}
{
    const t = new Scenario();
    expect(run(t.e, "left() in right();"), b(true), "E1 CaptureOrder");
    t.finish("LRKCH", "E1");
}
for (const left of [true, false]) {
    const t = new Scenario();
    bind(
        t.realm.global,
        left ? "left" : "right",
        fn(t.realm, (_r, _a, _c, _l) => {
            t.trace.text += left ? "L" : "R";
            return t.sentinel;
        }),
    );
    t.key.fault = t.fault;
    check(run(t.e, "left() in right();") === t.sentinel, left ? "E2 LeftAbrupt" : "E3 RightAbrupt");
    t.finish(left ? "L" : "LR", "E2/E3");
}
for (const rhs of [
    U,
    nil,
    b(true),
    n(0),
    n(NaN),
    s(""),
    s("abc"),
    { kind: "symbol", value: new GuestSymbol("x") } as Value,
]) {
    const t = new Scenario();
    t.key.fault = t.fault;
    bind(
        t.realm.global,
        "right",
        fn(t.realm, (_r, _a, _c, _l) => {
            t.trace.text += "R";
            return normal(rhs);
        }),
    );
    error(
        run(t.e, "left() in right();"),
        "right operand of in must be an object",
        1,
        "E4 InvalidRHS",
    );
    t.finish("LR", "E4");
}
{
    const t = new Scenario();
    t.canonical(
        fn(t.owner, (_r, _a, _c, _l) => {
            t.trace.text += "C";
            return t.sentinel;
        }),
    );
    bind(t.realm.global, "o", nil);
    error(run(t.e), "right operand of in must be an object", 1, "E5 InvalidBeforeHook");
    t.finish("", "E5");
}
for (const test of [
    {
        name: "E6 LeftReadWins",
        source: "missing in right();",
        message: "missing is not defined",
        column: 1,
    },
    {
        name: "E7 RightReadWins",
        source: "k in missing;",
        message: "missing is not defined",
        column: 6,
    },
    { name: "E8 TDZ", source: "k in o; let k;", message: "k is not initialized", column: 1 },
    { name: "E9 RightTDZ", source: "k in o; let o;", message: "o is not initialized", column: 6 },
]) {
    const t = new Scenario();
    t.key.fault = t.fault;
    if (test.name === "E8 TDZ") {
        t.realm.global.bindings.delete("k");
    }
    if (test.name === "E9 RightTDZ") {
        t.realm.global.bindings.delete("o");
    }
    error(program(t.e, test.source), test.message, test.column, test.name, "ReferenceError");
    t.finish("", test.name);
}
for (const lookup of [true, false]) {
    const t = new Scenario();
    if (lookup) {
        t.key.abrupt = t.sentinel;
    } else {
        t.canonical(
            fn(t.owner, (_r, _a, _c, _l) => {
                t.trace.text += "C";
                return t.sentinel;
            }),
        );
    }
    check(run(t.e) === t.sentinel, "E10 CanonicalThrow identity");
    t.finish(lookup ? "K" : "KC", "E10");
}
{
    const t = new Scenario();
    t.canonical(n(7));
    error(run(t.e), "symbol toPrimitive method is not callable", 1, "E11 NoncallableHook");
    t.finish("K", "E11");
}
{
    const t = new Scenario();
    t.canonical(
        fn(t.owner, (_r, _a, _c, _l) => {
            t.trace.text += "C";
            return normal(o(t.key));
        }),
    );
    error(run(t.e), "cannot convert object to primitive", 1, "E12 ObjectHookResult");
    t.finish("KC", "E12");
}
for (const absent of [nil, U]) {
    const t = new Scenario();
    t.ordinary(s("x"));
    t.canonical(absent);
    expect(run(t.e), b(true), "E13 OrdinaryFirst");
    t.finish("KSsH", "E13");
}
{
    const t = new Scenario();
    t.ordinary(o(t.key));
    expect(run(t.e), b(true), "E14 OrdinarySecond");
    t.finish("KSsVvH", "E14");
}
{
    const t = new Scenario();
    t.ordinary(s("unused"));
    put(t.key, "toString", n(7));
    expect(run(t.e), b(true), "E15 SkipNoncallable");
    t.finish("KSVvH", "E15");
}
{
    const t = new Scenario();
    t.ordinary(o(t.key), o(t.key));
    error(run(t.e), "cannot convert object to primitive", 1, "E16 NoPrimitive");
    t.finish("KSsVv", "E16");
}
{
    const t = new Scenario();
    t.ordinary(o(t.key), s("wrong"));
    put(
        t.key,
        "toString",
        fn(t.owner, (_r, _a, _c, _l) => {
            t.trace.text += "s";
            put(
                t.key,
                "valueOf",
                fn(t.owner, (_r2, _a2, _c2, _l2) => {
                    t.trace.text += "v";
                    return normal(s("x"));
                }),
            );
            return normal(o(t.key));
        }),
    );
    expect(run(t.e), b(true), "E17 FreshFallback");
    t.finish("KSsVvH", "E17");
}
{
    const t = new Scenario();
    t.canonical(n(7));
    bind(
        t.realm.global,
        "right",
        fn(t.realm, (_r, _a, _c, _l) => {
            t.trace.text += "R";
            t.canonical(
                fn(t.owner, (_r2, _a2, _c2, _l2) => {
                    t.trace.text += "C";
                    return normal(s("x"));
                }),
            );
            return normal(o(t.target));
        }),
    );
    expect(run(t.e, "left() in right();"), b(true), "E18 RightMutatesKey");
    t.finish("LRKCH", "E18");
}
{
    const t = new Scenario();
    const poison = new Key(new Trace());
    poison.fault = t.fault;
    bind(
        t.realm.global,
        "right",
        fn(t.realm, (_r, _a, _c, _l) => {
            t.trace.text += "R";
            bind(t.realm.global, "k", o(poison));
            return normal(o(t.target));
        }),
    );
    expect(run(t.e, "k in right();"), b(true), "E19 RightRebindsKey");
    check(
        sameValue(t.realm.global.bindings.get("k")!.value, o(poison)) && poison.trace.text === "",
        "E19 original captured",
    );
    t.finish("RKCH", "E19");
}
for (const mode of [
    "E20 HookRebindsTarget",
    "E21 HookAdds",
    "E22 HookDeletes",
    "E23 HookPrototype",
    "E32 ThrowMutation",
]) {
    const t = new Scenario();
    const replacement = new Target();
    const parent = new GuestObject();
    put(parent, "x", U);
    const oldProto = t.target.getPrototypeOf();
    if (mode === "E21 HookAdds" || mode === "E23 HookPrototype") {
        t.target.internalDelete("x");
    }
    t.canonical(
        fn(t.owner, (_r, _a, _c, _l) => {
            t.trace.text += "C";
            if (mode === "E20 HookRebindsTarget") {
                bind(t.realm.global, "o", o(replacement));
            }
            if (mode === "E21 HookAdds" || mode === "E32 ThrowMutation") {
                put(t.target, "x", mode === "E21 HookAdds" ? U : n(9));
            }
            if (mode === "E22 HookDeletes") {
                t.target.internalDelete("x");
            }
            if (mode === "E23 HookPrototype") {
                t.target.setPrototypeOf(parent);
            }
            return mode === "E32 ThrowMutation" ? t.sentinel : normal(s("x"));
        }),
    );
    const result = run(t.e);
    if (mode === "E32 ThrowMutation") {
        check(result === t.sentinel, mode + " identity");
    } else {
        expect(result, b(mode !== "E22 HookDeletes"), mode);
    }
    if (mode === "E20 HookRebindsTarget") {
        check(
            replacement.has === 0 &&
                sameValue(t.realm.global.bindings.get("o")!.value, o(replacement)),
            mode + " capture",
        );
    }
    if (mode === "E21 HookAdds" || mode === "E32 ThrowMutation") {
        check(
            sameValue(
                dataDescriptor(t.target.getOwnProperty("x"))!.value,
                mode === "E21 HookAdds" ? U : n(9),
            ),
            mode + " mutation",
        );
    }
    if (mode === "E22 HookDeletes") {
        check(t.target.getOwnProperty("x") === undefined, mode + " deletion");
    }
    if (mode === "E23 HookPrototype") {
        check(
            oldProto === null &&
                t.target.getPrototypeOf() === parent &&
                parent.ownPropertyKeys().length === 1,
            mode + " prototype",
        );
    }
    t.finish(mode === "E32 ThrowMutation" ? "KC" : "KCH", mode);
}
for (const inherited of [false, true]) {
    const t = new Scenario();
    const array = new ArrayTarget();
    put(array, "1", U);
    const parent = new GuestObject();
    if (inherited) {
        put(parent, "1", U);
    }
    array.setPrototypeOf(parent);
    bind(t.realm.global, "o", o(array));
    t.canonical(
        fn(t.owner, (_r, _a, context, at) => {
            const result = array.defineOwnProperty("length", { value: n(0) }, context, at);
            check(result.type === "normal" && result.value, "E24 shrink setup");
            return normal(s("1"));
        }),
    );
    expect(run(t.e), b(inherited), "E24 ArrayShrink");
    check(
        sameValue(dataDescriptor(array.getOwnProperty("length"))!.value, n(0)) &&
            array.getOwnProperty("1") === undefined,
        "E24 final storage",
    );
    check(array.has === 1 && t.e.calls === 0 && t.e.depth === 0, "E24 Has and cleanup");
}
{
    const t = new Scenario();
    t.target.abrupt = t.sentinel;
    check(run(t.e) === t.sentinel, "E25 HasAbrupt");
    t.finish("KCH", "E25");
}
for (const mode of ["E26 HasHostFault", "E27 KeyHostFault lookup", "E27 KeyHostFault hook"]) {
    const t = new Scenario(true);
    if (mode === "E26 HasHostFault") {
        t.target.fault = t.fault;
    } else if (mode === "E27 KeyHostFault lookup") {
        t.key.fault = t.fault;
    } else {
        t.canonical(
            fn(t.owner, (_r, _a, _c, _l): Completion => {
                t.trace.text += "C";
                throw t.fault;
            }),
        );
    }
    let caught = false;
    try {
        run(t.e);
    } catch (fault) {
        caught = fault instanceof Error && fault === t.fault;
    }
    check(caught, mode + " same host fault");
    t.finish(
        mode === "E26 HasHostFault" ? "KCH" : mode === "E27 KeyHostFault lookup" ? "K" : "KC",
        mode,
    );
}
class Member extends GuestObject {
    reads = 0;
    constructor(public value: Value) {
        super();
    }
    internalGet(
        key: PropertyKey,
        _receiver: Value,
        context: OperationContext,
        _at: Location,
    ): ValueCompletion {
        this.reads++;
        check(key === "member", "E28 member key");
        return normal(this.value);
    }
}
{
    const t = new Scenario();
    t.e.trace = t.trace;
    const a = new Member(o(t.key));
    const bb = new Member(o(t.target));
    const p = new GuestObject();
    const q = new GuestObject();
    let pc = 0;
    let qc = 0;
    put(
        p,
        wellKnownToPrimitive,
        fn(t.realm, (_r, _a, _c, _l) => {
            pc++;
            t.trace.text += "P";
            return normal(s("member"));
        }),
    );
    put(
        q,
        wellKnownToPrimitive,
        fn(t.realm, (_r, _a, _c, _l) => {
            qc++;
            t.trace.text += "Q";
            return normal(s("member"));
        }),
    );
    bind(t.realm.global, "a", o(a));
    bind(t.realm.global, "b", o(bb));
    bind(t.realm.global, "p", o(p));
    bind(t.realm.global, "q", o(q));
    expect(run(t.e, "a[p] in b[q];"), b(true), "E28 OperandMembers");
    check(pc === 1 && qc === 1 && a.reads === 1 && bb.reads === 1, "E28 exactly once");
    t.finish("apPbqQKCH", "E28");
}
{
    const t = new Scenario();
    t.e.trace = t.trace;
    t.key.fault = t.fault;
    bind(t.realm.global, "p", o(t.key));
    error(
        run(t.e, "null[p] in right();"),
        "cannot convert null or undefined to object",
        1,
        "E29 PrimitiveMemberLimit",
    );
    t.finish("p", "E29");
}
for (const inherited of [false, true]) {
    const t = new Scenario();
    if (inherited) {
        const parent = new Target();
        put(parent, "x", U);
        t.target.internalDelete("x");
        t.target.setPrototypeOf(parent);
    }
    expect(run(t.e), b(true), "E30 NoTargetGet");
    t.finish("KCH", "E30");
}
{
    const t = new Scenario(true);
    const ap = t.realm.objectPrototype.getPrototypeOf();
    const bp = t.owner.objectPrototype.getPrototypeOf();
    expect(run(t.e), b(true), "E31 ForeignRealm");
    check(
        t.realm.objectPrototype.getPrototypeOf() === ap &&
            t.owner.objectPrototype.getPrototypeOf() === bp,
        "E31 prototypes",
    );
    t.finish("KCH", "E31");
}

for (const test of [
    { name: "P1 ArithmeticLeft", source: "1 + 1 in {'2': 0};", value: b(true) },
    { name: "P3 RelationalLeft", source: "1 < 2 in {true: 0};", value: b(true) },
    { name: "P4 Chain", source: "'x' in {x: 0} in {true: 0};", value: b(true) },
    { name: "P5 RelationAfter", source: "'x' in {x: 0} < 2;", value: b(true) },
    { name: "P6 Equality", source: "'x' in {x: 0} === true;", value: b(true) },
    { name: "P7 Unary", source: "! 'x' in {false: 0};", value: b(true) },
    { name: "P8 Typeof", source: "typeof 0 in {number: 0};", value: b(true) },
    { name: "P9 Void", source: "void 0 in {undefined: 0};", value: b(true) },
    { name: "P11 Conditional", source: "'x' in {x: 0} ? 7 : missing;", value: n(7) },
    { name: "P13 Logical and", source: "false && missing in null;", value: b(false) },
    { name: "P13 Logical or", source: "true || missing in null;", value: b(true) },
    { name: "P15 Parentheses", source: "(('x')) in ({x: 0});", value: b(true) },
    { name: "P16 WordBoundaries", source: "let inside = 'x'; inside in {x: 0};", value: b(true) },
    { name: "P17 PropertyName", source: "({in: 7}).in;", value: n(7) },
]) {
    const e = new Measured(fresh());
    if (test.name === "P16 WordBoundaries") {
        expect(program(e, test.source), U, test.name + " program");
        expect(run(e, "inside in {x: 0};"), test.value, test.name);
    } else {
        expect(run(e, test.source), test.value, test.name);
    }
}
{
    const t = new Scenario();
    error(
        run(t.e, "'x' in 1 + 1;"),
        "right operand of in must be an object",
        1,
        "P2 ArithmeticRight",
    );
    expect(run(t.e, "1 + 1;"), n(2), "P2 RHS2");
    expect(run(t.e, "delete o.x in {true: 0};"), b(true), "P10 Delete");
    check(t.target.getOwnProperty("x") === undefined, "P10 deletion");
    bind(t.realm.global, "r", U);
    expect(run(t.e, "r = 'x' in {x: 0};"), b(true), "P12 Assignment");
    check(sameValue(t.realm.global.bindings.get("r")!.value, b(true)), "P12 assigned");
    error(run(t.e, "  k in 0;"), "right operand of in must be an object", 3, "P27 LocatedBinary");
}
{
    const realm = fresh();
    const e = new Measured(realm);
    let trace = "";
    const a = new GuestObject();
    put(a, "x", s("y"));
    const target = new Target();
    put(target, "y", U);
    bind(
        realm.global,
        "f",
        fn(realm, (_r, _a, _c, _l) => {
            trace += "f";
            return normal(o(a));
        }),
    );
    bind(
        realm.global,
        "g",
        fn(realm, (_r, _a, _c, _l) => {
            trace += "g";
            return normal(o(target));
        }),
    );
    expect(run(e, "f().x in g();"), b(true), "P14 MemberCall");
    check(trace === "fg" && target.has === 1, "P14 once");
    const plain = new Measured(fresh());
    expect(run(plain, "(('x')) in ({x: 0});"), b(true), "P15");
    const bare = new Measured(fresh());
    run(bare, "'x' in {x: 0};");
    check(plain.steps === bare.steps && plain.peak === bare.peak, "P15 erased parentheses");
}
for (const test of [
    {
        name: "P18 StringNotOperator",
        source: "1 'in' {};",
        message: "expected ';', found 'in'",
        column: 3,
    },
    {
        name: "P19 ReservedBinding let",
        source: "let in = 1;",
        message: "expected binding identifier",
        column: 5,
    },
    {
        name: "P19 ReservedBinding parameter",
        source: "function f(in) {}",
        message: "expected binding identifier",
        column: 12,
    },
    {
        name: "P20 MissingLeft",
        source: "in o;",
        message: "unsupported or unexpected syntax: in",
        column: 1,
    },
    {
        name: "P21 MissingRight",
        source: "'x' in;",
        message: "unsupported or unexpected syntax: ;",
        column: 7,
    },
    {
        name: "P22 AssignmentTarget",
        source: "('x' in o) = true;",
        message: "invalid assignment target",
        column: 1,
    },
    {
        name: "P23 StillUnsupported for",
        source: "for;",
        message: "unsupported or unexpected syntax: for",
        column: 1,
    },
    {
        name: "P23 StillUnsupported instanceof",
        source: "x instanceof o;",
        message: "expected ';', found 'instanceof'",
        column: 3,
    },
    {
        name: "P28 NestedDepth",
        source: "(".repeat(127) + "k in o" + ")".repeat(127) + ";",
        message: "syntax nesting limit exceeded",
        column: 128,
    },
]) {
    const result = parse(test.source).error;
    check(
        result !== null &&
            result.phase === "parse" &&
            result.name === "SyntaxError" &&
            result.message === test.message &&
            result.loc.line === 1 &&
            result.loc.column === test.column,
        test.name,
    );
}
for (const source of ["#x in o;", "o.#x;"]) {
    check(parse(source).error !== null, "P23 private lexer negatives");
}
for (const terminator of ["\n", "\r", "\r\n", "\u2028", "\u2029"]) {
    for (const comment of [false, true]) {
        const separator = comment ? "/*" + terminator + "*/" : terminator;
        expect(
            run(new Measured(fresh()), "'x'" + separator + "in" + separator + "{x:0};"),
            b(true),
            "P24 Terminators",
        );
        error(
            run(new Measured(fresh()), "'x'" + separator + "in" + separator + "0;"),
            "right operand of in must be an object",
            1,
            "P24 location",
        );
    }
}
{
    const realm = fresh();
    const e = new Measured(realm);
    const named = "function f() { /*keep*/ return 'x'\n in {x: 0}; }";
    program(e, named);
    expect(run(e, "f.toString();"), s(named), "P25 NamedSource inherited");
    bind(realm.global, "saved", realm.functionPrototype.get("toString", e.context, loc));
    expect(run(e, "saved.call(f);"), s(named), "P25 saved");
    const anonymous = "function() { return 'x' in {x: 0}; }";
    const result = run(e, "(" + anonymous + ");");
    bind(realm.global, "f", result.value);
    expect(run(e, "f.toString();"), s(anonymous), "P26 AnonymousSource inherited");
    expect(run(e, "saved.call(f);"), s(anonymous), "P26 saved");
}

function primitiveSetup(e: Measured, realm: Realm): Target {
    const target = new Target();
    put(target, "x", U);
    bind(realm.global, "k", s("x"));
    bind(realm.global, "o", o(target));
    return target;
}
for (const limit of [0, 1, 2, 3, 4, 100000]) {
    const realm = fresh();
    const e = new Measured(realm, limit);
    const target = primitiveSetup(e, realm);
    const result = run(e);
    if (limit < 4) {
        error(
            result,
            "execution step limit exceeded",
            limit === 3 ? 6 : 1,
            "R2 StatementBudget/R3 BinaryBudget/R4 LeftBudget/R5 RightBudget",
            "RangeError",
        );
        check(e.steps === limit + 1 && target.has === 0, "R2-R5 counts");
    } else {
        expect(result, b(true), "R1 Primitive/R6 ExactBudget");
        check(
            e.steps === 4 && e.peak === 3 && e.invocations === 0 && target.has === 1,
            "R1/R6 counts",
        );
    }
    check(e.calls === 0 && e.depth === 0, "R24 budget cleanup");
    const steps = e.steps;
    e.maxSteps = 100000;
    expect(run(e), b(true), "R24 budget reuse");
    check(e.steps === steps + 4, "R24 monotonic reuse");
}
for (const mode of [
    "R7 InvalidRHS",
    "R8 Canonical",
    "R9 OrdinaryFirst",
    "R10 OrdinarySecond",
    "R11 KeyTick",
    "R12 CallLimit",
]) {
    const t = new Scenario();
    if (mode === "R7 InvalidRHS") {
        bind(t.realm.global, "o", nil);
        t.e.maxSteps = 4;
    }
    if (mode === "R9 OrdinaryFirst") {
        t.ordinary(s("x"));
    }
    if (mode === "R10 OrdinarySecond") {
        t.ordinary(o(t.key));
    }
    if (mode === "R11 KeyTick") {
        t.e.maxSteps = 4;
    }
    if (mode === "R12 CallLimit") {
        t.e.maxCalls = 0;
    }
    const result = run(t.e);
    if (mode === "R7 InvalidRHS") {
        error(result, "right operand of in must be an object", 1, mode);
    } else if (mode === "R11 KeyTick" || mode === "R12 CallLimit") {
        error(
            result,
            mode === "R11 KeyTick" ? "execution step limit exceeded" : "call depth limit exceeded",
            1,
            mode,
            "RangeError",
        );
    } else {
        expect(result, b(true), mode);
    }
    let ticks = 5;
    if (mode === "R7 InvalidRHS") {
        ticks = 4;
    } else if (mode === "R9 OrdinaryFirst") {
        ticks = 6;
    } else if (mode === "R10 OrdinarySecond") {
        ticks = 7;
    }
    let calls = 0;
    if (mode === "R8 Canonical" || mode === "R9 OrdinaryFirst") {
        calls = 1;
    } else if (mode === "R10 OrdinarySecond") {
        calls = 2;
    }
    check(t.e.steps === ticks && t.e.invocations === calls, mode + " exact counts");
    if (calls === 0) {
        check(t.target.has === 0, mode + " no Has");
    }
    t.e.maxCalls = 64;
    t.e.maxSteps = 100000;
    let trace = "KSsVvH";
    if (mode === "R7 InvalidRHS" || mode === "R11 KeyTick") {
        trace = "";
    } else if (mode === "R12 CallLimit") {
        trace = "K";
    } else if (mode === "R8 Canonical") {
        trace = "KCH";
    } else if (mode === "R9 OrdinaryFirst") {
        trace = "KSsH";
    }
    t.finish(trace, mode);
}
for (const test of [
    {
        name: "R13 FrameEntry",
        seed: 256,
        limit: 100000,
        ticks: 1,
        message: "evaluation nesting limit exceeded",
    },
    {
        name: "R14 LeftFrame",
        seed: 255,
        limit: 100000,
        ticks: 2,
        message: "evaluation nesting limit exceeded",
    },
    {
        name: "R15 GuardPriority",
        seed: 255,
        limit: 1,
        ticks: 2,
        message: "execution step limit exceeded",
    },
]) {
    const realm = fresh();
    const e = new Measured(realm, test.limit);
    primitiveSetup(e, realm);
    e.depth = test.seed;
    error(
        e.evaluate(expression("k in o;"), realm.global, U),
        test.message,
        1,
        test.name,
        "RangeError",
    );
    check(
        e.depth === test.seed &&
            e.steps === test.ticks &&
            e.calls === 0 &&
            e.context.realm === realm,
        test.name + " restored seed",
    );
    e.depth = 0;
    e.maxSteps = 100000;
    expect(run(e), b(true), test.name + " subsequent operation");
    check(e.steps === test.ticks + 4, test.name + " monotonic");
}
{
    const t = new Scenario();
    bind(
        t.realm.global,
        "left",
        fn(t.realm, (_r, _a, _c, _l) => {
            t.trace.text += "L";
            return normal(s("x"));
        }),
    );
    expect(run(t.e, "left() in right();"), b(true), "R16 OperandCalls");
    check(t.e.steps === 4 && t.e.invocations === 2, "R16 counts");
    t.finish("LRH", "R16");
}
{
    const realm = fresh();
    const e = new Measured(realm, 7);
    const target = primitiveSetup(e, realm);
    expect(run(e), b(true), "R17 Monotonic first");
    check(e.steps === 4, "R17 first ticks");
    error(run(e), "execution step limit exceeded", 6, "R17 second", "RangeError");
    check(e.steps === 8 && target.has === 1 && e.depth === 0, "R17 total");
}
// R18 HostRecursion/R19 NativeHost/R20 GuestRecursion/R21 NativeGuest:
// The 64 case deliberately invokes the actual constructor defaults.
for (const foreign of [false, true]) {
    for (const guest of [false, true]) {
        for (const limit of guest ? [0, 2, 64] : [0, 1, 2, 64]) {
            for (const stepGuard of guest && limit === 2 ? [false, true] : [false]) {
                const realm = fresh();
                const owner = foreign ? fresh() : realm;
                const e =
                    limit === 64
                        ? new Measured(realm)
                        : new Measured(realm, stepGuard ? 14 : 100000, limit);
                const target = new Target();
                const key = new GuestObject();
                bind(realm.global, "k", o(key));
                bind(realm.global, "o", o(target));
                bind(owner.global, "k", o(key));
                bind(owner.global, "o", o(target));
                const ast = expression("k in o;");
                let hostCalls = 0;
                if (guest) {
                    expect(
                        program(new Measured(owner), "function h() { return k in o; }"),
                        U,
                        "R20 setup",
                    );
                    put(key, wellKnownToPrimitive, owner.global.bindings.get("h")!.value);
                } else {
                    put(
                        key,
                        wellKnownToPrimitive,
                        fn(owner, (_r, _a, context, _l) => {
                            hostCalls++;
                            check(context.realm === owner, "R23 ForeignRecursion hook Realm");
                            return e.evaluate(ast, owner.global, U);
                        }),
                    );
                }
                const result = run(e);
                error(
                    result,
                    stepGuard ? "execution step limit exceeded" : "call depth limit exceeded",
                    guest && limit > 0 ? 23 : 1,
                    "R18-R23 recursion",
                    "RangeError",
                );
                let ticks = 5;
                if (guest) {
                    if (limit === 64) {
                        ticks = 325;
                    } else if (limit === 2) {
                        ticks = 15;
                    }
                } else {
                    if (limit === 64) {
                        ticks = 261;
                    } else if (limit === 2) {
                        ticks = 13;
                    } else if (limit === 1) {
                        ticks = 9;
                    }
                }
                check(
                    e.steps === ticks &&
                        e.invocations === limit &&
                        target.has === 0 &&
                        (guest || hostCalls === limit),
                    "R18-R23 exact recurrence",
                );
                if (guest && limit === 64) {
                    check(e.peak === 131, "R21 default peak131");
                }
                check(
                    e.calls === 0 && e.depth === 0 && e.context.realm === realm,
                    "R23/R24 cleanup",
                );
                const steps = e.steps;
                e.maxSteps = 100000;
                expect(run(e, "'x' in {x: 0};"), b(true), "R24 recursion reuse");
                check(e.steps > steps, "R24 monotonic");
            }
        }
    }
}

// C1 RuntimeSuccess/C2 RuntimeEffects/C3 InjectedRuntime: source is read from
// disk by each host, with literal stdout oracles independent of the engine.
for (const test of [
    { file: "in-success.js", stdout: "true false true\n" },
    { file: "in-effects.js", stdout: "true LRC 1 1 1\n" },
    { file: "in-injected.js", stdout: "true false true false\n" },
]) {
    let output = "";
    const realm = new Realm((line) => {
        output += line + "\n";
    });
    const symbol = new GuestSymbol("x");
    const target = new Target();
    put(target, symbol, U);
    bind(realm.global, "s", { kind: "symbol", value: symbol });
    bind(realm.global, "t", { kind: "symbol", value: new GuestSymbol("x") });
    bind(realm.global, "o", o(target));
    bind(realm.global, "box", o(realm.createStringObject("a")));
    expect(
        program(new Measured(realm), readFileSync("test/fixtures/" + test.file, "utf8")),
        U,
        "C1-C3 fixture",
    );
    check(output === test.stdout, "C1-C3 literal output " + test.file);
}
{
    const realm = fresh();
    let effects = 0;
    bind(
        realm.global,
        "effect",
        fn(realm, (_r, _a, _c, _l) => {
            effects++;
            return normal();
        }),
    );
    const result = interpret(
        readFileSync("test/fixtures/in-parse-before-effects.js", "utf8"),
        realm,
    );
    check(
        result.phase === "parse" &&
            result.diagnostic.name === "SyntaxError" &&
            result.diagnostic.message === "unsupported or unexpected syntax: ;" &&
            result.diagnostic.loc.line === 1 &&
            result.diagnostic.loc.column === 17 &&
            effects === 0,
        "C7 ParseBeforeEffects",
    );
}
// C4 ParsePhase/C5 RuntimePhase/C6 CompetingRuntime/C8 Baseline are also
// asserted by the CLI runner and the independent preservation audit.
console.log("in-operator ok");
