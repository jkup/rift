import { readFileSync } from "node:fs";
import { isLooselyEqual } from "../src/abstract-equality.js";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { lex } from "../src/lexer.js";
import { GuestObject, UNDEFINED, normal, failure, sameValue, equal, truthy, type Value, type ValueCompletion, type InternalBooleanCompletion, type PropertyKey, type Builtin, type ThrowCompletion } from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive } from "../src/symbols.js";
import { toPrimitive } from "../src/primitive-conversion.js";
import type { Expr, Location } from "../src/syntax.js";

const loc: Location = { line: 7, column: 9 };
const U = UNDEFINED;
const L: Value = { kind: "null" };
function n(value: number): Value { return { kind: "number", value }; }
function s(value: string): Value { return { kind: "string", value }; }
function b(value: boolean): Value { return { kind: "boolean", value }; }
function o(object: GuestObject): Value { return { kind: "object", object }; }
function check(ok: boolean, label: string): void { if (!ok) throw new Error("equality " + label); }
function put(target: GuestObject, key: PropertyKey, value: Value): void {
    target.bootstrapDefine(key, { value, writable: true, enumerable: true, configurable: true });
}
function bind(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function fn(realm: Realm, body: Builtin): Value { return o(realm.createBuiltin("hook", 0, body)); }
function expect(result: InternalBooleanCompletion, expected: boolean, label: string): void {
    check(result.type === "normal" && result.value === expected, label);
}
function error(result: InternalBooleanCompletion | ValueCompletion, message: string, at: Location = loc): void {
    check(result.type === "throw" && result.diagnostic.phase === "runtime"
        && result.diagnostic.message === message && result.diagnostic.loc === at, message + " identity/location");
}
function evaluate(e: Evaluator, source: string): ValueCompletion {
    const parsed = parse(source);
    check(parsed.error === null && parsed.body.length === 1, "single parse " + source);
    const stmt = parsed.body[0];
    check(stmt.kind === "expression", "expression");
    if (stmt.kind !== "expression") throw new Error("expression required");
    const result = e.evaluate(stmt.expression, e.context.realm.global, U);
    if (result.type === "throw") return result;
    if (result.type === "normal") return normal(result.value);
    throw new Error("unexpected expression completion");
}

// Operator entry without AST charges lets the resource matrix use its frozen
// direct-operation counts while still testing successful-only negation.
function compare(e: Evaluator, mode: number, x: Value, y: Value): InternalBooleanCompletion {
    if (mode === 0) return isLooselyEqual(x, y, e.context, loc);
    const result = e.binary(mode === 1 ? "==" : "!=", x, y, loc);
    if (result.type === "throw") return result;
    if (result.type === "normal" && result.value.kind === "boolean") return { type: "normal", value: result.value.value };
    throw new Error("expected equality completion");
}

// Each pair runs in both orders, through the direct API and both actual operators.
// The fixture is read at runtime; host-injected Values cover absent guest factories.
const effectSources = readFileSync("test/fixtures/abstract-equality-effects.js", "utf8").trim().split("\n");
const pairSources = readFileSync("test/fixtures/abstract-equality-pairs.js", "utf8").trim().split("\n");
function pair(left: Value, right: Value, expected: boolean, label: string): void {
    for (const reverse of [false, true]) {
        const realm = new Realm((_line) => {});
        const x = reverse ? right : left;
        const y = reverse ? left : right;
        expect(isLooselyEqual(x, y, new Evaluator(realm).context, loc), expected, label + " direct");
        bind(realm, "x", x);
        bind(realm, "y", y);
        for (let i = 0; i < pairSources.length; i++) {
            const result = evaluate(new Evaluator(realm), pairSources[i]);
            check(result.type === "normal" && sameValue(result.value, b(i === 0 ? expected : !expected)), label + " operator");
        }
    }
}

// K: fixed independent truth table, plus exact effects and charges on fresh state.
const table = ["TTFFFFF", "TTFFFFF", "FFTTTFT", "FFTTTFT", "FFTTTFT", "FFFFFTF", "FFTTTFT"];
for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
    for (const reverse of [false, true]) for (const mode of [0, 1, 2]) {
        const realm = new Realm((_line) => {});
        const e = new Evaluator(realm);
        let trace = "";
        let calls = 0;
        const object = realm.createObject();
        put(object, wellKnownToPrimitive, fn(realm, (receiver, args, _context, _at) => {
            check(receiver.kind === "object" && receiver.object === object && args.length === 1
                && sameValue(args[0], s("default")), "K receiver/hint");
            trace += "p:default;";
            calls++;
            return normal(n(0));
        }));
        const values: Value[] = [U, L, b(false), n(0), s(""), { kind: "symbol", value: new GuestSymbol("x") }, o(object)];
        const x = values[reverse ? col : row];
        const y = values[reverse ? row : col];
        const expected = table[row].charAt(col) === "T";
        const converts = (row === 6 && col >= 2 && col <= 5) || (col === 6 && row >= 2 && row <= 5);
        if (mode === 0) {
            expect(isLooselyEqual(x, y, e.context, loc), expected, "K direct");
            check(e.steps === (converts ? 1 : 0), "K ticks");
        } else {
            bind(realm, "x", x);
            bind(realm, "y", y);
            const result = evaluate(e, pairSources[mode - 1]);
            check(result.type === "normal" && sameValue(result.value, b(mode === 1 ? expected : !expected)), "K operator");
        }
        check(trace === (converts ? "p:default;" : "") && calls === (converts ? 1 : 0), "K effects");
        check(e.calls === 0 && e.depth === 0, "K cleanup");
    }
}

const realm = new Realm((_line) => {});
const Y: Value = { kind: "symbol", value: new GuestSymbol("x") };
const Z: Value = { kind: "symbol", value: new GuestSymbol("x") };
const payloads: [string, Value, Value, boolean][] = [
    ["V1", n(NaN), n(NaN), false], ["V1", n(NaN), n(0), false], ["V1", n(NaN), s("NaN"), false],
    ["V2", n(0), n(-0), true], ["V2", n(Infinity), n(Infinity), true], ["V2", n(Infinity), n(-Infinity), false],
    ["V3", b(false), b(true), false], ["V3", b(true), n(1), true], ["V3", b(true), n(2), false], ["V3", b(false), s("false"), false],
    ["V4", s("0"), s(""), false], ["V4", s("01"), s("1"), false], ["V4", s("equal"), s("equal"), true],
    ["V5", s("\ud800"), s("\ud800"), true], ["V5", s("\ud800"), s("\udc00"), false], ["V5", s("é"), s("e\u0301"), false],
    ["V6", n(0), s(""), true], ["V6", n(0), s(" \t\r\n"), true], ["V6", n(0), s("-0"), true], ["V6", n(1), s(" +1 "), true],
    ["V7", n(16), s("0x10"), true], ["V7", n(2), s("0b10"), true], ["V7", n(8), s("0o10"), true], ["V7", n(1), s("1e0"), true], ["V7", n(.5), s(".5"), true],
    ["V8", n(0), s("0x"), false], ["V8", n(1), s("1_0"), false], ["V8", n(1), s("1x"), false], ["V8", n(16), s("+0x10"), false], ["V8", n(1), s("1e"), false],
    ["V9", n(Infinity), s("Infinity"), true], ["V9", n(-Infinity), s("-Infinity"), true], ["V9", n(Infinity), s("1e999"), true], ["V9", n(0), s("1e-999"), true],
    ["V10", n(0), s("infinity"), false], ["V10", n(0), s("\u0085"), false], ["V10", n(0), s("\u200b"), false], ["V10", n(0), s("\0"), false],
    ["V11", n(0), s("\u00a0\ufeff\u2028\u2029"), true],
    ["V12", L, n(0), false], ["V12", U, n(NaN), false], ["V12", L, s(""), false], ["V12", U, s("undefined"), false],
    ["V13", Y, Y, true], ["V13", Y, Z, false], ["V13", Y, s("Symbol(x)"), false], ["V13", Y, n(0), false], ["V13", Y, b(false), false],
];
for (const [id, left, right, expected] of payloads) pair(left, right, expected, id);
const identity = realm.createObject();
put(identity, wellKnownToPrimitive, fn(realm, (_receiver, _args, _context, at) => failure("Error", "must not call", at)));
pair(o(identity), o(identity), true, "V14 same");
pair(o(identity), o(realm.createObject()), false, "V14 distinct");
for (const value of [realm.createNumberObject(2), realm.createStringObject("2"), realm.createSymbolObject(Y.kind === "symbol" ? Y.value : new GuestSymbol("unreachable"))]) {
    pair(o(value), o(value), true, "V14/C10 self");
}
const returnValues: Value[] = [U, L, b(false), n(0), s(""), Y, Z];
const zeroAnswers = [false, false, true, true, true, false, false];
const symbolAnswers = [false, false, false, false, false, true, false];
for (let i = 0; i < returnValues.length; i++) {
    const target = realm.createObject();
    put(target, wellKnownToPrimitive, fn(realm, (_receiver, _args, _context, _at) => normal(returnValues[i])));
    pair(o(target), n(0), zeroAnswers[i], "V16");
    pair(o(target), Y, symbolAnswers[i], "V17");
}
pair(o(identity), L, false, "V18/O19");
pair(o(identity), U, false, "V18/O19");
pair(o(new GuestObject()), o(new GuestObject()), false, "V15/C12 objects");
pair(o(new GuestObject()), L, false, "V15 null");

// O9-O23 / R2-R11: fresh objects for every order/operator so mutations cannot leak.
const scenarios: { id: number; trace: string; ticks: number; calls: number; message: string }[] = [
    { id: 9, trace: "V;newT;", ticks: 3, calls: 2, message: "" },
    { id: 10, trace: "V;T;", ticks: 3, calls: 2, message: "" },
    { id: 11, trace: "V;", ticks: 2, calls: 1, message: "" },
    { id: 12, trace: "T;", ticks: 3, calls: 1, message: "" },
    { id: 13, trace: "V;", ticks: 2, calls: 1, message: "" },
    { id: 14, trace: "", ticks: 1, calls: 0, message: "symbol toPrimitive method is not callable" },
    { id: 15, trace: "P:default;", ticks: 1, calls: 1, message: "cannot convert object to primitive" },
    { id: 16, trace: "V;T;", ticks: 3, calls: 2, message: "cannot convert object to primitive" },
    { id: 17, trace: "V;", ticks: 2, calls: 1, message: "marker" },
    { id: 18, trace: "", ticks: 3, calls: 0, message: "cannot convert object to primitive" },
    { id: 23, trace: "P:default;", ticks: 1, calls: 1, message: "" },
];
for (const row of scenarios) for (const variant of [0, 1, 2, 3]) {
    for (const reverse of [false, true]) for (const mode of [0, 1, 2]) {
        const r = new Realm((_line) => {});
        const e = new Evaluator(r);
        const target = new GuestObject();
        const value = o(target);
        const marker = failure("Error", "marker", loc);
        let trace = "";
        let bodies = 0;
        let peak = 0;
        const record = (receiver: Value, args: Value[], name: string): void => {
            check(receiver === value, "O23 original receiver");
            check(args.length === (name === "P:default;" ? 1 : 0), "O23 arity");
            if (args.length === 1) check(sameValue(args[0], s("default")), "O23 default hint");
            trace += name;
            bodies++;
            peak = Math.max(peak, e.calls);
        };
        const T = fn(r, (receiver, args, _context, _at) => {
            record(receiver, args, "T;");
            if (row.id === 11) return marker;
            return normal(row.id === 16 ? value : s("1"));
        });
        const V = fn(r, (receiver, args, _context, _at) => {
            record(receiver, args, "V;");
            if (row.id === 17) return marker;
            if (row.id === 9) {
                put(target, "toString", fn(r, (receiver2, args2, _context2, _at2) => {
                    record(receiver2, args2, "newT;");
                    return normal(s("1"));
                }));
            }
            if (row.id === 10) {
                const proto = new GuestObject();
                put(proto, "toString", T);
                target.setPrototypeOf(proto);
            }
            return normal(row.id === 9 || row.id === 10 || row.id === 16 ? value : n(1));
        });
        if (row.id === 18 && variant !== 0) {
            put(target, "valueOf", n(0));
            put(target, "toString", b(false));
        }
        if (row.id !== 18) put(target, "valueOf", row.id === 12 ? n(0) : V);
        if (row.id !== 10 && row.id !== 18) put(target, "toString", T);
        if (row.id === 13) put(target, wellKnownToPrimitive, variant % 2 === 0 ? U : L);
        if (row.id === 14) put(target, wellKnownToPrimitive, [b(false), n(0), s(""), o(new GuestObject())][variant]);
        if (row.id === 15 || row.id === 23) put(target, wellKnownToPrimitive, fn(r, (receiver, args, _context, _at) => {
            record(receiver, args, "P:default;");
            return normal(row.id === 15 ? value : n(1));
        }));
        const x = reverse ? n(1) : value;
        const y = reverse ? value : n(1);
        let result: InternalBooleanCompletion;
        if (mode === 0) result = isLooselyEqual(x, y, e.context, loc);
        else {
            bind(r, "x", x);
            bind(r, "y", y);
            const completion = evaluate(e, pairSources[mode - 1]);
            if (completion.type === "throw") result = completion;
            else {
                check(completion.value.kind === "boolean", "O boolean result");
                result = { type: "normal", value: completion.value.kind === "boolean" && completion.value.value };
            }
        }
        if (row.message === "") expect(result, mode !== 2, "O" + row.id);
        else if (row.id === 17) {
            check(result === marker && result.value === marker.value && result.diagnostic === marker.diagnostic
                && result.diagnostic.loc === loc, "O17 exact record");
        } else {
            check(result.type === "throw" && result.diagnostic.name === "TypeError"
                && result.diagnostic.message === row.message && result.diagnostic.phase === "runtime"
                && result.diagnostic.loc.line === (mode === 0 ? 7 : 1)
                && result.diagnostic.loc.column === (mode === 0 ? 9 : 1), "O" + row.id + " diagnostic");
        }
        check(trace === row.trace && bodies === row.calls && peak === (bodies === 0 ? 0 : 1), "O" + row.id + " trace/calls");
        check(e.steps === row.ticks + (mode === 0 ? 0 : 3) && e.calls === 0 && e.depth === 0, "O exact costs");
    }
}

// Original internal Get failures, before either protocol or ordinary calls.
class BrokenGet extends GuestObject {
    constructor(readonly brokenKey: PropertyKey, readonly marker: ThrowCompletion) { super(); }
    override internalGet(key: PropertyKey, receiver: Value, at: Location): ValueCompletion {
        if (key === this.brokenKey) return this.marker;
        return super.internalGet(key, receiver, at);
    }
}
for (const key of [wellKnownToPrimitive, "valueOf", "toString"]) for (const reverse of [false, true]) {
    for (const mode of [0, 1, 2]) {
        const r = new Realm((_line) => {});
        const marker = failure("Error", "Get marker", loc);
        const target = o(new BrokenGet(key, marker));
        const e = new Evaluator(r);
        bind(r, "x", reverse ? n(1) : target);
        bind(r, "y", reverse ? target : n(1));
        const result = mode === 0 ? isLooselyEqual(target, n(1), e.context, loc) : evaluate(e, pairSources[mode - 1]);
        check(result === marker && result.value === marker.value && result.diagnostic === marker.diagnostic
            && result.diagnostic.loc === loc && e.calls === 0, "O22 identity");
    }
}

// R1: zero-budget comparisons really do not read objects or invoke hooks.
for (const [x, y, answer] of [[n(1), s("1"), true], [o(identity), L, false], [o(identity), o(identity), true],
    [o(identity), o(new GuestObject()), false]] as [Value, Value, boolean][]) {
    const e = new Evaluator(realm, 0, 0);
    expect(isLooselyEqual(x, y, e.context, loc), answer, "R1");
    check(e.steps === 0 && e.calls === 0, "R1 zero");
}
// R8-R11: failing ticks count; exact-boundary success has no equality surcharge.
for (const kind of ["protocol", "ordinary", "fallback"]) for (const reverse of [false, true]) for (const mode of [0, 1, 2]) {
    const cost = kind === "protocol" ? 1 : kind === "ordinary" ? 2 : 3;
    for (const maxSteps of [cost - 1, cost]) for (const maxCalls of [0, 64]) {
        const r = new Realm((_line) => {});
        const e = new Evaluator(r, maxSteps, maxCalls);
        const target = new GuestObject();
        let bodies = 0;
        const method = fn(r, (_receiver, _args, _context, _at) => {
            bodies++;
            return normal(n(1));
        });
        if (kind === "protocol") put(target, wellKnownToPrimitive, method);
        else {
            put(target, "valueOf", kind === "ordinary" ? method : fn(r, (_receiver, _args, _context, _at) => {
                bodies++;
                return normal(o(target));
            }));
            put(target, "toString", method);
        }
        const result = compare(e, mode, reverse ? n(1) : o(target), reverse ? o(target) : n(1));
        if (maxCalls === 0 && (kind === "fallback" || maxSteps === cost)) {
            error(result, "call depth limit exceeded");
            check(bodies === 0 && e.steps === (kind === "protocol" ? 1 : 2), "R11 no body");
        } else if (maxSteps < cost) {
            error(result, "execution step limit exceeded");
            check(e.steps === cost && bodies === (kind === "fallback" ? 1 : 0), "R8/R9 failing tick");
        } else {
            expect(result, mode !== 2, "R10 boundary");
            check(e.steps === cost && bodies === (kind === "fallback" ? 2 : 1), "R10 costs");
        }
        check(e.calls === 0 && e.depth === 0, "R cleanup");
    }
}

// R12-R14: foreign Realm restoration and bounded recursive reentry.
for (const outcome of ["success", "throw", "fault"]) for (const reverse of [false, true]) for (const mode of [0, 1, 2]) {
    const a = new Realm((_line) => {});
    const foreign = new Realm((_line) => {});
    const e = new Evaluator(a);
    const target = a.createObject();
    const marker = failure("Error", "foreign marker", loc);
    const fault = new Error("foreign host fault");
    let bodies = 0;
    put(target, wellKnownToPrimitive, fn(foreign, (_receiver, _args, context, _at): ValueCompletion => {
        bodies++;
        check(context.realm === foreign && e.calls === 1, "R12 defining Realm");
        if (outcome === "fault") throw fault;
        return outcome === "throw" ? marker : normal(n(1));
    }));
    let caught = false;
    try {
        const result = compare(e, mode, reverse ? n(1) : o(target), reverse ? o(target) : n(1));
        if (outcome === "throw") check(result === marker, "R12 original throw");
        else expect(result, mode !== 2, "R12 success");
    } catch (caughtFault) {
        if (caughtFault instanceof Error) check(caughtFault === fault, "R12 identical host fault");
        else throw new Error("unexpected host fault");
        caught = true;
    }
    check(caught === (outcome === "fault") && e.context.realm === a && e.calls === 0 && e.depth === 0
        && e.steps === 1 && bodies === 1, "R12 cleanup");
}
for (const limit of [2, 64]) for (const reverse of [false, true]) for (const mode of [0, 1, 2]) {
    const a = new Realm((_line) => {});
    const foreign = new Realm((_line) => {});
    const e = limit === 64 ? new Evaluator(a) : new Evaluator(a, 100000, limit);
    const target = a.createObject();
    let bodies = 0;
    let peak = 0;
    put(target, wellKnownToPrimitive, fn(foreign, (_receiver, _args, context, at) => {
        bodies++;
        peak = Math.max(peak, e.calls);
        check(context.realm === foreign, "R13 defining Realm");
        const result = isLooselyEqual(reverse ? n(1) : o(target), reverse ? o(target) : n(1), context, at);
        return result.type === "throw" ? result : normal(b(result.value));
    }));
    error(compare(e, mode, reverse ? n(1) : o(target), reverse ? o(target) : n(1)), "call depth limit exceeded");
    check(bodies === limit && peak === limit && e.steps === limit + 1 && e.calls === 0
        && e.depth === 0 && e.context.realm === a, "R13/R14 default guard cleanup");
    expect(isLooselyEqual(n(1), n(1), e.context, loc), true, "R14 reuse");
    check(e.steps === limit + 1, "R14 no refund");
}

// O1-O8 evaluation boundaries use host hook records so record identity is testable.
for (const stage of ["left", "right", "protocol"]) for (const reverse of [false, true]) {
    for (const op of ["==", "!="]) {
        const r = new Realm((_line) => {});
        const e = new Evaluator(r);
        const marker = failure("Error", "operand marker", loc);
        const target = r.createObject();
        let trace = "";
        put(target, wellKnownToPrimitive, fn(r, (_receiver, _args, _context, _at) => {
            trace += "P:default;";
            return marker;
        }));
        bind(r, "L", fn(r, (_receiver, _args, _context, _at) => {
            trace += "L;";
            return stage === "left" ? marker : normal(reverse ? n(1) : o(target));
        }));
        bind(r, "R", fn(r, (_receiver, _args, _context, _at) => {
            trace += "R;";
            return stage === "right" ? marker : normal(reverse ? o(target) : n(1));
        }));
        const result = evaluate(e, effectSources[op === "==" ? 0 : 1]);
        check(result === marker && result.value === marker.value && result.diagnostic === marker.diagnostic
            && result.diagnostic.loc === loc, "O3/O4/O5 original record");
        check(trace === (stage === "left" ? "L;" : stage === "right" ? "L;R;" : "L;R;P:default;"), "O abrupt trace");
    }
}
// R15-R17 statements have one more tick than direct evaluate.
for (const kind of ["primitive", "protocol", "ordinary"]) for (const op of ["==", "!="]) {
    const cost = kind === "primitive" ? 4 : kind === "protocol" ? 5 : 6;
    for (const budget of [cost - 1, cost]) {
        const r = new Realm((_line) => {});
        const e = new Evaluator(r, budget);
        let bodies = 0;
        const target = new GuestObject();
        put(target, kind === "protocol" ? wellKnownToPrimitive : "valueOf", fn(r, (_receiver, _args, _context, _at) => {
            bodies++;
            return normal(n(1));
        }));
        bind(r, "o", o(target));
        const parsed = parse((kind === "primitive" ? "1" : "o") + " " + op + " 1;");
        const result = e.statement(parsed.body[0], r.global, U);
        if (budget === cost) check(result.type === "normal" && sameValue(result.value, b(op === "==")), "R15-17 success");
        else check(result.type === "throw" && result.diagnostic.message === "execution step limit exceeded"
            && result.diagnostic.loc.line === 1 && result.diagnostic.loc.column === (kind === "primitive" ? 6 : 1), "R15-17 location");
        check(e.steps === cost && bodies === (budget === cost && kind !== "primitive" ? 1 : 0), "R15-17 counts");
    }
}
const nested = parse("(".repeat(129) + "1 == 1" + ")".repeat(129) + ";");
check(nested.error !== null && nested.error.message === "syntax nesting limit exceeded"
    && nested.error.loc.line === 1 && nested.error.loc.column === 128, "R18");
for (const op of ["==", "!="]) {
    let expr: Expr = { kind: "literal", value: 1, loc };
    for (let i = 0; i < 257; i++) expr = { kind: "binary", op, left: expr, right: { kind: "literal", value: 1, loc }, loc };
    const e = new Evaluator(realm);
    const result = e.evaluate(expr, realm.global, U);
    check(result.type === "throw", "R19 abrupt");
    if (result.type === "throw") error(result, "evaluation nesting limit exceeded");
    check(e.steps === 257 && e.depth === 0, "R19 exact depth");
}
const fixtureRealm = new Realm((_line) => {});
bind(fixtureRealm, "protocol", { kind: "symbol", value: wellKnownToPrimitive });
const fixture = parse(readFileSync("test/fixtures/abstract-equality.js", "utf8"));
check(fixture.error === null, "fixture parse");
check(new Evaluator(fixtureRealm).block(fixture.body, fixtureRealm.global, U).type === "normal", "runtime fixture");
for (const op of ["==", "!="]) {
    const r = new Realm((_line) => {});
    bind(r, "protocol", { kind: "symbol", value: wellKnownToPrimitive });
    bind(r, "o", o(r.createObject()));
    const parsed = parse(readFileSync("test/fixtures/abstract-equality-recursion.js", "utf8").replaceAll("==", op));
    const e = new Evaluator(r);
    const result = e.block(parsed.body, r.global, U);
    check(result.type === "throw" && result.diagnostic.name === "RangeError"
        && result.diagnostic.message === "call depth limit exceeded" && e.calls === 0 && e.depth === 0
        && e.context.realm === r && e.steps > 64, "R13 guest default64");
}

// P grammar: fixed outputs plus AST shapes and token ranges.
const grammar: [string, Value][] = [
    ["1 == '1';", b(true)], ["1 != '1';", b(false)], ["1 === '1';", b(false)], ["1 !== '1';", b(true)],
    ["1 == 1 == true;", b(true)], ["0 == 0 !== false;", b(true)], ["1 + 1 == 2 < 3;", b(false)],
    ["false == 0 && true;", b(true)], ["true || missing == 0;", b(true)],
    ["0 == false ? 7 : missing;", n(7)], ["!0 == true;", b(true)], ["1/*a*/==/*b*/'1';", b(true)], ["1 != !0;", b(false)],
];
for (const [source, expected] of grammar) {
    const result = evaluate(new Evaluator(realm), source);
    check(result.type === "normal" && sameValue(result.value, expected), "P result " + source);
}
const associations: [string, string, string, string][] = [
    ["1 == 1 == true;", "==", "==", ""], ["0 == 0 !== false;", "!==", "==", ""],
    ["1 + 1 == 2 < 3;", "==", "+", "<"], ["false == 0 && true;", "&&", "==", ""],
    ["true || missing == 0;", "||", "", "=="],
];
for (const [source, root, left, right] of associations) {
    const stmt = parse(source).body[0];
    check(stmt.kind === "expression" && stmt.expression.kind === "binary", "P binary AST");
    if (stmt.kind === "expression" && stmt.expression.kind === "binary") {
        const expr = stmt.expression;
        check(expr.op === root, "P root");
        if (left !== "") check(expr.left.kind === "binary" && expr.left.op === left, "P left association");
        if (right !== "") check(expr.right.kind === "binary" && expr.right.op === right, "P right precedence");
    }
}
for (const op of ["===", "!==", "==", "!="]) {
    const token = lex("1 " + op + " '1';").tokens[1];
    check(token.text === op && token.start === 2 && token.end === 2 + op.length, "P strict longest match");
}
const commentToken = lex("1/*a*/==/*b*/'1';").tokens[1];
check(commentToken.loc.line === 1 && commentToken.loc.column === 7 && commentToken.start === 6 && commentToken.end === 8, "P11 offsets");
const negatives: [string, string, number][] = [
    ["1 ==;", "unsupported or unexpected syntax: ;", 5], ["1 !=;", "unsupported or unexpected syntax: ;", 5],
    ["1 ==== 1;", "unsupported or unexpected syntax: =", 6], ["1 !=== 1;", "unsupported or unexpected syntax: =", 6],
    ["1 = = 1;", "unsupported or unexpected syntax: =", 5], ["1 == 1 = 2;", "invalid assignment target", 1],
    ["1 == 1, 2;", "expected ';', found ','", 7], ["1 += 1;", "invalid assignment target", 1],
    ["1 => 1;", "unsupported operator: =>", 3], ["1 ** 1;", "unsupported operator: **", 3],
    ["1 << 1;", "unsupported operator: <<", 3], ["1 == == 1;", "unsupported or unexpected syntax: ==", 6],
];
for (const [source, message, column] of negatives) {
    const diagnostic = parse(source).error;
    check(diagnostic !== null && diagnostic.phase === "parse" && diagnostic.name === "SyntaxError"
        && diagnostic.message === message && diagnostic.loc.line === 1 && diagnostic.loc.column === column, "P negative " + source);
}

// C host-only wrappers, inherited indices, fallback, foreign slots and controls.
if (Y.kind !== "symbol") throw new Error("symbol required");
const consumers: [Value, Value, boolean][] = [
    [o(realm.createNumberObject(2)), n(2), true], [o(realm.createBooleanObject(false)), n(0), true],
    [o(realm.createStringObject("2")), n(2), true], [o(realm.createSymbolObject(Y.value)), Y, true],
    [o(realm.createSymbolObject(Y.value)), Z, false], [o(realm.createSymbolObject(Y.value)), s("Symbol(x)"), false],
    [o(realm.createSymbolObject(Y.value)), n(0), false], [o(realm.createSymbolObject(Y.value)), L, false],
    [o(realm.createNumberObject(2)), o(realm.createNumberObject(2)), false],
    [o(realm.createStringObject("2")), o(realm.createStringObject("2")), false],
    [o(realm.createSymbolObject(Y.value)), o(realm.createSymbolObject(Y.value)), false],
    [o(realm.functionPrototype), s("function () { [native code] }"), true],
    [o(realm.arrayPrototype), s(""), true], [o(realm.objectPrototype), L, false],
];
for (const [x, y, answer] of consumers) pair(x, y, answer, "C8-C16");
const inherited = realm.createArray();
const proto = realm.createObject();
put(proto, "0", n(2));
put(proto, "toString", realm.arrayPrototype.get("toString"));
put(proto, "join", realm.arrayPrototype.get("join"));
inherited.setPrototypeOf(proto);
inherited.defineOwnProperty("length", { value: n(1) }, new Evaluator(realm).context, loc);
pair(o(inherited), n(2), true, "C3 inherited");
const overridden = realm.createArray();
put(overridden, "join", fn(realm, (_receiver, _args, _context, _at) => normal(s("7"))));
pair(o(overridden), n(7), true, "C4 replaced");
put(overridden, "join", n(0));
pair(o(overridden), s("[object Array]"), true, "C4 fallback");
const foreign = new Realm((_line) => {});
pair(o(foreign.createSymbolObject(Y.value)), Y, true, "C13 foreign");
const relinked = foreign.createSymbolObject(Y.value);
relinked.setPrototypeOf(null);
put(relinked, wellKnownToPrimitive, fn(foreign, (_receiver, _args, _context, _at) => normal(n(2))));
pair(o(relinked), n(2), true, "C13 relinked");
const control = new Evaluator(realm);
const numberBox = o(realm.createNumberObject(2));
const tag = toPrimitive(numberBox, "string", control.context, loc);
check(tag.type === "normal" && sameValue(tag.value, s("2")), "C14 Number string payload");
for (const [value, expected] of [[o(realm.createArray()), "[object Array]"], [o(realm.functionPrototype), "[object Function]"]] as [Value, string][]) {
    const result = control.call(realm.objectPrototype.get("toString"), value, [], loc);
    check(result.type === "normal" && sameValue(result.value, s(expected)), "C15 explicit tags");
}
check(equal(o(identity), o(identity)) && !equal(o(identity), n(0)) && truthy(o(identity)), "C15 strict/truthy");
for (const reverse of [false, true]) for (const mode of [0, 1, 2]) {
    const r = new Realm((_line) => {});
    const e = new Evaluator(r);
    const x = reverse ? n(0) : o(new GuestObject());
    const y = reverse ? o(new GuestObject()) : n(0);
    bind(r, "x", x);
    bind(r, "y", y);
    const result = mode === 0 ? isLooselyEqual(x, y, e.context, loc) : evaluate(e, pairSources[mode - 1]);
    check(result.type === "throw" && result.diagnostic.name === "TypeError"
        && result.diagnostic.message === "cannot convert object to primitive", "V15/C12 null-root");
}
// C7: name is configurable but nonwritable; descriptor mutation is host setup.
const nameRealm = new Realm((_line) => {});
const nameInput = parse("let f = function() { return 1; };");
check(new Evaluator(nameRealm).block(nameInput.body, nameRealm.global, U).type === "normal", "C7 setup");
const named = nameRealm.global.bindings.get("f");
if (named === undefined || named.value.kind !== "object") throw new Error("missing C7 function");
named.value.object.defineOwnProperty("name", { value: s("changed") }, new Evaluator(nameRealm).context, loc);
pair(named.value, s("function() { return 1; }"), true, "C7 changed public name");
// P8-P10 structural checks: conditional/assignment/unary boundaries.
const conditional = parse("0 == false ? 7 : missing;").body[0];
check(conditional.kind === "expression" && conditional.expression.kind === "conditional"
    && conditional.expression.test.kind === "binary" && conditional.expression.test.op === "==", "P8 AST");
const assignment = parse("x = 0 == false;").body[0];
check(assignment.kind === "expression" && assignment.expression.kind === "assign"
    && assignment.expression.value.kind === "binary" && assignment.expression.value.op === "==", "P9 AST");
const unary = parse("!0 == true;").body[0];
check(unary.kind === "expression" && unary.expression.kind === "binary"
    && unary.expression.left.kind === "unary" && unary.expression.left.op === "!", "P10 AST");
// A guest throw retains its statement location through equality.
for (const op of ["==", "!="]) {
    const r = new Realm((_line) => {});
    const input = parse("let o = {valueOf: function() {\n    throw 'guest marker';\n}};\no " + op + " 1;");
    const result = new Evaluator(r).block(input.body, r.global, U);
    check(result.type === "throw" && sameValue(result.value, s("guest marker"))
        && result.diagnostic.loc.line === 2 && result.diagnostic.loc.column === 5, "O17 guest throw location");
}
const identicalA = realm.createObject();
const identicalB = realm.createObject();
const poison = fn(realm, (_receiver, _args, _context, at) => failure("Error", "unexpected identity conversion", at));
for (const target of [identicalA, identicalB]) {
    put(target, "x", n(1));
    put(target, wellKnownToPrimitive, poison);
}
pair(o(identicalA), o(identicalB), false, "V14/O20 identical properties with poison hooks");
for (const nil of [U, L]) {
    const target = realm.createObject();
    let calls = 0;
    put(target, wellKnownToPrimitive, fn(realm, (_receiver, _args, _context, _at) => {
        calls++;
        return normal(nil);
    }));
    pair(o(target), nil, false, "V18 nullish results");
    check(calls === 0, "V18 no hook");
}
for (const reverse of [false, true]) for (const mode of [0, 1, 2]) {
    for (const [x, y, answer] of [[n(1), s("1"), true], [o(identity), L, false],
        [o(identity), o(identity), true], [o(identity), o(new GuestObject()), false]] as [Value, Value, boolean][]) {
        const e = new Evaluator(realm, 0, 0);
        expect(compare(e, mode, reverse ? y : x, reverse ? x : y), mode === 2 ? !answer : answer, "R1 both operators");
        check(e.steps === 0 && e.calls === 0, "R1 no charges");
    }
}
console.log("abstract-equality ok");
