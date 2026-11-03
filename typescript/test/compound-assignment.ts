import type { DataDescriptor as InspectionDataDescriptor, PropertyDescriptor as InspectionDescriptor } from "../src/runtime.js";
function dataDescriptor(d: InspectionDescriptor | undefined): InspectionDataDescriptor | undefined {
    if (d !== undefined && d.kind !== "data") throw new Error("expected data descriptor");
    return d;
}
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { lex } from "../src/lexer.js";
import { GuestBoolean, GuestNumber, GuestStringObject, GuestSymbolObject } from "../src/primitive-objects.js";
import { GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import {
    GuestObject, Environment, UNDEFINED as U, normal, failure, sameValue, getValue, putValue,
    type Value, type Completion, type ValueCompletion, type ThrowCompletion, type InternalBooleanCompletion,
    type PropertyKey, type Builtin, type Reference, type OperationContext,
} from "../src/runtime.js";
import type { Expr, Stmt, Location } from "../src/syntax.js";

function check(ok: boolean, name: string): void {
    if (!ok) throw new Error("compound-assignment " + name);
}
function n(value: number): Value { return { kind: "number", value }; }
function s(value: string): Value { return { kind: "string", value }; }
function b(value: boolean): Value { return { kind: "boolean", value }; }
function o(object: GuestObject): Value { return { kind: "object", object }; }
function y(value: GuestSymbol): Value { return { kind: "symbol", value }; }
const nil: Value = { kind: "null" };
const loc: Location = { line: 1, column: 1 };
const sentinelLoc: Location = { line: 7, column: 9 };
const Q: ThrowCompletion = failure("ReferenceError", "sentinel", sentinelLoc);
Q.value = o(new GuestObject());
const F = new Error("host sentinel");
const Y = new GuestSymbol("s");
const Z = new GuestSymbol("s");
const ops = ["+=", "-=", "*=", "/=", "%="];
const names = ["Add", "Sub", "Mul", "Div", "Rem"];
const baseline: Value[] = [n(15), n(9), n(36), n(4), n(0)];
const numericString: Value[] = [s("123"), n(9), n(36), n(4), n(0)];
const nanVector: Value[] = [n(NaN), n(NaN), n(NaN), n(NaN), n(NaN)];
const nullish = "cannot convert null or undefined to object";
const stepError = "execution step limit exceeded";
const callError = "call depth limit exceeded";
const depthError = "evaluation nesting limit exceeded";
class Events {
    trace = "";
    abrupt = "";
    fault = "";
    realms: Realm[] = [];
    getKeys: PropertyKey[] = [];
    setKeys: PropertyKey[] = [];
    receivers: Value[] = [];
    locations: Location[] = [];
    afterGet: (() => void) | null = null;
    setFalse = false;
    stage(stage: string, realm: Realm): ValueCompletion {
        this.trace += stage;
        this.realms.push(realm);
        if (this.fault === stage) throw F;
        if (this.abrupt === stage) return Q;
        return normal();
    }
}
class Target extends GuestObject {
    constructor(public events: Events, public evaluator: Evaluator) { super(); }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        this.events.getKeys.push(key);
        this.events.receivers.push(receiver);
        this.events.locations.push(at);
        const stage = this.events.stage("G", this.evaluator.context.realm);
        if (stage.type === "throw") return stage;
        if (this.events.afterGet !== null) this.events.afterGet();
        return super.internalGet(key, receiver, context, at);
    }
    internalSet(key: PropertyKey, value: Value, receiver: Value, context: OperationContext, at: Location): InternalBooleanCompletion {
        this.events.setKeys.push(key);
        this.events.receivers.push(receiver);
        this.events.locations.push(at);
        const stage = this.events.stage("S", context.realm);
        if (stage.type === "throw") return stage;
        if (this.events.setFalse) return { type: "normal", value: false };
        return super.internalSet(key, value, receiver, context, at);
    }
}
class Scenario {
    realm = new Realm((_line) => {});
    foreign = new Realm((_line) => {});
    third = new Realm((_line) => {});
    e = new Measured(this.realm);
    events = new Events();
    target = new Target(this.events, this.e);
    base: Value = o(this.target);
    key = this.realm.createObject();
    old = this.realm.createObject();
    right = this.realm.createObject();
    keyResult: Value = s("x");
    oldResult: Value = n(12);
    rightResult: Value = n(3);
    rhsResult: Value = n(3);
    rhsAction: (() => void) | null = null;
    hints: Value[] = [];
    constructor() {
        seed(this.target, "x", n(12));
        this.hooks(this.realm, this.realm, this.realm, this.realm);
        bind(this.realm, "base", fn(this.realm, (_this, _args, _context, _at) => {
            const stage = this.events.stage("B", this.e.context.realm);
            return stage.type === "throw" ? stage : normal(this.base);
        }));
        bind(this.realm, "key", fn(this.realm, (_this, _args, _context, _at) => {
            const stage = this.events.stage("K", this.e.context.realm);
            return stage.type === "throw" ? stage : normal(o(this.key));
        }));
        bind(this.realm, "p", this.base);
        bind(this.realm, "k", o(this.key));
    }
    hooks(keyRealm: Realm, oldRealm: Realm, rightRealm: Realm, rhsRealm: Realm): void {
        seed(this.key, wellKnownToPrimitive, fn(keyRealm, (_this, args, _context, _at) => {
            check(sameValue(args[0], s("string")), "key hint");
            const stage = this.events.stage("C", this.e.context.realm);
            return stage.type === "throw" ? stage : normal(this.keyResult);
        }));
        seed(this.old, wellKnownToPrimitive, fn(oldRealm, (_this, args, _context, _at) => {
            this.hints.push(args[0]);
            const stage = this.events.stage("L", this.e.context.realm);
            return stage.type === "throw" ? stage : normal(this.oldResult);
        }));
        seed(this.right, wellKnownToPrimitive, fn(rightRealm, (_this, args, _context, _at) => {
            this.hints.push(args[0]);
            const stage = this.events.stage("H", this.e.context.realm);
            return stage.type === "throw" ? stage : normal(this.rightResult);
        }));
        bind(this.realm, "rhs", fn(rhsRealm, (_this, _args, _context, _at) => {
            const stage = this.events.stage("R", this.e.context.realm);
            if (stage.type === "throw") return stage;
            if (this.rhsAction !== null) this.rhsAction();
            return normal(this.rhsResult);
        }));
    }
    operands(): void {
        seed(this.target, "x", o(this.old));
        this.rhsResult = o(this.right);
    }
    run(op: string): Completion { return run(this.e, "base()[key()] " + op + " rhs();"); }
    dispatch(name: string, expectedKey: PropertyKey = "x"): void {
        for (const key of this.events.getKeys) check(key === expectedKey, name + " Get key");
        for (const key of this.events.setKeys) check(key === expectedKey, name + " Set key");
        for (const receiver of this.events.receivers) check(receiver.kind === "object" && receiver.object === this.target, name + " Receiver");
        clean(this.e, this.realm, name);
    }
}
function bind(realm: Realm, name: string, value: Value, mutable = true, initialized = true): void {
    realm.global.bindings.set(name, { value, mutable, initialized });
}
function binding(realm: Realm, name: string): Value {
    const entry = realm.global.bindings.get(name);
    if (entry === undefined) throw new Error("missing binding " + name);
    return entry.value;
}
function seed(object: GuestObject, key: PropertyKey, value: Value, writable = true, configurable = true): void {
    object.bootstrapDefine(key, { value, writable, enumerable: true, configurable });
}
function own(object: GuestObject, key: PropertyKey): Value {
    const desc = object.getOwnProperty(key);
    if (desc !== undefined && desc.kind !== "data") throw new Error("expected data descriptor");
    return desc === undefined ? U : desc.value;
}
function fn(realm: Realm, body: Builtin): Value { return o(realm.createBuiltin("hook", 0, body)); }
function statement(source: string): Stmt {
    const parsed = parse(source);
    check(parsed.error === null && parsed.body.length === 1, "parse " + source);
    return parsed.body[0];
}
function expression(source: string): Expr {
    const stmt = statement(source);
    if (stmt.kind !== "expression") throw new Error("expected expression");
    return stmt.expression;
}
function run(e: Evaluator, source: string): Completion {
    return e.statement(statement(source), e.context.realm.global, U);
}
function program(e: Evaluator, source: string): Completion {
    const parsed = parse(source);
    check(parsed.error === null, "program parse " + source);
    return e.block(parsed.body, e.context.realm.global, U);
}
function expect(result: Completion, value: Value, name: string): void {
    check(result.type === "normal" && sameValue(result.value, value), name + " result");
}
function error(result: Completion, message: string, name: string, column = 1, kind = "TypeError", line = 1): void {
    check(result.type === "throw" && result.diagnostic.phase === "runtime" && result.diagnostic.name === kind &&
        result.diagnostic.message === message && result.diagnostic.loc.line === line && result.diagnostic.loc.column === column, name + " diagnostic");
}
function exact(result: Completion | InternalBooleanCompletion, name: string): void {
    check(result === Q && result.value === Q.value && result.type === "throw" && result.diagnostic === Q.diagnostic, name + " exact sentinel");
}
function clean(e: Evaluator, realm: Realm, name: string, calls = 0, depth = 0): void {
    check(e.calls === calls && e.depth === depth && e.context.realm === realm, name + " cleanup");
}
class Measured extends Evaluator {
    peak = 0;
    invocations = 0;
    rhsEvaluations = 0;
    watchedRHS: Expr | null = null;
    rhsAttempts = 0;
    rhsSuccesses = 0;
    compoundRealms: Realm[] = [];
    evaluate(expr: Expr, env: Environment, receiver: Value, allowUnresolvable = false): Completion {
        this.peak = Math.max(this.peak, this.depth + 1);
        if (expr.kind === "literal" && expr.value === 3 || expr.kind === "identifier" && expr.name === "r") this.rhsEvaluations++;
        if (expr.kind === "compound") this.compoundRealms.push(this.context.realm);
        if (expr === this.watchedRHS) this.rhsAttempts++;
        const result = super.evaluate(expr, env, receiver, allowUnresolvable);
        if (expr === this.watchedRHS && result.type === "normal") this.rhsSuccesses++;
        return result;
    }
    call(callee: Value, receiver: Value, args: Value[], at: Location): ValueCompletion {
        if (this.calls < this.maxCalls) this.invocations++;
        return super.call(callee, receiver, args, at);
    }
}

// V1-V32: each vector is independently literal, never produced by binary().
type ValueRow = { name: string; left: Value; right: Value; expected: Value[] };
const valueRows: ValueRow[] = [
    { name: "V1 Numbers", left: n(12), right: n(3), expected: baseline },
    { name: "V2 LeftString", left: s("12"), right: n(3), expected: numericString },
    { name: "V3 RightString", left: n(12), right: s("3"), expected: numericString },
    { name: "V4 Booleans", left: b(true), right: b(false), expected: [n(1), n(1), n(0), n(Infinity), n(NaN)] },
    { name: "V5 Null", left: nil, right: n(3), expected: [n(3), n(-3), n(0), n(0), n(0)] },
    { name: "V6 Undefined", left: U, right: n(3), expected: nanVector },
    { name: "V7 NaN", left: n(NaN), right: n(3), expected: nanVector },
    { name: "V8 Infinity", left: n(Infinity), right: n(3), expected: [n(Infinity), n(Infinity), n(Infinity), n(Infinity), n(NaN)] },
    { name: "V9 BothInfinity", left: n(Infinity), right: n(Infinity), expected: [n(Infinity), n(NaN), n(Infinity), n(NaN), n(NaN)] },
    { name: "V10 NegativeZero", left: n(-0), right: n(3), expected: [n(3), n(-3), n(-0), n(-0), n(-0)] },
    { name: "V11 BothNegativeZero", left: n(-0), right: n(-0), expected: [n(-0), n(0), n(0), n(NaN), n(NaN)] },
    { name: "V12 NegativeDivisor", left: n(12), right: n(-3), expected: [n(9), n(15), n(-36), n(-4), n(0)] },
    { name: "V13 NegativeDividend", left: n(-13), right: n(3), expected: [n(-10), n(-16), n(-39), n(-4.333333333333333), n(-1)] },
    { name: "V14 InvalidNumericString", left: s("bad"), right: n(3), expected: [s("bad3"), n(NaN), n(NaN), n(NaN), n(NaN)] },
    { name: "V15 WhitespaceString", left: s(" 12 "), right: n(3), expected: [s(" 12 3"), n(9), n(36), n(4), n(0)] },
];
for (let i = 0; i < ops.length; i++) {
    for (const row of valueRows) {
        const realm = new Realm((_line) => {});
        const e = new Measured(realm);
        bind(realm, "x", row.left);
        bind(realm, "rhs", row.right);
        const name = row.name + names[i];
        const result = run(e, "x " + ops[i] + " rhs;");
        expect(result, row.expected[i], name);
        check(sameValue(binding(realm, "x"), row.expected[i]), name + " stored");
        clean(e, realm, name);
    }
    for (let row = 16; row <= 32; row++) {
        const name = "V" + row + " " + names[i];
        const realm = new Realm((_line) => {});
        const e = new Measured(realm);
        const left = realm.createObject();
        const right = realm.createObject();
        let trace = "";
        const hints: Value[] = [];
        let leftValue: Value = o(left);
        let rightValue: Value = n(3);
        let expected = baseline[i];
        let message = "";
        let expectedTrace = "";
        seed(left, wellKnownToPrimitive, fn(realm, (_this, args, _context, _at): Completion => {
            trace += "L";
            hints.push(args[0]);
            if (row === 24) return Q;
            if (row === 23) return normal(y(Y));
            if (row === 27) return normal(o(left));
            if (row === 31 && i === 0) return normal(s("a"));
            if (row === 32) bind(realm, "rhs", n(99));
            return normal(n(12));
        }));
        seed(right, wellKnownToPrimitive, fn(realm, (_this, args, _context, _at) => {
            trace += "H";
            hints.push(args[0]);
            if (row === 25) return Q;
            return normal(n(3));
        }));
        if (row >= 16 && row <= 19) {
            leftValue = y(Y);
            if (row === 17) leftValue = n(12);
            if (row === 18) leftValue = s("a");
            rightValue = y(Y);
            if (row === 16) rightValue = n(3);
            if (row === 19) rightValue = s("a");
            message = "cannot convert symbol to number";
            if (i === 0 && row >= 18) message = "cannot convert symbol to string";
        } else if (row === 20) {
            leftValue = o(realm.createNumberObject(12));
            rightValue = o(realm.createStringObject("3"));
            expected = numericString[i];
        } else if (row >= 21 && row <= 25 || row === 32) {
            rightValue = o(right);
            expectedTrace = "LH";
            if (row === 22) {
                leftValue = y(Y);
                expectedTrace = i === 0 ? "H" : "";
            }
            if (row === 23 && i !== 0 || row === 24) expectedTrace = "L";
            if (row === 22 || row === 23) message = "cannot convert symbol to number";
        } else if (row === 26) {
            seed(left, wellKnownToPrimitive, n(7));
            message = "symbol toPrimitive method is not callable";
        } else if (row === 27) {
            message = "cannot convert object to primitive";
            expectedTrace = "L";
        } else if (row >= 28 && row <= 30) {
            seed(left, wellKnownToPrimitive, U);
            seed(left, "valueOf", fn(realm, (_this, _args, _context, _at) => {
                trace += "valueOf";
                return normal(o(left));
            }));
            seed(left, "toString", fn(realm, (_this, _args, _context, _at) => {
                trace += "toString";
                if (row === 30) return normal(o(left));
                return normal(s("12"));
            }));
            expectedTrace = "valueOftoString";
            if (row === 29) {
                seed(left, "valueOf", n(7));
                expectedTrace = "toString";
            }
            expected = numericString[i];
            if (row === 30) message = "cannot convert object to primitive";
        } else if (row === 31) {
            expectedTrace = "L";
            if (i === 0) expected = s("a3");
        }
        bind(realm, "x", leftValue);
        bind(realm, "rhs", rightValue);
        const result = run(e, "x " + ops[i] + " rhs;");
        if (row === 24 || row === 25) exact(result, name);
        else if (message !== "") error(result, message, name);
        else expect(result, expected, name);
        let stored = expected;
        if (message !== "" || row === 24 || row === 25) stored = leftValue;
        check(sameValue(binding(realm, "x"), stored), name + " stored");
        check(trace === expectedTrace, name + " trace");
        for (const hint of hints) check(sameValue(hint, s(i === 0 ? "default" : "number")), name + " hint");
        if (row === 32) check(sameValue(binding(realm, "rhs"), n(99)), name + " captured RHS");
        clean(e, realm, name);
    }
}

// E1-E22: visible stages and mutations of the captured reference/value.
const effectNames = ["Once", "Operands", "BaseThrow", "KeyEvalThrow", "NullKeyEval", "NullGet", "KeyThrow", "GetThrow", "RHSThrow", "LeftThrowBeforeWrite", "RightThrowBeforeWrite", "SetThrow", "SetFalse", "RHSReplaceBase", "RHSReplaceKey", "GetReplaceKey", "RHSReplaceProperty", "RHSMutateOld", "RHSRebindOld", "RHSDeletes", "RHSFreeze", "RHSFreezeAndThrow"];
for (let i = 0; i < ops.length; i++) {
    for (let row = 1; row <= 22; row++) {
        const name = "E" + row + " " + effectNames[row - 1] + names[i];
        const q = new Scenario();
        const replacement = q.realm.createObject();
        seed(replacement, "x", n(99));
        seed(q.target, "y", n(77));
        let trace = "BKCGRS";
        let expected = baseline[i];
        let message = "";
        if (row === 2) {
            q.operands();
            trace = "BKCGRLHS";
        }
        if (row >= 3 && row <= 12 && row !== 6) {
            const stages = ["B", "K", "K", "", "C", "G", "R", "L", "H", "S"];
            q.events.abrupt = stages[row - 3];
            const traces = ["B", "BK", "BK", "", "BKC", "BKCG", "BKCGR", "BKCGRL", "BKCGRLH", "BKCGRS"];
            trace = traces[row - 3];
            if (row === 5) q.base = nil;
            if (row === 7 || row === 8) q.events.fault = "R";
            if (row === 9) {
                q.operands();
                q.events.fault = "L";
            }
            if (row === 10 || row === 11) {
                q.operands();
                q.events.fault = "S";
            }
        }
        if (row === 6) {
            q.base = nil;
            q.events.abrupt = "C";
            trace = "BK";
            message = nullish;
        }
        if (row === 13) {
            q.events.setFalse = true;
            message = "property is not writable: x";
        }
        if (row === 14) q.rhsAction = () => { q.base = o(replacement); };
        if (row === 15) q.rhsAction = () => { q.keyResult = s("y"); };
        if (row === 16) q.events.afterGet = () => { q.events.fault = "C"; };
        if (row === 17) q.rhsAction = () => { seed(q.target, "x", n(99)); };
        if (row === 18 || row === 19) {
            seed(q.target, "x", o(q.old));
            trace = "BKCGRLS";
            if (row === 18) {
                q.rhsAction = () => { q.oldResult = n(20); };
                expected = [n(23), n(17), n(60), n(6.666666666666667), n(2)][i];
            } else q.rhsAction = () => { seed(q.target, "x", o(replacement)); };
        }
        if (row === 20) q.rhsAction = () => { q.target.internalDelete("x"); };
        if (row === 21 || row === 22) {
            q.rhsAction = () => { seed(q.target, "x", n(12), false); };
            message = "property is not writable: x";
            if (row === 22) {
                bind(q.realm, "rhs", fn(q.realm, (_this, _args, _context, _at) => {
                    q.events.stage("R", q.realm);
                    seed(q.target, "x", n(12), false);
                    return Q;
                }));
                trace = "BKCGR";
            }
        }
        const result = q.run(ops[i]);
        if (row === 22 || row >= 3 && row <= 12 && row !== 6) exact(result, name);
        else if (message !== "") error(result, message, name);
        else {
            expect(result, expected, name);
            check(sameValue(own(q.target, "x"), expected), name + " stored");
        }
        check(q.events.trace === trace, name + " trace");
        check(sameValue(own(replacement, "x"), n(99)) && sameValue(own(q.target, "y"), n(77)), name + " unrelated properties");
        if (row === 20) {
            const desc = q.target.getOwnProperty("x");
            check(desc !== undefined && desc.kind === "data" && desc.writable && desc.enumerable && desc.configurable, name + " recreated descriptor");
        }
        if (row === 21 || row === 22) {
            check(dataDescriptor(q.target.getOwnProperty("x"))?.writable === false, name + " freeze persists");
            check(sameValue(own(q.target, "x"), n(12)), name + " frozen value retained");
        }
        for (const hint of q.hints) check(sameValue(hint, s(i === 0 ? "default" : "number")), name + " hint");
        q.dispatch(name);
    }

    // E23-E28 bindings: Get failures precede RHS; immutable writes follow it.
    for (let row = 23; row <= 28; row++) {
        const name = "E" + row + names[i];
        const q = new Scenario();
        if (row !== 23) bind(q.realm, "x", n(12), row === 24 || row === 28, row !== 24);
        if (row === 26) q.events.abrupt = "R";
        if (row === 27) {
            bind(q.realm, "x", o(q.old), false);
            q.events.abrupt = "L";
        }
        if (row === 28) {
            program(q.e, "function inner() { let x=99; return 3; }");
            bind(q.realm, "rhs", binding(q.realm, "inner"));
        }
        const result = run(q.e, "x " + ops[i] + " rhs();");
        if (row === 23) error(result, "x is not defined", name, 1, "ReferenceError");
        if (row === 24) error(result, "x is not initialized", name, 1, "ReferenceError");
        if (row === 25) error(result, "binding is not mutable: x", name);
        if (row === 26 || row === 27) exact(result, name);
        if (row === 28) expect(result, baseline[i], name);
        if (row === 25 || row === 26) check(sameValue(binding(q.realm, "x"), n(12)), name + " immutable value retained");
        if (row === 27) check(sameValue(binding(q.realm, "x"), o(q.old)), name + " immutable object retained");
        if (row === 28) check(sameValue(binding(q.realm, "x"), baseline[i]), name + " outer binding updated");
        let expectedTrace = "R";
        if (row === 23 || row === 24 || row === 28) expectedTrace = "";
        if (row === 27) expectedTrace = "RL";
        check(q.events.trace === expectedTrace, name + " effects");
        clean(q.e, q.realm, name);
    }
    // E29 SymbolKey and E30 PrimitiveKey (string, number, symbol).
    const keys: Value[] = [y(Y), s("x"), n(12), y(Y)];
    const propertyKeys: PropertyKey[] = [Y, "x", "12", Y];
    for (let variant = 0; variant < keys.length; variant++) {
        const name = (variant === 0 ? "E29 SymbolKey" : "E30 PrimitiveKey") + variant + names[i];
        const q = new Scenario();
        seed(q.target, propertyKeys[variant], n(12));
        seed(q.target, Z, n(99));
        q.keyResult = keys[variant];
        if (variant !== 0) bind(q.realm, "k", keys[variant]);
        const result = run(q.e, "p[k] " + ops[i] + " 3;");
        expect(result, baseline[i], name);
        check(q.events.trace === (variant === 0 ? "CGS" : "GS"), name + " trace");
        check(sameValue(own(q.target, Z), n(99)), name + " distinct symbol");
        q.dispatch(name, propertyKeys[variant]);
    }
    // E31-E34 direct reference reuse retains only successful key conversion.
    for (let row = 31; row <= 34; row++) {
        const name = "E" + row + names[i];
        const q = new Scenario();
        const ref: Reference = { kind: "property", base: q.base, key: o(q.key), loc };
        if (row === 32) q.events.abrupt = "G";
        if (row === 33) q.events.abrupt = "C";
        let old = getValue(ref, q.e.context, loc);
        if (row === 32 || row === 33) {
            exact(old, name);
            check(ref.kind === "property" && (row === 32 ? sameValue(ref.key, s("x")) : ref.key.kind === "object"), name + " cache on failure");
            q.events.abrupt = "";
            old = getValue(ref, q.e.context, loc);
        }
        expect(old, n(12), name);
        q.keyResult = s("y");
        const result = q.e.binary(ops[i].slice(0, 1), old.value, n(3), loc);
        expect(result, baseline[i], name);
        if (row === 34) q.events.setFalse = true;
        let write = putValue(ref, result.value, q.e.context, loc);
        if (row === 34) {
            error(write, "property is not writable: x", name);
            q.events.setFalse = false;
            write = putValue(ref, result.value, q.e.context, loc);
        }
        expect(write, baseline[i], name);
        const traces = ["CGS", "CGGS", "CCGS", "CGSS"];
        check(q.events.trace === traces[row - 31], name + " trace");
        q.dispatch(name);
    }
}

// Primitive factories expose the two independent wrappers and original Receiver.
class Boxes {
    objects: GuestObject[] = [];
    gets: Value[] = [];
    sets: Value[] = [];
    written: Value[] = [];
}
class BooleanBox extends GuestBoolean {
    constructor(value: boolean, proto: GuestObject, public boxes: Boxes) { super(value, proto); }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        this.boxes.gets.push(receiver);
        return super.internalGet(key, receiver, context, at);
    }
    internalSet(key: PropertyKey, value: Value, receiver: Value, context: OperationContext, at: Location): InternalBooleanCompletion {
        this.boxes.sets.push(receiver);
        this.boxes.written.push(value);
        return super.internalSet(key, value, receiver, context, at);
    }
}
class NumberBox extends GuestNumber {
    constructor(value: number, proto: GuestObject, public boxes: Boxes) { super(value, proto); }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        this.boxes.gets.push(receiver);
        return super.internalGet(key, receiver, context, at);
    }
    internalSet(key: PropertyKey, value: Value, receiver: Value, context: OperationContext, at: Location): InternalBooleanCompletion {
        this.boxes.sets.push(receiver);
        this.boxes.written.push(value);
        return super.internalSet(key, value, receiver, context, at);
    }
}
class StringBox extends GuestStringObject {
    constructor(value: string, proto: GuestObject, public boxes: Boxes) { super(value, proto); }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        this.boxes.gets.push(receiver);
        return super.internalGet(key, receiver, context, at);
    }
    internalSet(key: PropertyKey, value: Value, receiver: Value, context: OperationContext, at: Location): InternalBooleanCompletion {
        this.boxes.sets.push(receiver);
        this.boxes.written.push(value);
        return super.internalSet(key, value, receiver, context, at);
    }
}
class SymbolBox extends GuestSymbolObject {
    constructor(value: GuestSymbol, proto: GuestObject, public boxes: Boxes) { super(value, proto); }
    internalGet(key: PropertyKey, receiver: Value, context: OperationContext, at: Location): ValueCompletion {
        this.boxes.gets.push(receiver);
        return super.internalGet(key, receiver, context, at);
    }
    internalSet(key: PropertyKey, value: Value, receiver: Value, context: OperationContext, at: Location): InternalBooleanCompletion {
        this.boxes.sets.push(receiver);
        this.boxes.written.push(value);
        return super.internalSet(key, value, receiver, context, at);
    }
}
class BoxRealm extends Realm {
    boxes = new Boxes();
    constructor() { super((_line) => {}); }
    createBooleanObject(value: boolean): GuestBoolean {
        const box = new BooleanBox(value, this.booleanPrototype, this.boxes);
        this.boxes.objects.push(box);
        return box;
    }
    createNumberObject(value: number): GuestNumber {
        const box = new NumberBox(value, this.numberPrototype, this.boxes);
        this.boxes.objects.push(box);
        return box;
    }
    createStringObject(value: string): GuestStringObject {
        const box = new StringBox(value, this.stringPrototype, this.boxes);
        this.boxes.objects.push(box);
        return box;
    }
    createSymbolObject(value: GuestSymbol): GuestSymbolObject {
        const box = new SymbolBox(value, this.symbolPrototype, this.boxes);
        this.boxes.objects.push(box);
        return box;
    }
}
function proto(realm: Realm, value: Value): GuestObject {
    switch (value.kind) {
        case "boolean": return realm.booleanPrototype;
        case "number": return realm.numberPrototype;
        case "string": return realm.stringPrototype;
        case "symbol": return realm.symbolPrototype;
        default: throw new Error("expected primitive");
    }
}
function boxes(realm: BoxRealm, base: Value, count: number, name: string): void {
    check(realm.boxes.objects.length === count, name + " box count");
    if (count === 2) check(realm.boxes.objects[0] !== realm.boxes.objects[1], name + " distinct boxes");
    for (const receiver of realm.boxes.gets) check(receiver === base, name + " Get Receiver");
    for (const receiver of realm.boxes.sets) check(receiver === base, name + " Set Receiver");
    for (const object of realm.boxes.objects) {
        check(object.getPrototypeOf() === proto(realm, base), name + " prototype");
        check(object.getOwnProperty("x") === undefined, name + " no box write");
    }
}
// W1-W7 ordinary descriptors and extensibility.
for (let i = 0; i < ops.length; i++) {
    for (let row = 1; row <= 7; row++) {
        const name = "W" + row + names[i];
        const realm = new Realm((_line) => {});
        const e = new Measured(realm);
        const parent = realm.createObject();
        const target = new GuestObject(parent);
        if (row === 2 || row === 4) seed(parent, "x", n(12), row === 2);
        else if (row <= 5) seed(target, "x", n(12), row !== 3);
        if (row === 5 || row === 6) target.preventExtensions();
        bind(realm, "p", o(target));
        let calls = 0;
        bind(realm, "rhs", fn(realm, (_this, _args, _context, _at) => {
            calls++;
            return normal(n(3));
        }));
        const result = run(e, "p.x " + ops[i] + " rhs();");
        if (row === 3 || row === 4 || row === 6) error(result, "property is not writable: x", name);
        else {
            const expected = row === 7 ? n(NaN) : baseline[i];
            expect(result, expected, name);
            check(sameValue(own(target, "x"), expected), name + " stored");
        }
        check(calls === 1, name + " RHS");
        if (row === 3) check(sameValue(own(target, "x"), n(12)), name + " readonly value retained");
        if (row === 2 || row === 4) check(sameValue(own(parent, "x"), n(12)), name + " inherited unchanged");
        if (row === 4 || row === 6) check(target.getOwnProperty("x") === undefined, name + " absent own");
    }
    // W8-W10 all eight primitive bases; W11/W12 String exotics.
    const primitiveBases: Value[] = [b(true), b(false), n(12), n(-0), n(NaN), n(Infinity), s("ab"), y(Y)];
    for (let row = 8; row <= 12; row++) {
        const bases = row <= 10 ? primitiveBases : [s("ab")];
        for (const base of bases) {
            const name = "W" + row + names[i] + base.kind;
            const realm = new BoxRealm();
            const e = new Measured(realm);
            if (row !== 9) seed(proto(realm, base), "x", n(12), row !== 10);
            let key = "x";
            if (row === 11) key = "0";
            if (row === 12) key = "length";
            bind(realm, "p", base);
            bind(realm, "k", s(key));
            const result = run(e, "p[k] " + ops[i] + " 3;");
            error(result, "property is not writable: " + key, name);
            boxes(realm, base, 2, name);
            if (row === 8 || row === 10) check(sameValue(own(proto(realm, base), "x"), n(12)), name + " prototype value retained");
            let expected = baseline[i];
            if (row === 9) expected = n(NaN);
            if (row === 11) expected = [s("a3"), n(NaN), n(NaN), n(NaN), n(NaN)][i];
            if (row === 12) expected = [n(5), n(-1), n(6), n(0.6666666666666666), n(2)][i];
            check(realm.boxes.written.length === 1 && sameValue(realm.boxes.written[0], expected), name + " computed before rejection");
        }
    }
    // W14 Nullish: raw key expression, but no conversion or RHS.
    for (const base of [nil, U]) {
        const q = new Scenario();
        q.base = base;
        const result = q.run(ops[i]);
        error(result, nullish, "W14 Nullish" + names[i]);
        check(q.events.trace === "BK", "W14 no later effects");
    }
    // W15 PrimitiveSymbolOld: conversion failure wins over strict write.
    {
        const realm = new BoxRealm();
        const e = new Measured(realm);
        const base = b(true);
        const right = realm.createObject();
        let calls = 0;
        seed(realm.booleanPrototype, "x", y(Y));
        seed(right, wellKnownToPrimitive, fn(realm, (_this, _args, _context, _at) => {
            calls++;
            return normal(n(3));
        }));
        bind(realm, "p", base);
        bind(realm, "rhs", o(right));
        const result = run(e, "p.x " + ops[i] + " rhs;");
        error(result, "cannot convert symbol to number", "W15" + names[i]);
        check(calls === (i === 0 ? 1 : 0) && realm.boxes.sets.length === 0, "W15 ordering");
        boxes(realm, base, 1, "W15");
    }
    // W16-W19/W23/W24 Array dispatch; values supplied to length are primitive.
    for (const row of [16, 17, 18, 19, 23, 24]) {
        const name = "W" + row + names[i];
        const realm = new Realm((_line) => {});
        const e = new Measured(realm);
        const array = realm.createArray();
        let key = "length";
        if (row === 16) {
            seed(array, "0", n(12));
            key = "0";
        } else if (row === 17 || row === 18) key = "2";
        else array.bootstrapDefine("length", { value: n(12) });
        if (row === 18 || row === 23) array.bootstrapDefine("length", { writable: false });
        const right = realm.createObject();
        let hooks = 0;
        seed(right, wellKnownToPrimitive, fn(realm, (_this, _args, _context, _at) => {
            hooks++;
            return normal(n(3));
        }));
        let rhsCalls = 0;
        bind(realm, "rhs", fn(realm, (_this, _args, _context, _at) => {
            rhsCalls++;
            return normal(row === 24 ? o(right) : n(3));
        }));
        bind(realm, "p", o(array));
        bind(realm, "k", s(key));
        const result = run(e, "p[k] " + ops[i] + " rhs();");
        if (row === 18 || row === 23) error(result, "property is not writable: " + key, name);
        else expect(result, row === 17 ? n(NaN) : baseline[i], name);
        check(rhsCalls === 1 && hooks === (row === 24 ? 1 : 0), name + " calls");
        if (row === 16) {
            check(sameValue(own(array, "length"), n(1)), name + " length");
            check(sameValue(own(array, "0"), baseline[i]), name + " stored index0");
        }
        if (row === 17) check(sameValue(own(array, "2"), n(NaN)), name + " stored index2");
        if (row === 17) check(sameValue(own(array, "length"), n(3)) && array.getOwnProperty("0") === undefined && array.getOwnProperty("1") === undefined, name + " growth holes");
        if (row === 18) check(sameValue(own(array, "length"), n(0)) && array.getOwnProperty("2") === undefined, name + " rejected growth");
        if (row === 19 || row === 24) check(sameValue(own(array, "length"), baseline[i]), name + " length result");
        if (row === 23) check(sameValue(own(array, "length"), n(12)), name + " unchanged");
    }
    // W25 BoxObjectControl: real wrapper objects, no temporary wrappers.
    {
        const realm = new BoxRealm();
        const values: Value[] = [o(realm.createBooleanObject(true)), o(realm.createNumberObject(12)), o(realm.createStringObject("ab")), o(realm.createSymbolObject(Y))];
        for (const base of values) {
            if (base.kind !== "object") throw new Error("wrapper");
            seed(base.object, "x", n(12));
            bind(realm, "p", base);
            const result = run(new Measured(realm), "p.x " + ops[i] + " 3;");
            expect(result, baseline[i], "W25" + names[i]);
            check(sameValue(own(base.object, "x"), baseline[i]), "W25 stored");
        }
        check(realm.boxes.objects.length === 4 && realm.boxes.gets.length === 4 && realm.boxes.sets.length === 4, "W25 no temporary boxes");
        for (let j = 0; j < values.length; j++) check(realm.boxes.gets[j] === values[j] && realm.boxes.sets[j] === values[j], "W25 Receiver");
    }
}
// W13 StringUTF16, W20 ArrayLengthString, W21 invalid lengths, W22 partial shrink.
for (const index of [0, 1]) {
    const realm = new BoxRealm();
    const base = s("\ud83d\ude00");
    bind(realm, "p", base);
    const result = run(new Measured(realm), "p[" + index + "] += '!';");
    error(result, "property is not writable: " + index, "W13 StringUTF16");
    boxes(realm, base, 2, "W13");
    check(sameValue(realm.boxes.written[0], s("\ud83d\ude00".slice(index, index + 1) + "!")), "W13 code unit");
}
{
    const realm = new Realm((_line) => {});
    const array = realm.createArray();
    array.bootstrapDefine("length", { value: n(1) });
    bind(realm, "p", o(array));
    const result = run(new Measured(realm), "p.length += '2';");
    expect(result, s("12"), "W20 ArrayLengthString");
    check(sameValue(own(array, "length"), n(12)), "W20 numeric storage");
}
for (const source of ["p.length -= 2;", "p.length /= 2;", "p.length *= -1;", "p.length %= 0;"]) {
    const realm = new Realm((_line) => {});
    const array = realm.createArray();
    array.bootstrapDefine("length", { value: n(1) });
    bind(realm, "p", o(array));
    const result = run(new Measured(realm), source);
    error(result, "invalid array length", "W21 " + source, 1, "RangeError");
    check(sameValue(own(array, "length"), n(1)), "W21 unchanged");
}
{
    const realm = new Realm((_line) => {});
    const array = realm.createArray();
    seed(array, "2", n(12), true, false);
    seed(array, "3", n(12));
    bind(realm, "p", o(array));
    const result = run(new Measured(realm), "p.length -= 3;");
    error(result, "property is not writable: length", "W22 ArrayPartialShrink");
    check(array.getOwnProperty("3") === undefined && array.getOwnProperty("2") !== undefined, "W22 partial deletion");
    check(sameValue(own(array, "length"), n(3)) && dataDescriptor(array.getOwnProperty("length"))?.writable === true, "W22 length repaired");
}
function parseError(source: string, message: string, column: number, name: string): void {
    for (const prefix of ["", "effect(); "]) {
        const result = parse(prefix + source);
        check(result.error !== null && result.error.phase === "parse" && result.error.name === "SyntaxError" &&
            result.error.message === message && result.error.loc.line === 1 && result.error.loc.column === column + prefix.length, name);
    }
}
for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const name = names[i];
    // P1 Tokens, P2 Adjacent, P3 Comments; token offsets are UTF-16.
    const tokenSources = ["x " + op + " 3;", "x" + op + "3;", "x/*a*/" + op + "/*b*/3;"];
    const starts = [2, 1, 6];
    for (let j = 0; j < tokenSources.length; j++) {
        const tokens = lex(tokenSources[j]);
        const token = tokens.tokens[1];
        check(tokens.error === null && token.kind === "punct" && token.text === op && token.start === starts[j] && token.end === starts[j] + 2 && token.loc.column === starts[j] + 1, "P" + (j + 1) + name);
        check(expression(tokenSources[j]).kind === "compound", "P parsed compound");
    }
    parseError("x " + op[0] + " = 3;", "unsupported or unexpected syntax: =", 5, "P4 SpacedToken" + name);
    parseError("x " + op + ";", "unsupported or unexpected syntax: ;", 5, "P5 MissingRHS" + name);
    for (const target of ["1", "x + y", "f()"]) parseError(target + " " + op + " 3;", "invalid assignment target", 1, "P6/P7/P8 " + target + name);
    parseError("x " + op + "= 3;", "unsupported or unexpected syntax: =", 5, "P22 ExtraEquals" + name);
    for (const target of ["(x)", "(p.x)"]) {
        const realm = new Realm((_line) => {});
        const targetObject = realm.createObject();
        seed(targetObject, "x", n(12));
        bind(realm, "x", n(12));
        bind(realm, "p", o(targetObject));
        expect(run(new Measured(realm), target + " " + op + " 3;"), baseline[i], "P9 ParenthesizedTarget" + name);
    }
    const expressions = ["x " + op + " y " + op + " 3;", "x " + op + " y = 3;", "x = y " + op + " 3;", "x " + op + " true ? 3 : missing;", "false ? missing : x " + op + " 3;", "x " + op + " 2 * 3;", "[x " + op + " 3];"];
    for (let variant = 0; variant < expressions.length; variant++) {
        const realm = new Realm((_line) => {});
        bind(realm, "x", n(12));
        bind(realm, "y", n(6));
        if (variant === 1) bind(realm, "y", n(0));
        if (variant === 2) bind(realm, "y", n(12));
        const result = run(new Measured(realm), expressions[variant]);
        let expected = baseline[i];
        if (variant === 0) expected = [n(21), n(9), n(216), n(6), n(NaN)][i];
        if (variant === 5) expected = [n(18), n(6), n(72), n(2), n(0)][i];
        const rowName = "P" + (variant + 10) + name;
        if (variant === 6) {
            check(result.type === "normal" && result.value.kind === "object" && sameValue(own(result.value.object, "0"), expected) && sameValue(own(result.value.object, "length"), n(1)), rowName);
        } else expect(result, expected, rowName);
        check(sameValue(binding(realm, "x"), expected), rowName + " x");
        if (variant === 0) check(sameValue(binding(realm, "y"), [n(9), n(3), n(18), n(2), n(0)][i]), rowName + " y");
        if (variant === 1) check(sameValue(binding(realm, "y"), n(3)), rowName + " y");
        if (variant === 2) check(sameValue(binding(realm, "y"), expected), rowName + " y");
    }
    for (const newline of ["\n", "\r\n", "\u2028", "\u2029"]) {
        const source = "x" + newline + op + " 3;";
        const token = lex(source).tokens[1];
        check(token.loc.line === 2 && token.loc.column === 1 && token.start === 1 + newline.length, "P23 LineTerminators" + name);
        check(expression(source).kind === "compound", "P23 parsed");
    }
    parseError(Array(130).fill("x").join(" " + op + " ") + ";", "syntax nesting limit exceeded", 636, "P25 Nesting" + name);
}
const rejected: { name: string; source: string; message: string; column: number }[] = [
    { name: "P17 StillUnsupported", source: "x **= 3;", message: "unsupported operator: **", column: 3 },
    { name: "P17 StillUnsupported", source: "x <<= 3;", message: "unsupported operator: <<", column: 3 },
    { name: "P17 StillUnsupported", source: "x >>= 3;", message: "unsupported operator: >>", column: 3 },
    { name: "P17 StillUnsupported", source: "x >>>= 3;", message: "unsupported operator: >>", column: 3 },
    { name: "P18 LogicalExcluded", source: "x &&= 3;", message: "unsupported or unexpected syntax: =", column: 5 },
    { name: "P18 LogicalExcluded", source: "x ||= 3;", message: "unsupported or unexpected syntax: =", column: 5 },
    { name: "P18 LogicalExcluded", source: "x ??= 3;", message: "unsupported or unexpected syntax: ?", column: 4 },
    { name: "P19 BitwiseExcluded", source: "x &= 3;", message: "unsupported character: &", column: 3 },
    { name: "P19 BitwiseExcluded", source: "x ^= 3;", message: "unsupported character: ^", column: 3 },
    { name: "P19 BitwiseExcluded", source: "x |= 3;", message: "unsupported character: |", column: 3 },
    { name: "P20 UpdatesExcluded", source: "x++;", message: "unsupported operator: ++", column: 2 },
    { name: "P20 UpdatesExcluded", source: "--x;", message: "unsupported operator: --", column: 1 },
];
for (const row of rejected) parseError(row.source, row.message, row.column, row.name);
for (const op of ["===", "!=="]) {
    const token = lex("x " + op + " 3;").tokens[1];
    check(token.text === op && token.start === 2 && token.end === 5, "P21 LongEquality");
}
{
    const realm = new Realm((_line) => {});
    const e = new Measured(realm);
    const source = "function f() { /*keep*/ x += 3; }";
    program(e, source);
    expect(run(e, "f.toString();"), s(source), "P24 SourceRetention");
}
// L1-L10: operation location versus reference and child locations.
for (let i = 0; i < ops.length; i++) {
    for (const state of ["missing", "TDZ", "immutable"]) {
        const realm = new Realm((_line) => {});
        if (state !== "missing") bind(realm, "x", n(12), false, state !== "TDZ");
        const result = run(new Measured(realm), "  x " + ops[i] + " 3;");
        if (state === "missing") error(result, "x is not defined", "L1 Binding", 3, "ReferenceError");
        if (state === "TDZ") error(result, "x is not initialized", "L1 Binding", 3, "ReferenceError");
        if (state === "immutable") error(result, "binding is not mutable: x", "L1 Binding", 3);
    }
    for (const mode of ["null", "key", "get", "old", "right", "readonly", "rhs", "keyChild", "baseChild"]) {
        const q = new Scenario();
        bind(q.realm, "rhs", n(3));
        let source = "  (p[k]) " + ops[i] + " rhs;";
        if (mode === "null") bind(q.realm, "p", nil);
        if (mode === "key") seed(q.key, wellKnownToPrimitive, n(7));
        if (mode === "get") q.events.abrupt = "G";
        if (mode === "old") seed(q.target, "x", y(Y));
        if (mode === "right") bind(q.realm, "rhs", y(Y));
        if (mode === "readonly") seed(q.target, "x", n(12), false);
        if (mode === "rhs") source = "  p[k] " + ops[i] + " missing;";
        if (mode === "keyChild") source = "  p[missing] " + ops[i] + " 3;";
        if (mode === "baseChild") source = "  missing[k] " + ops[i] + " 3;";
        const result = run(q.e, source);
        if (mode === "null") error(result, nullish, "L2 Parenthesis", 4);
        if (mode === "key") error(result, "symbol toPrimitive method is not callable", "L2 Parenthesis", 4);
        if (mode === "get") {
            exact(result, "L3 Dispatch");
            check(q.events.locations[0].column === 3, "L3 dispatch location");
        }
        if (mode === "old" || mode === "right") error(result, "cannot convert symbol to number", "L4 Coercion", 3);
        if (mode === "readonly") error(result, "property is not writable: x", "L5 PutFalse", 3);
        if (mode === "rhs") error(result, "missing is not defined", "L6 RHSChild", 11, "ReferenceError");
        if (mode === "keyChild") error(result, "missing is not defined", "L7 KeyChild", 5, "ReferenceError");
        if (mode === "baseChild") error(result, "missing is not defined", "L8 BaseChild", 3, "ReferenceError");
    }
    for (const stage of ["G", "R", "L", "H", "S"]) {
        const q = new Scenario();
        q.operands();
        q.events.abrupt = stage;
        exact(q.run(ops[i]), "L9 Sentinel" + stage + names[i]);
    }
    const realm = new Realm((_line) => {});
    const array = realm.createArray();
    array.bootstrapDefine("length", { value: n(1) });
    bind(realm, "p", o(array));
    bind(realm, "k", s("length"));
    bind(realm, "rhs", n(NaN));
    error(run(new Measured(realm), "  (p[k]) " + ops[i] + " rhs;"), "invalid array length", "L10 Array" + names[i], 3, "RangeError");
}
// Literal progress/state oracles for R1-R28. Get/Set include primitive boxes.
// RHS attempt is entry to evaluate; success requires a normal completion.
const resourceEffects = [
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "result" }, // R1
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R2
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R3
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R4
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R5
    { get: 1, set: 0, attempt: 1, success: 0, body: 0, stored: "12" }, // R6
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "result" }, // R7
    { get: 0, set: 0, attempt: 1, success: 1, body: 0, stored: "12" }, // R8
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R9
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "result" }, // R10
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "result" }, // R11
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "result" }, // R12
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R13
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R14
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "result" }, // R15
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "result" }, // R16
    { get: 1, set: 0, attempt: 1, success: 1, body: 0, stored: "old" }, // R17
    { get: 1, set: 0, attempt: 1, success: 1, body: 0, stored: "old" }, // R18
    { get: 1, set: 1, attempt: 1, success: 1, body: 1, stored: "result" }, // R19
    { get: 1, set: 0, attempt: 1, success: 0, body: 0, stored: "12" }, // R20
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R21
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R22
    { get: 0, set: 0, attempt: 0, success: 0, body: 0, stored: "12" }, // R23
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "12" }, // R24
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "12" }, // R25
    { get: 1, set: 0, attempt: 1, success: 0, body: 0, stored: "12" }, // R26
    { get: 1, set: 1, attempt: 1, success: 1, body: 0, stored: "result" }, // R27
    { get: 1, set: 1, attempt: 0, success: 0, body: 0, stored: "result" }, // R28
];
// R1-R28 exact guard budgets. Each row starts from an independently prepared Realm.
for (let i = 0; i < ops.length; i++) {
    for (let row = 1; row <= 28; row++) {
        const name = "R" + row + names[i];
        const realm = new BoxRealm();
        const e = new Measured(realm);
        const events = new Events();
        const target = new Target(events, e);
        const base = b(true);
        const key = realm.createObject();
        const old = realm.createObject();
        const right = realm.createObject();
        let keyCalls = 0;
        let operandCalls = 0;
        let rhsCalls = 0;
        seed(target, "x", n(12));
        seed(realm.booleanPrototype, "x", n(12));
        seed(key, wellKnownToPrimitive, fn(realm, (_this, _args, _context, _at) => {
            keyCalls++;
            return normal(s("x"));
        }));
        seed(old, wellKnownToPrimitive, fn(realm, (_this, _args, _context, _at) => {
            operandCalls++;
            return normal(n(12));
        }));
        seed(right, wellKnownToPrimitive, fn(realm, (_this, _args, _context, _at) => {
            operandCalls++;
            return normal(n(3));
        }));
        bind(realm, "p", o(target));
        bind(realm, "k", s("x"));
        bind(realm, "x", n(12));
        bind(realm, "r", o(right));
        bind(realm, "rhs", fn(realm, (_this, _args, _context, _at) => {
            rhsCalls++;
            return normal(n(3));
        }));
        let source = "p[k] " + ops[i] + " 3;";
        // All step/call expectations are literal matrix entries.
        let steps = 5;
        let expectedPeak = 3;
        let message = "";
        let column = 1;
        let expectedKeyCalls = 0;
        let expectedOperandCalls = 0;
        let expectedBoxes = 0;
        let expectedDepth = 0;
        if (row >= 2 && row <= 6) {
            e.maxSteps = row - 2;
            steps = row - 1;
            message = stepError;
            if (row === 5) column = 3;
            if (row === 6) column = 9;
            expectedPeak = Math.min(row - 1, 3);
        }
        if (row === 7) e.maxSteps = 5;
        if (row === 8) {
            source = "x " + ops[i] + " 3;";
            steps = 3;
        }
        if (row === 9) {
            bind(realm, "p", nil);
            bind(realm, "k", o(key));
            e.maxSteps = 4;
            steps = 4;
            message = nullish;
        }
        if (row >= 10 && row <= 14 || row === 25) {
            bind(realm, "k", o(key));
            steps = 6;
            expectedKeyCalls = 1;
        }
        if (row === 11 || row === 12) {
            seed(key, wellKnownToPrimitive, U);
            seed(key, "toString", fn(realm, (_this, _args, _context, _at) => {
                keyCalls++;
                return normal(row === 12 ? o(key) : s("x"));
            }));
            seed(key, "valueOf", fn(realm, (_this, _args, _context, _at) => {
                keyCalls++;
                return normal(s("x"));
            }));
            steps = 7;
            if (row === 12) {
                steps = 8;
                expectedKeyCalls = 2;
            }
        }
        if (row === 13 || row === 14) {
            if (row === 13) e.maxSteps = 4;
            else e.maxCalls = 0;
            steps = 5;
            expectedKeyCalls = 0;
            message = row === 13 ? stepError : callError;
        }
        if (row >= 15 && row <= 18) {
            seed(target, "x", o(old));
            steps = 6;
            expectedOperandCalls = 1;
            if (row === 16) {
                source = "p[k] " + ops[i] + " r;";
                steps = 7;
                expectedOperandCalls = 2;
            }
            if (row === 17 || row === 18) {
                if (row === 17) e.maxSteps = 5;
                else e.maxCalls = 0;
                expectedOperandCalls = 0;
                message = row === 17 ? stepError : callError;
            }
        }
        if (row === 19 || row === 20) {
            source = "p[k] " + ops[i] + " rhs();";
            if (row === 20) {
                e.maxCalls = 0;
                message = callError;
                column = 9;
            }
        }
        if (row >= 21 && row <= 23) {
            e.depth = row === 21 ? 256 : 255;
            expectedDepth = e.depth;
            steps = row === 21 ? 1 : 2;
            message = depthError;
            expectedPeak = 257;
            if (row === 23) {
                e.maxSteps = 1;
                message = stepError;
            }
        }
        if (row >= 24 && row <= 26) {
            bind(realm, "p", base);
            expectedBoxes = 2;
            message = "property is not writable: x";
            if (row === 26) {
                e.maxSteps = 4;
                expectedBoxes = 1;
                message = stepError;
                column = 9;
            }
        }
        if (row === 27) e.maxSteps = 9;
        const action = statement(source);
        if (action.kind !== "expression" || action.expression.kind !== "compound") throw new Error("resource compound");
        e.watchedRHS = action.expression.value;
        let result: Completion;
        if (row === 28) {
            const ref: Reference = { kind: "property", base: o(target), key: s("x"), loc };
            const read = getValue(ref, e.context, loc);
            expect(read, n(12), name);
            const computed = e.binary(ops[i].slice(0, 1), read.value, n(3), loc);
            result = putValue(ref, computed.value, e.context, loc);
            steps = 0;
            expectedPeak = 0;
        } else if (row >= 21 && row <= 23) result = e.evaluate(action.expression, realm.global, U);
        else result = e.statement(action, realm.global, U);
        if (message === "") expect(result, baseline[i], name);
        else {
            let kind = "RangeError";
            if (row === 9 || row === 24 || row === 25) kind = "TypeError";
            error(result, message, name, column, kind);
        }
        const progress = resourceEffects[row - 1];
        check(events.getKeys.length + realm.boxes.gets.length === progress.get, name + " Get progress");
        check(events.setKeys.length + realm.boxes.sets.length === progress.set, name + " Set progress");
        check(e.rhsAttempts === progress.attempt && e.rhsSuccesses === progress.success, name + " RHS attempted/completed");
        check(rhsCalls === progress.body, name + " RHS body progress");
        let stored = n(12);
        if (progress.stored === "result") stored = baseline[i];
        if (progress.stored === "old") stored = o(old);
        check(sameValue(own(target, "x"), stored), name + " target value");
        check(sameValue(binding(realm, "x"), row === 8 ? baseline[i] : n(12)), name + " binding value");
        check(sameValue(own(realm.booleanPrototype, "x"), n(12)), name + " prototype retained");
        for (const box of realm.boxes.objects) check(box.getOwnProperty("x") === undefined, name + " no box write");
        check(e.steps === steps, name + " steps " + e.steps);
        // Statement guard does not call evaluate at all.
        if (row === 2) expectedPeak = 0;
        check(e.peak === expectedPeak, name + " peak " + e.peak);
        check(keyCalls === expectedKeyCalls && operandCalls === expectedOperandCalls, name + " hooks");
        check(realm.boxes.objects.length === expectedBoxes, name + " boxes");
        if (row === 19) check(rhsCalls === 1, name + " RHS once");
        if (row === 20) check(rhsCalls === 0 && events.trace === "G", name + " Get before rejected call");
        clean(e, realm, name, 0, expectedDepth);
        if (row === 27) {
            error(e.statement(action, realm.global, U), stepError, name, 9, "RangeError");
            check(events.getKeys.length === 2 && events.setKeys.length === 1, name + " retry Get/Set");
            check(e.rhsAttempts === 2 && e.rhsSuccesses === 1, name + " retry RHS guard");
            check(e.steps === 10 && sameValue(own(target, "x"), baseline[i]), name + " monotonic");
        }
        if (row === 28) {
            const ref: Reference = { kind: "property", base: o(target), key: o(key), loc };
            const read = getValue(ref, e.context, loc);
            const computed = e.binary(ops[i].slice(0, 1), read.value, n(3), loc);
            check(computed.type === "normal", name + " direct binary");
            expect(putValue(ref, computed.value, e.context, loc), computed.value, name);
            check(e.steps === 1 && keyCalls === 1, name + " canonical direct reference");
        }
    }
}

type RecursionRow = { name: string; guest: boolean; operand: string; limit: number; steps: number; hooks: number; peak: number; column: number; primitive: boolean; foreign: boolean; maxSteps: number };
const recursionRows: RecursionRow[] = [];
function recursionGroup(name: string, guest: boolean, operand: string, primitive: boolean, foreign: boolean): void {
    const hostKeySteps = [5, 9, 13, 261];
    const guestKeySteps = [5, 10, 15, 325];
    const hostOperandSteps = [6, 11, 16, 326];
    const guestOperandSteps = [6, 12, 18, 390];
    const hostPeaks = [3, 4, 5, 67];
    const guestPeaks = [3, 5, 7, 131];
    const limits = [0, 1, 2, -1];
    const hooks = [0, 1, 2, 64];
    for (let j = 0; j < limits.length; j++) {
        let steps = hostKeySteps[j];
        if (guest) steps = guestKeySteps[j];
        if (operand !== "key") {
            steps = hostOperandSteps[j];
            if (guest) steps = guestOperandSteps[j];
        }
        let peak = hostPeaks[j];
        if (guest) peak = guestPeaks[j];
        let column = 1;
        if (guest && j > 0) column = 23;
        recursionRows.push({ name, guest, operand, limit: limits[j], steps, hooks: hooks[j], peak, column, primitive, foreign, maxSteps: 100000 });
    }
}
recursionGroup("R29 KeyHostSmall / R30 KeyHostDefault", false, "key", false, false);
recursionGroup("R31 KeyGuestSmall / R32 KeyGuestDefault", true, "key", false, false);
recursionGroup("R34 CoercionHostSmall / R35 CoercionHostDefault", false, "old", false, false);
recursionGroup("R36 CoercionGuestSmall / R37 CoercionGuestDefault", true, "old", false, false);
recursionGroup("R38 RightRecursionHost", false, "right", false, false);
recursionGroup("R38 RightRecursionGuest", true, "right", false, false);
recursionGroup("R39 PrimitiveRecursiveHost", false, "key", true, false);
recursionGroup("R39 PrimitiveRecursiveGuest", true, "key", true, false);
recursionGroup("C9 RecursiveRealmKeyHost", false, "key", false, true);
recursionGroup("C9 RecursiveRealmKeyGuest", true, "key", false, true);
recursionGroup("C9 RecursiveRealmOldHost", false, "old", false, true);
recursionGroup("C9 RecursiveRealmOldGuest", true, "old", false, true);
recursionGroup("C9 RecursiveRealmRightHost", false, "right", false, true);
recursionGroup("C9 RecursiveRealmRightGuest", true, "right", false, true);
recursionGroup("C10 RecursiveBoxesHost", false, "key", true, true);
recursionGroup("C10 RecursiveBoxesGuest", true, "key", true, true);
recursionRows.push({ name: "R33 KeyStepBeforeCall / R40 ExhaustedRetry", guest: true, operand: "key", limit: 2, steps: 15, hooks: 2, peak: 7, column: 23, primitive: false, foreign: false, maxSteps: 14 });
for (let i = 0; i < ops.length; i++) {
    for (const row of recursionRows) {
        const name = row.name + names[i] + " limit " + row.limit;
        const realm = new BoxRealm();
        const foreign = new BoxRealm();
        // The default row MUST omit maxCalls, so native executes the constructor default.
        let e = new Measured(realm);
        if (row.limit >= 0) e = new Measured(realm, row.maxSteps, row.limit);
        const events = new Events();
        const target = new Target(events, e);
        const hookObject = realm.createObject();
        const primitive = b(true);
        const base = row.primitive ? primitive : o(target);
        seed(target, "x", n(12));
        seed(realm.booleanPrototype, "x", n(12));
        seed(foreign.booleanPrototype, "x", n(12));
        let key: Value = s("x");
        if (row.operand === "key") key = o(hookObject);
        if (row.operand === "old") seed(target, "x", o(hookObject));
        let source = "p[k] " + ops[i] + " 3;";
        if (row.operand === "right") source = "p[k] " + ops[i] + " r;";
        const stmt = statement(source);
        const definingRealm = row.foreign ? foreign : realm;
        for (const scope of [realm, foreign]) {
            bind(scope, "p", base);
            bind(scope, "k", key);
            bind(scope, "r", o(hookObject));
        }
        let hookCalls = 0;
        let hook: Value;
        if (row.guest) {
            const declaration = statement("function h() { return " + source + " }");
            if (declaration.kind !== "function") throw new Error("guest recursion declaration");
            hook = o(definingRealm.createGuestFunction(declaration.params, declaration.body, definingRealm.global, declaration.source));
        } else hook = fn(definingRealm, (_this, _args, _context, _at): Completion => {
            hookCalls++;
            check(e.context.realm === definingRealm, name + " defining Realm");
            if (stmt.kind !== "expression") throw new Error("compound statement");
            return e.evaluate(stmt.expression, e.context.realm.global, U);
        });
        seed(hookObject, wellKnownToPrimitive, hook);
        const result = e.statement(stmt, realm.global, U);
        error(result, row.maxSteps === 14 ? stepError : callError, name, row.column, "RangeError");
        check(e.steps === row.steps && e.peak === row.peak, name + " exact resources " + e.steps + "/" + e.peak);
        check(e.invocations === row.hooks, name + " admitted calls");
        if (!row.guest) check(hookCalls === row.hooks, name + " hook bodies");
        const expectedGets = row.operand === "key" ? 0 : row.hooks + 1;
        check(events.getKeys.length === expectedGets && events.setKeys.length === 0, name + " Get/Set count");
        check(e.rhsEvaluations === expectedGets, name + " RHS evaluations");
        check(e.compoundRealms.length === row.hooks + 1 && e.compoundRealms[0] === realm, name + " outer Realm");
        for (let nested = 1; nested < e.compoundRealms.length; nested++) check(e.compoundRealms[nested] === definingRealm, name + " nested Realm");
        for (const receiver of events.receivers) check(receiver === base, name + " original Receiver");
        clean(e, realm, name);
        if (row.primitive) {
            let aBoxes = row.hooks + 1;
            let bBoxes = 0;
            if (row.foreign) {
                aBoxes = 1;
                bBoxes = row.hooks;
            }
            check(realm.boxes.objects.length === aBoxes && foreign.boxes.objects.length === bBoxes, name + " box Realms");
            check(realm.boxes.sets.length === 0 && foreign.boxes.sets.length === 0, name + " no Put boxes");
        }
        if (row.maxSteps === 14) {
            bind(realm, "x", n(12));
            bind(realm, "k", s("x"));
            error(run(e, "p[k] " + ops[i] + " 3;"), stepError, name, 1, "RangeError");
            check(e.steps === 16, name + " exhausted retry");
            expect(run(new Measured(realm), "x " + ops[i] + " 3;"), baseline[i], name + " fresh evaluator");
        }
    }
}

// C1-C5 foreign definitions, property identity, and caller-Realm boxing.
for (let i = 0; i < ops.length; i++) {
    for (const row of [1, 2, 3, 5]) {
        const name = "C" + row + names[i];
        const q = new Scenario();
        if (row === 1) q.hooks(q.foreign, q.realm, q.realm, q.realm);
        if (row === 2) {
            q.operands();
            q.hooks(q.realm, q.foreign, q.third, q.realm);
        }
        if (row === 3) {
            q.operands();
            q.hooks(q.realm, q.realm, q.realm, q.foreign);
        }
        if (row === 5) q.target.setPrototypeOf(q.foreign.objectPrototype);
        const result = q.run(ops[i]);
        expect(result, baseline[i], name);
        q.dispatch(name);
        if (row === 3) check(q.events.trace === "BKCGRLHS", name + " RHS and subsequent operand stages");
        for (let event = 0; event < q.events.trace.length; event++) {
            const stage = q.events.trace[event];
            let expectedRealm = q.realm;
            if (row === 1 && stage === "C" || row === 2 && stage === "L" || row === 3 && stage === "R") expectedRealm = q.foreign;
            if (row === 2 && stage === "H") expectedRealm = q.third;
            check(q.events.realms[event] === expectedRealm, name + " active Realm " + stage);
        }
        if (row === 5) check(q.target.getPrototypeOf() === q.foreign.objectPrototype, name + " foreign prototype");
    }
    {
        const realm = new BoxRealm();
        const foreign = new BoxRealm();
        const e = new Measured(realm);
        const key = realm.createObject();
        const old = realm.createObject();
        const right = realm.createObject();
        const base = b(true);
        let trace = "";
        seed(key, wellKnownToPrimitive, fn(foreign, (_this, _args, _context, _at) => {
            check(e.context.realm === foreign, "C4 key Realm");
            trace += "C";
            return normal(s("x"));
        }));
        seed(old, wellKnownToPrimitive, fn(foreign, (_this, _args, _context, _at) => {
            check(e.context.realm === foreign, "C4 old Realm");
            trace += "L";
            return normal(n(12));
        }));
        seed(right, wellKnownToPrimitive, fn(foreign, (_this, _args, _context, _at) => {
            check(e.context.realm === foreign, "C4 right Realm");
            trace += "H";
            return normal(n(3));
        }));
        seed(realm.booleanPrototype, "x", o(old));
        bind(realm, "p", base);
        bind(realm, "k", o(key));
        bind(realm, "rhs", fn(foreign, (_this, _args, _context, _at) => {
            check(e.context.realm === foreign, "C4 RHS Realm");
            trace += "R";
            return normal(o(right));
        }));
        error(run(e, "p[k] " + ops[i] + " rhs();"), "property is not writable: x", "C4 PrimitiveBoxes" + names[i]);
        check(trace === "CRLH" && foreign.boxes.objects.length === 0, "C4 foreign calls");
        boxes(realm, base, 2, "C4 caller boxes");
        check(sameValue(realm.boxes.written[0], baseline[i]), "C4 computed");
        clean(e, realm, "C4");
    }
    // C6 GuestAbrupt, C7 HostFault, C8 ForeignFault; C11 seeded state;
    // C12 PostFailure uses the SAME evaluator after each independently seeded fault.
    for (const stage of ["B", "K", "C", "G", "R", "L", "H", "S"]) {
        for (const fault of [false, true]) {
            for (const seeded of [false, true]) {
                for (const foreign of [false, true]) {
                    if (foreign && stage !== "C" && stage !== "R" && stage !== "L" && stage !== "H") continue;
                    const name = "C6/C7/C8/C11/C12 " + stage + names[i] + " fault=" + fault + " seeded=" + seeded + " foreign=" + foreign;
                    const q = new Scenario();
                    q.operands();
                    if (foreign) q.hooks(q.foreign, q.foreign, q.foreign, q.foreign);
                    let calls = 0;
                    let depth = 0;
                    if (seeded) {
                        calls = 2;
                        depth = 4;
                        q.e.calls = calls;
                        q.e.depth = depth;
                    }
                    if (fault) q.events.fault = stage;
                    else q.events.abrupt = stage;
                    let escaped = false;
                    try {
                        const result = q.run(ops[i]);
                        check(!fault, name + " host fault must escape");
                        exact(result, name);
                    } catch (caught) {
                        check(fault && caught instanceof Error && caught === F, name + " exact host fault");
                        escaped = true;
                    }
                    check(escaped === fault, name + " escape");
                    const fullTrace = "BKCGRLHS";
                    check(q.events.trace === fullTrace.slice(0, fullTrace.indexOf(stage) + 1), name + " stage prefix");
                    for (const key of q.events.getKeys) check(key === "x", name + " Get key");
                    for (const key of q.events.setKeys) check(key === "x", name + " Set key");
                    for (const receiver of q.events.receivers) check(receiver === q.base, name + " Receiver");
                    check(sameValue(own(q.target, "x"), o(q.old)), name + " no write");
                    if (foreign) check(q.events.realms[q.events.realms.length - 1] === q.foreign, name + " defining Realm");
                    clean(q.e, q.realm, name, calls, depth);
                    const spent = q.e.steps;
                    q.events.fault = "";
                    q.events.abrupt = "";
                    bind(q.realm, "x", n(12));
                    expect(run(q.e, "x " + ops[i] + " 3;"), baseline[i], name + " postfailure");
                    check(q.e.steps === spent + 3, name + " monotonic steps");
                    clean(q.e, q.realm, name, calls, depth);
                }
            }
        }
    }
}
// R9 also requires undefined (null was exercised in the main resource table).
for (let i = 0; i < ops.length; i++) {
    const q = new Scenario();
    bind(q.realm, "p", U);
    q.e.maxSteps = 4;
    error(run(q.e, "p[k] " + ops[i] + " 3;"), nullish, "R9 Undefined" + names[i]);
    check(q.e.steps === 4 && q.events.trace === "", "R9 undefined resource/effects");
    clean(q.e, q.realm, "R9 undefined");
}
console.log("compound-assignment ok");
