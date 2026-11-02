import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { run as interpret } from "../src/interpreter.js";
import { typeOfValue } from "../src/typeof.js";
import {
    Environment,
    GuestObject,
    UNDEFINED as U,
    normal,
    failure,
    sameValue,
    type Value,
    type Completion,
    type ValueCompletion,
    type PropertyKey,
    type Builtin,
    type OperationContext,
    type InternalBooleanCompletion,
} from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import type { Expr, Stmt, Location } from "../src/syntax.js";

function check(condition: boolean, name: string): void {
    if (!condition) {
        throw new Error("typeof-void " + name);
    }
}
function n(value: number): Value {
    return { kind: "number", value };
}
function s(value: string): Value {
    return { kind: "string", value };
}
function b(value: boolean): Value {
    return { kind: "boolean", value };
}
function o(object: GuestObject): Value {
    return { kind: "object", object };
}
function fresh(): Realm {
    return new Realm((_line) => {});
}
function bind(env: Environment, name: string, value: Value, initialized = true): void {
    env.bindings.set(name, { initialized, mutable: true, value });
}
function put(object: GuestObject, key: PropertyKey, value: Value): void {
    object.bootstrapDefine(key, { value, writable: true, enumerable: true, configurable: true });
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
        throw new Error("expected expression statement");
    }
    return stmt.expression;
}
function run(e: Evaluator, source: string, env: Environment = e.context.realm.global): Completion {
    return e.statement(statement(source), env, U);
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
    errorName = "ReferenceError",
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
class MeasuredEvaluator extends Evaluator {
    peakDepth = 0;
    invocations = 0;
    evaluate(expr: Expr, env: Environment, receiver: Value, allowUnresolvable = false): Completion {
        this.peakDepth = Math.max(this.peakDepth, this.depth + 1);
        return super.evaluate(expr, env, receiver, allowUnresolvable);
    }
    call(callee: Value, receiver: Value, args: Value[], loc: Location): ValueCompletion {
        if (this.calls < this.maxCalls) {
            this.invocations++;
        }
        return super.call(callee, receiver, args, loc);
    }
}
class Observed extends GuestObject {
    reads = 0;
    writes = 0;
    internalSet(
        key: PropertyKey,
        value: Value,
        receiver: Value,
        context: OperationContext,
        loc: Location,
    ): InternalBooleanCompletion {
        this.writes++;
        return super.internalSet(key, value, receiver, context, loc);
    }
    trace = "";
    expectedReceiver: GuestObject | null = null;
    lastKey: PropertyKey = "";
    abrupt: ValueCompletion | null = null;
    hostFault: Error | null = null;
    internalGet(key: PropertyKey, receiver: Value, loc: Location): ValueCompletion {
        this.reads++;
        this.trace += "G";
        this.lastKey = key;
        if (this.expectedReceiver !== null) {
            check(
                receiver.kind === "object" && receiver.object === this.expectedReceiver,
                "captured receiver",
            );
        }
        if (this.hostFault !== null) {
            throw this.hostFault;
        }
        if (this.abrupt !== null) {
            return this.abrupt;
        }
        return super.internalGet(key, receiver, loc);
    }
}

// V1-V17 and R25: every classification uses a literal oracle, in both Realms.
for (const foreign of [false, true]) {
    const realm = fresh();
    const owner = foreign ? fresh() : realm;
    const e = new MeasuredEvaluator(realm);
    const values: Value[] = [];
    const expected: string[] = [];
    const names: string[] = [];
    function add(name: string, value: Value, result: string): void {
        names.push(name);
        values.push(value);
        expected.push(result);
    }
    add("V1 Undefined", U, "undefined");
    add("V2 Null", { kind: "null" }, "object");
    for (const value of [false, true]) {
        add("V3 Boolean", b(value), "boolean");
    }
    for (const value of [0, -0, 1, -1, NaN, Infinity, -Infinity]) {
        add("V4 Number", n(value), "number");
    }
    for (const value of ["", "ASCII", "\ud83d\ude00", "\ud800", "\udc00"]) {
        add("V5 String", s(value), "string");
    }
    for (const value of [
        new GuestSymbol(undefined),
        new GuestSymbol(""),
        new GuestSymbol("same"),
        new GuestSymbol("same"),
        wellKnownToPrimitive,
    ]) {
        add("V6 Symbol", { kind: "symbol", value }, "symbol");
    }
    const fixed = owner.createObject();
    fixed.preventExtensions();
    const inheritedRoot = owner.createObject();
    put(inheritedRoot, "inherited", n(7));
    const inherited = new GuestObject(inheritedRoot);
    for (const value of [owner.createObject(), new GuestObject(null), fixed, inherited]) {
        add("V7 Ordinary", o(value), "object");
    }
    const holes = owner.createArray();
    holes.defineOwnProperty("length", { value: n(3) }, e.context, { line: 1, column: 1 });
    const elements = owner.createArray();
    put(elements, "0", n(7));
    for (const value of [owner.createArray(), holes, elements, owner.arrayPrototype]) {
        add("V8 Array", o(value), "object");
    }
    for (const value of [
        owner.createBooleanObject(true),
        owner.createNumberObject(7),
        owner.createStringObject("x"),
        owner.createSymbolObject(new GuestSymbol("x")),
    ]) {
        add("V9 Wrappers", o(value), "object");
    }
    for (const value of [
        owner.objectPrototype,
        owner.booleanPrototype,
        owner.numberPrototype,
        owner.stringPrototype,
        owner.symbolPrototype,
    ]) {
        add("V10 Prototypes", o(value), "object");
    }
    expect(program(new Evaluator(owner), "function source() {}"), U, "guest setup");
    add("V11 GuestFunction source", owner.global.bindings.get("source")!.value, "function");
    add(
        "V11 GuestFunction null",
        o(owner.createGuestFunction([], [], owner.global, null)),
        "function",
    );
    const consoleValue = owner.global.bindings.get("console")!.value;
    const numberValue = owner.global.bindings.get("Number")!.value;
    if (consoleValue.kind !== "object" || numberValue.kind !== "object") {
        throw new Error("namespace");
    }
    add("V12 Builtin log", consoleValue.object.getOwnProperty("log")!.value, "function");
    add("V12 Builtin finite", numberValue.object.getOwnProperty("isFinite")!.value, "function");
    add(
        "V12 Builtin unnamed",
        o(
            new GuestObject(owner.functionPrototype, false, {
                kind: "builtin",
                realm: owner,
                initialName: null,
                invoke: (_r, _a, _c, _l): Completion => {
                    throw new Error("must not call");
                },
            }),
        ),
        "function",
    );
    add("V12 Builtin prototype", o(owner.functionPrototype), "function");
    add("V13 NumberNamespace", numberValue, "object");
    add("V13 Console", consoleValue, "object");
    const fake = new GuestObject(owner.functionPrototype);
    for (const key of ["call", "name", "length", "prototype"]) {
        put(fake, key, n(7));
    }
    add("V15 FakeCallable", o(fake), "object");
    const mutated = owner.createBuiltin("saved", 0, (_r, _a, _c, _l): Completion => {
        throw new Error("must not call");
    });
    mutated.setPrototypeOf(null);
    for (const key of ["name", "length", "toString", "call"]) {
        mutated.internalDelete(key);
    }
    bind(realm.global, "x", o(mutated));
    expect(run(e, "typeof x;"), s("function"), "V16 deleted visible properties");
    expect(run(e, "void x;"), U, "V16 deleted void");
    for (const key of ["name", "length", "toString", "call"]) {
        put(mutated, key, n(7));
    }
    add("V16 MutatedFunction", o(mutated), "function");
    const poisons: Observed[] = [];
    for (const callable of [false, true]) {
        const poison = new Observed(null, false, callable ? mutated.callable : null);
        poison.hostFault = new Error("classification must not read");
        for (const key of ["valueOf", "toString", "tag"]) {
            put(
                poison,
                key,
                fn(owner, (_r, _a, _c, _l): Completion => {
                    throw new Error("poison");
                }),
            );
        }
        put(
            poison,
            wellKnownToPrimitive,
            fn(owner, (_r, _a, _c, _l) =>
                failure("ReferenceError", "poison", { line: 9, column: 8 }),
            ),
        );
        put(poison, wellKnownToStringTag, s("Function"));
        poisons.push(poison);
        add("V17 PoisonConversions", o(poison), callable ? "function" : "object");
    }
    for (let i = 0; i < values.length; i++) {
        bind(realm.global, "x", values[i]);
        expect(run(e, "typeof x;"), s(expected[i]), names[i]);
        expect(run(e, "void x;"), U, names[i] + " void");
        check(
            e.context.realm === realm && e.depth === 0 && e.calls === 0,
            "V14 ForeignRealm cleanup",
        );
    }
    e.maxSteps = e.steps;
    for (let i = 0; i < values.length; i++) {
        check(typeOfValue(values[i]) === expected[i], "R25 PureHelper " + names[i]);
    }
    for (const poison of poisons) {
        check(poison.reads === 0, "V17 zero property reads");
    }
}

// B1-B19: independent source strings retain exact identifier locations.
const bindingSources = [
    "void x;",
    "void (((x)));",
    "typeof x; let x;",
    "void x; let x;",
    "typeof (x); let x;",
    "void (x); let x;",
    "let x = typeof x;",
    "let x = void x;",
    "typeof x.y;",
    "void x.y;",
    "typeof x();",
    "void x();",
    "typeof (true ? x : 1);",
    "typeof (false || x);",
    "typeof (x = 1);",
];
const bindingColumns = [6, 9, 8, 6, 9, 7, 16, 14, 8, 6, 8, 6, 16, 18, 9];
const bindingNames = [
    "B3 VoidMissing",
    "B3 ParenthesizedVoidMissing",
    "B4 TDZ",
    "B4 VoidTDZ",
    "B5 ParenthesizedTDZ",
    "B5 VoidParenthesizedTDZ",
    "B6 SelfInitialization",
    "B6 VoidSelfInitialization",
    "B14 NestedMissing",
    "B14 VoidNestedMissing",
    "B15 CallMissing",
    "B15 VoidCallMissing",
    "B16 ConditionalMissing",
    "B17 LogicalMissing",
    "B18 AssignmentMissing",
];
for (let i = 0; i < bindingSources.length; i++) {
    const realm = fresh();
    const e = new MeasuredEvaluator(realm);
    const hasLexicalDeclaration = bindingSources[i].includes("let x");
    error(
        program(e, bindingSources[i]),
        hasLexicalDeclaration ? "x is not initialized" : "x is not defined",
        bindingColumns[i],
        bindingNames[i],
    );
    check(e.depth === 0 && e.calls === 0, "binding cleanup");
    if (hasLexicalDeclaration) {
        check(realm.global.bindings.get("x")!.initialized === false, "B6 remains TDZ");
    } else {
        check(!realm.global.bindings.has("x"), "no binding creation");
    }
}
for (const source of ["typeof x;", "typeof (((x)));", "typeof (false && x);"]) {
    const realm = fresh();
    expect(
        run(new MeasuredEvaluator(realm), source),
        s(source === "typeof (false && x);" ? "boolean" : "undefined"),
        "B1 B2 B19",
    );
    check(!realm.global.bindings.has("x"), "no missing binding created");
}
for (const mode of ["OuterBinding", "ShadowTDZ", "ShadowValue", "UndefinedShadow", "Initialized"]) {
    const realm = fresh();
    const e = new MeasuredEvaluator(realm);
    bind(realm.global, "x", n(7));
    const inner = new Environment(realm.global);
    if (mode === "ShadowTDZ") {
        bind(inner, "x", U, false);
    }
    if (mode === "ShadowValue") {
        bind(inner, "x", b(false));
    }
    if (mode === "Initialized") {
        bind(inner, "x", U);
    }
    if (mode === "UndefinedShadow") {
        bind(inner, "undefined", n(7));
    }
    for (const op of ["typeof", "void"]) {
        const result = run(e, op + (mode === "UndefinedShadow" ? " undefined;" : " x;"), inner);
        if (mode === "ShadowTDZ") {
            error(result, "x is not initialized", op === "typeof" ? 8 : 6, "B9 ShadowTDZ");
        } else {
            expect(
                result,
                op === "void"
                    ? U
                    : s(
                          mode === "ShadowValue"
                              ? "boolean"
                              : mode === "Initialized"
                                ? "undefined"
                                : "number",
                      ),
                "B7-B10/B13 " + mode,
            );
        }
    }
    check(sameValue(realm.global.bindings.get("x")!.value, n(7)), "outer unchanged");
}
for (const source of [
    "let x=7; { let t=typeof x; if(t !== 'number' || void x !== undefined) { throw 1; } }",
    "let x=7; { let x=false; if(typeof x !== 'boolean' || void x !== undefined) { throw 1; } }",
    "let x; if(typeof x !== 'undefined' || void x !== undefined) { throw 1; }",
]) {
    expect(program(new Evaluator(fresh()), source), U, "B7 B8 B10 source");
}
for (const op of ["typeof", "void"]) {
    const result = program(new Evaluator(fresh()), "let x=7; { " + op + " x; let x; }");
    error(result, "x is not initialized", op === "typeof" ? 19 : 17, "B9 source shadow");
}
{
    const realm = fresh();
    const e = new Evaluator(realm);
    expect(program(e, "let t = typeof f; function f() {}"), U, "B11 HoistedFunction");
    check(sameValue(realm.global.bindings.get("t")!.value, s("function")), "B11 value");
    expect(program(e, "function parameter(x) { return typeof x; }"), U, "B12 Parameter setup");
    expect(run(e, "parameter();"), s("undefined"), "B12 omitted");
    expect(run(e, "parameter(null);"), s("object"), "B12 null");
    expect(run(e, "parameter(7);"), s("number"), "B12 number");
}

// E1-E12: capture and GetValue ordering, with literal traces for each scenario.
for (const op of ["typeof", "void"]) {
    const column = op === "typeof" ? 8 : 6;
    const scenarios = [
        "ReadOrder",
        "PrimitiveString",
        "PrimitiveNumber",
        "PrimitiveSymbol",
        "BaseAbrupt",
        "KeyAbrupt",
        "ConversionAbrupt",
        "ReadAbrupt",
        "CapturedBase",
        "KeyMutation",
        "CapturedKey",
        "NullBase",
        "UndefinedBase",
        "BooleanBase",
        "NumberBase",
        "StringBase",
        "SymbolBase",
        "InvalidHook",
        "ObjectHookResult",
    ];
    const traces = [
        "BKCG",
        "BKG",
        "BKG",
        "BKG",
        "B",
        "BK",
        "BKC",
        "BKCG",
        "BKCG",
        "BKCG",
        "BKCG",
        "BK",
        "BK",
        "BK",
        "BK",
        "BK",
        "BK",
        "BK",
        "BKC",
    ];
    for (let index = 0; index < scenarios.length; index++) {
        const name = scenarios[index];
        const realm = fresh();
        const e = new MeasuredEvaluator(realm);
        const target = new Observed();
        target.expectedReceiver = target;
        put(target, "x", n(7));
        const replacement = new Observed();
        const key = realm.createObject();
        const symbol = new GuestSymbol("x");
        put(target, "1", n(7));
        put(target, symbol, n(7));
        const sentinel = failure("ReferenceError", "sentinel", { line: 7, column: 9 });
        sentinel.value = n(91);
        let trace = "";
        let base: Value = o(target);
        let capturedKey: Value = o(key);
        const invalidBase =
            name === "NullBase" ||
            name === "UndefinedBase" ||
            name === "BooleanBase" ||
            name === "NumberBase" ||
            name === "StringBase" ||
            name === "SymbolBase";
        if (name === "NullBase") {
            base = { kind: "null" };
        }
        if (name === "UndefinedBase") {
            base = U;
        }
        if (name === "BooleanBase") {
            base = b(true);
        }
        if (name === "NumberBase") {
            base = n(7);
        }
        if (name === "StringBase") {
            base = s("x");
        }
        if (name === "SymbolBase") {
            base = { kind: "symbol", value: symbol };
        }
        if (name === "PrimitiveString") {
            capturedKey = s("x");
        }
        if (name === "PrimitiveNumber") {
            capturedKey = n(1);
        }
        if (name === "PrimitiveSymbol") {
            capturedKey = { kind: "symbol", value: symbol };
        }
        put(
            key,
            wellKnownToPrimitive,
            name === "InvalidHook"
                ? n(7)
                : fn(realm, (receiver, args, _context, _loc) => {
                      trace += "C";
                      check(
                          receiver.kind === "object" &&
                              receiver.object === key &&
                              args.length === 1 &&
                              sameValue(args[0], s("string")),
                          name + " hook receiver/hint",
                      );
                      if (name === "ConversionAbrupt") {
                          return sentinel;
                      }
                      if (name === "KeyMutation") {
                          put(target, "x", b(true));
                      }
                      if (name === "CapturedKey") {
                          capturedKey = s("other");
                      }
                      return normal(name === "ObjectHookResult" ? o(key) : s("x"));
                  }),
        );
        if (name === "ReadAbrupt") {
            target.abrupt = sentinel;
        }
        bind(
            realm.global,
            "b",
            fn(realm, (_r, _a, _c, _l) => {
                trace += "B";
                return name === "BaseAbrupt" ? sentinel : normal(base);
            }),
        );
        bind(
            realm.global,
            "k",
            fn(realm, (_r, _a, _c, _l) => {
                trace += "K";
                if (name === "CapturedBase") {
                    base = o(replacement);
                }
                return name === "KeyAbrupt" ? sentinel : normal(capturedKey);
            }),
        );
        const result = run(e, op + " b()[k()];");
        check(trace + target.trace === (invalidBase && base.kind !== "null" && base.kind !== "undefined" ? "BKC" : traces[index]), name + " trace");
        if (
            name === "BaseAbrupt" ||
            name === "KeyAbrupt" ||
            name === "ConversionAbrupt" ||
            name === "ReadAbrupt"
        ) {
            check(
                result === sentinel && result.value === sentinel.value,
                "B20/E3-E6 identical throw " + name,
            );
        } else if (invalidBase && base.kind !== "null" && base.kind !== "undefined") {
            expect(result, op === "void" ? U : s("undefined"), "E10 " + name);
            check(target.reads === 0, "E10 no old target read");
        } else if (invalidBase) {
            error(result, "cannot convert null or undefined to object", column, "E10 " + name, "TypeError");
        } else if (name === "InvalidHook") {
            error(result, "symbol toPrimitive method is not callable", column, "E11", "TypeError");
        } else if (name === "ObjectHookResult") {
            error(result, "cannot convert object to primitive", column, "E12", "TypeError");
        } else {
            expect(
                result,
                op === "void" ? U : s(name === "KeyMutation" ? "boolean" : "number"),
                name,
            );
            check(target.reads === 1 && replacement.reads === 0, name + " captured read once");
            check(
                target.lastKey ===
                    (name === "PrimitiveNumber" ? "1" : name === "PrimitiveSymbol" ? symbol : "x"),
                name + " exact key",
            );
        }
        check(e.calls === 0 && e.depth === 0 && e.context.realm === realm, name + " cleanup");
    }
    // E13-E17: ordinary conversion, prototype lookup, discarded results and writes.
    {
        const realm = fresh();
        const e = new Evaluator(realm);
        const target = new Observed();
        const key = realm.createObject();
        let trace = "";
        put(target, "x", n(7));
        bind(realm.global, "o", o(target));
        bind(realm.global, "k", o(key));
        put(
            key,
            "toString",
            fn(realm, (_r, _a, _c, _l) => {
                trace += "T";
                return normal(o(key));
            }),
        );
        put(
            key,
            "valueOf",
            fn(realm, (_r, _a, _c, _l) => {
                trace += "V";
                return normal(s("x"));
            }),
        );
        expect(run(e, op + " o[k];"), op === "void" ? U : s("number"), "E13 OrdinaryFallback");
        check(trace + target.trace === "TVG", "E13 trace");
        for (const proto of [null, realm.createObject()]) {
            const missing = new Observed(proto);
            bind(realm.global, "o", o(missing));
            expect(run(e, op + " o.x;"), op === "void" ? U : s("undefined"), "E14 MissingProperty");
            check(missing.reads === 1, "E14 one Get");
        }
        for (const callable of [false, true]) {
            const proto = realm.createObject();
            put(proto, "x", callable ? fn(realm, (_r, _a, _c, _l) => normal()) : n(7));
            const inherited = new Observed(proto);
            inherited.expectedReceiver = inherited;
            bind(realm.global, "o", o(inherited));
            expect(
                run(e, op + " o.x;"),
                op === "void" ? U : s(callable ? "function" : "number"),
                "E15 InheritedProperty",
            );
            check(inherited.reads === 1, "E15 one Get");
            const poison = new Observed(
                null,
                false,
                callable ? realm.functionPrototype.callable : null,
            );
            poison.hostFault = new Error("no conversion");
            let calls = 0;
            bind(
                realm.global,
                "f",
                fn(realm, (_r, _a, _c, _l) => {
                    calls++;
                    return normal(o(poison));
                }),
            );
            expect(
                run(e, op + " f();"),
                op === "void" ? U : s(callable ? "function" : "object"),
                "E16 ReturnedPoison",
            );
            check(calls === 1 && poison.reads === 0, "E16 no conversions");
        }
        bind(realm.global, "o", o(target));
        expect(
            run(e, op + " (o.x = 9);"),
            op === "void" ? U : s("number"),
            "E17 AssignmentEffects",
        );
        check(
            target.writes === 1 && sameValue(target.getOwnProperty("x")!.value, n(9)),
            "E17 retained single write",
        );
    }
    {
        const realm = fresh();
        const e = new Evaluator(realm);
        expect(program(e, "function f() { throw 9; }"), U, "E18 setup");
        const result = run(e, op + " f();");
        error(result, "guest throw", 16, "E18 UserThrow", "Uncaught");
        check(sameValue(result.value, n(9)), "E18 value");
        error(
            run(e, op + " Number();"),
            "value is not callable",
            column,
            "E19 Noncallable",
            "TypeError",
        );
    }
    // E20-E24 and B20: foreign calls/keys and host faults restore evaluator state.
    for (const route of ["call", "key", "get"]) {
        for (const outcome of ["primitive", "object", "abrupt", "fault"]) {
            const realm = fresh();
            const foreign = fresh();
            const e = new MeasuredEvaluator(realm);
            e.calls = 2;
            e.depth = 4;
            const sentinel = failure("ReferenceError", "foreign sentinel", { line: 9, column: 4 });
            const host = new Error("foreign host sentinel");
            const target = new Observed();
            put(target, "x", n(7));
            const key = foreign.createObject();
            const foreignObject = new Observed();
            foreignObject.hostFault = new Error("no classification read");
            let count = 0;
            const method = fn(foreign, (_receiver, _args, context, _loc): Completion => {
                count++;
                check(context.realm === foreign, "E20 foreign Realm active");
                if (outcome === "fault") {
                    throw host;
                }
                if (outcome === "abrupt") {
                    return sentinel;
                }
                return normal(
                    route === "key" ? s("x") : outcome === "object" ? o(foreignObject) : n(7),
                );
            });
            bind(realm.global, "f", method);
            put(key, wellKnownToPrimitive, method);
            bind(realm.global, "k", o(key));
            bind(realm.global, "o", o(target));
            bind(realm.global, "x", n(7));
            if (route === "get") {
                if (outcome === "fault") {
                    target.hostFault = host;
                }
                if (outcome === "abrupt") {
                    target.abrupt = sentinel;
                }
            }
            let caught = false;
            try {
                const result = run(
                    e,
                    op + (route === "call" ? " f();" : route === "key" ? " o[k];" : " o.x;"),
                );
                if (outcome === "abrupt") {
                    check(result === sentinel, "E21/B20 original abrupt");
                } else {
                    expect(
                        result,
                        op === "void"
                            ? U
                            : s(route === "call" && outcome === "object" ? "object" : "number"),
                        "E20 ForeignSuccess",
                    );
                }
            } catch (fault) {
                if (fault instanceof Error) {
                    check(fault === host, "E22 E23 host identity");
                    caught = true;
                } else {
                    throw fault;
                }
            }
            check(caught === (outcome === "fault"), "E22 expected host escape");
            check(
                count === (route === "get" ? 0 : 1) && foreignObject.reads === 0,
                "E20 calls/no conversion",
            );
            check(e.calls === 2 && e.depth === 4 && e.context.realm === realm, "E20-E23 cleanup");
            const steps = e.steps;
            expect(run(e, "typeof x;"), s("number"), "E24 ContinuedEvaluator");
            check(e.steps === steps + 3, "E24 monotonic steps");
        }
    }
}

// P1-P12: grammar grouping is checked independently of evaluation.
const parserSources = [
    "typeof o.x;",
    "void o.x;",
    "typeof f();",
    "void f();",
    "typeof x + 'x';",
    "void x * 2;",
    "typeof x === 'number';",
    "void x == null;",
    "typeof x ? 1 : 2;",
    "typeof void x;",
    "void typeof x;",
    "typeof typeof x;",
    "!typeof x;",
    "typeof !x;",
    "typeof -x;",
    "+void x;",
    "delete typeof x;",
    "delete void x;",
    "typeof delete o.x;",
    "void delete o.x;",
];
const parserValues: Value[] = [
    s("number"),
    U,
    s("number"),
    U,
    s("numberx"),
    n(NaN),
    b(true),
    b(true),
    n(1),
    s("undefined"),
    U,
    s("string"),
    b(false),
    s("boolean"),
    s("number"),
    n(NaN),
    b(true),
    b(true),
    s("boolean"),
    U,
];
const parserNames = [
    "P1 MemberPrecedence",
    "P1 VoidMember",
    "P2 CallPrecedence",
    "P2 VoidCall",
    "P3 AddPrecedence",
    "P4 MultiplyPrecedence",
    "P5 StrictComparison",
    "P6 LooseComparison",
    "P7 Conditional",
    "P8 RightAssociative",
    "P8 VoidTypeof",
    "P8 TypeofTypeof",
    "P9 NotTypeof",
    "P9 TypeofNot",
    "P9 TypeofMinus",
    "P9 PlusVoid",
    "P10 DeleteTypeof",
    "P10 DeleteVoid",
    "P12 TypeofDelete",
    "P12 VoidDelete",
];
for (let i = 0; i < parserSources.length; i++) {
    const realm = fresh();
    const e = new Evaluator(realm);
    bind(realm.global, "x", n(7));
    const target = realm.createObject();
    put(target, "x", n(7));
    bind(realm.global, "o", o(target));
    bind(
        realm.global,
        "f",
        fn(realm, (_r, _a, _c, _l) => normal(n(7))),
    );
    const ast = expression(parserSources[i]);
    const name = parserNames[i];
    if (name.startsWith("P1 ") || name.startsWith("P2 ")) {
        check(
            ast.kind === "unary" &&
                ast.operand.kind === (name.startsWith("P1 ") ? "member" : "call"),
            parserNames[i] + " AST",
        );
    } else if (
        name.startsWith("P3 ") ||
        name.startsWith("P4 ") ||
        name.startsWith("P5 ") ||
        name.startsWith("P6 ")
    ) {
        check(ast.kind === "binary" && ast.left.kind === "unary", parserNames[i] + " AST");
    } else if (name.startsWith("P7 ")) {
        check(ast.kind === "conditional" && ast.test.kind === "unary", parserNames[i] + " AST");
    } else {
        check(ast.kind === "unary" && ast.operand.kind === "unary", parserNames[i] + " AST");
    }
    expect(run(e, parserSources[i]), parserValues[i], parserNames[i]);
    check(sameValue(realm.global.bindings.get("x")!.value, n(7)), "P10 binding unchanged");
    if (name.startsWith("P12 ")) {
        check(target.getOwnProperty("x") === undefined, "P12 property removed");
    }
}
{
    const e = new Evaluator(fresh());
    expect(run(e, "delete typeof x;"), b(true), "P11 DeleteMissing");
    error(run(e, "delete void x;"), "x is not defined", 13, "P11 VoidMissing");
}
const invalidSources = [
    "typeof delete x;",
    "void delete x;",
    "typeof x = 1;",
    "void x = 1;",
    "typeof;",
    "void;",
    "let typeof = 1;",
    "let void = 1;",
    "throw\n typeof x;",
    "typeof super.x;",
    "void super.x;",
    "typeof (x, 1);",
    "void (x, 1);",
    "typeof " + "(".repeat(126) + "1" + ")".repeat(126) + ";",
    "void " + "(".repeat(126) + "1" + ")".repeat(126) + ";",
    "effect(); typeof;",
];
const invalidMessages = [
    "delete of an identifier is not allowed",
    "delete of an identifier is not allowed",
    "invalid assignment target",
    "invalid assignment target",
    "unsupported or unexpected syntax: ;",
    "unsupported or unexpected syntax: ;",
    "expected binding identifier",
    "expected binding identifier",
    "newline after return/throw is unsupported",
    "unsupported or unexpected syntax: super",
    "unsupported or unexpected syntax: super",
    "expected ')', found ','",
    "expected ')', found ','",
    "syntax nesting limit exceeded",
    "syntax nesting limit exceeded",
    "unsupported or unexpected syntax: ;",
];
const invalidColumns = [8, 6, 1, 1, 7, 5, 5, 5, 1, 8, 6, 10, 8, 134, 132, 17];
const invalidNames = [
    "P13 DeleteIdentifier",
    "P13 VoidDeleteIdentifier",
    "P14 InvalidAssignment",
    "P14 VoidAssignment",
    "P15 MissingOperand",
    "P15 VoidMissingOperand",
    "P16 ReservedBindings",
    "P16 VoidBinding",
    "P20 ThrowNewline",
    "P21 UnsupportedSuper",
    "P21 VoidSuper",
    "P22 UnsupportedComma",
    "P22 VoidComma",
    "P25 ParseDepth",
    "P26 VoidParseDepth",
    "C8 NoSideEffectsOnParseFailure",
];
for (let i = 0; i < invalidSources.length; i++) {
    const parsed = parse(invalidSources[i]);
    check(
        parsed.error !== null &&
            parsed.error.phase === "parse" &&
            parsed.error.name === "SyntaxError" &&
            parsed.error.message === invalidMessages[i] &&
            parsed.error.loc.line === 1 &&
            parsed.error.loc.column === invalidColumns[i],
        invalidNames[i],
    );
}
{
    const realm = fresh();
    const e = new Evaluator(realm);
    expect(
        program(e, "let typeofx = 7; let voidx = 8; let o = {typeof: 7, void: 8};"),
        U,
        "P17 IdentifierPrefixes P18 PropertyWords",
    );
    for (const source of ["typeofx;", "o.typeof;"]) {
        expect(run(e, source), n(7), "P17 P18 seven");
    }
    for (const source of ["voidx;", "o.void;"]) {
        expect(run(e, source), n(8), "P17 P18 eight");
    }
    bind(realm.global, "x", n(7));
    for (const op of ["typeof", "void"]) {
        for (const term of ["\n", "\r", "\r\n", "\u2028", "\u2029"]) {
            const source = op + term + "x;";
            const ast = expression(source);
            check(
                ast.kind === "unary" && ast.operand.loc.line === 2 && ast.operand.loc.column === 1,
                "P19 LineTerminators location",
            );
            expect(run(e, source), op === "typeof" ? s("number") : U, "P19 LineTerminators");
            expect(
                run(e, op + " /*" + term + "*/ x;"),
                op === "typeof" ? s("number") : U,
                "P19 CommentLineTerminators",
            );
        }
    }
    const declaration = "function f() { /*keep*/ return typeof void 0; }";
    expect(program(e, declaration), U, "P23 SourceRetention setup");
    expect(run(e, "typeof f;"), s("function"), "C4 classification preserves source");
    expect(run(e, "f.toString();"), s(declaration), "P23 SourceRetention");
    const anonymous = run(e, "(function() { return void 0; });");
    check(anonymous.type === "normal", "P24 AnonymousRetention setup");
    bind(realm.global, "anonymous", anonymous.value);
    expect(
        run(e, "anonymous.toString();"),
        s("function() { return void 0; }"),
        "P24 AnonymousRetention",
    );
    expect(program(e, "let saved=f.toString;"), U, "C4 saved method");
    expect(run(e, "saved.call(f);"), s(declaration), "C4 saved declaration");
    expect(
        run(e, "saved.call(anonymous);"),
        s("function() { return void 0; }"),
        "C4 saved anonymous",
    );
}

// R1-R18/R24: fixed ticks, guard priority, and optional-mode forwarding.
for (const op of ["typeof", "void"]) {
    const column = op === "typeof" ? 8 : 6;
    for (const state of ["initialized", "missing", "TDZ"]) {
        for (const parentheses of [false, true]) {
            const realm = fresh();
            const e = new MeasuredEvaluator(realm);
            if (state !== "missing") {
                bind(realm.global, "x", n(7), state !== "TDZ");
            }
            const result = run(e, op + (parentheses ? " (((x)));" : " x;"));
            if (state === "TDZ" || (state === "missing" && op === "void")) {
                error(
                    result,
                    "x is " + (state === "TDZ" ? "not initialized" : "not defined"),
                    column + (parentheses ? 3 : 0),
                    "R2 MissingAndTDZ",
                );
            } else {
                expect(
                    result,
                    op === "void" ? U : s(state === "missing" ? "undefined" : "number"),
                    "R1 DirectValue/R3 Parentheses",
                );
            }
            check(
                e.steps === 3 && e.peakDepth === 3 && e.calls === 0 && e.depth === 0,
                "R1-R3 exact resources",
            );
        }
        for (const limit of [0, 1, 2, 3]) {
            const realm = fresh();
            const e = new MeasuredEvaluator(realm, limit);
            if (state !== "missing") {
                bind(realm.global, "x", n(7), state !== "TDZ");
            }
            const result = run(e, op + " x;");
            if (limit < 3) {
                error(
                    result,
                    "execution step limit exceeded",
                    limit === 2 ? column : 1,
                    "R4 StatementLimit/R5 UnaryLimit/R6 OperandLimit",
                    "RangeError",
                );
                check(e.steps === limit + 1, "R4-R6 failing tick");
            } else {
                check(e.steps === 3, "R7 ExactSuccess ticks");
            }
            check(e.depth === 0 && e.calls === 0, "R4-R7 cleanup");
        }
    }
    for (const seed of [255, 256]) {
        for (const maxSteps of [1, 100]) {
            const realm = fresh();
            const e = new MeasuredEvaluator(realm, maxSteps);
            e.depth = seed;
            const result = e.evaluate(expression(op + " x;"), realm.global, U);
            error(
                result,
                seed === 255 && maxSteps === 1
                    ? "execution step limit exceeded"
                    : "evaluation nesting limit exceeded",
                seed === 256 ? 1 : column,
                "R16 UnaryFrameBoundary/R17 IdentifierFrameBoundary/R18 GuardPriority",
                "RangeError",
            );
            check(
                e.steps === (seed === 256 ? 1 : 2) && e.depth === seed && e.calls === 0,
                "R16-R18 restored seeded depth",
            );
            e.depth = 0;
            e.maxSteps = 100;
            bind(realm.global, "x", n(7));
            expect(run(e, "typeof x;"), s("number"), "frame cleanup reuse");
        }
    }
    const realm = fresh();
    const e = new MeasuredEvaluator(realm, 5);
    bind(realm.global, "x", n(7));
    expect(run(e, op + " x;"), op === "void" ? U : s("number"), "R24 first");
    error(
        run(e, op + " x;"),
        "execution step limit exceeded",
        column,
        "R24 MonotonicReuse",
        "RangeError",
    );
    check(e.steps === 6 && e.calls === 0 && e.depth === 0, "R24 resources");
    for (const mode of [
        "primitive",
        "canonical",
        "ordinaryOne",
        "ordinaryTwo",
        "stepGuard",
        "callGuard",
        "invalidBase",
        "directCall",
        "nestedUnary",
    ]) {
        const r = fresh();
        const measured = new MeasuredEvaluator(
            r,
            mode === "stepGuard" || mode === "invalidBase" ? 5 : 100,
            mode === "callGuard" ? 0 : 64,
        );
        const target = new Observed();
        put(target, "x", n(7));
        const key = r.createObject();
        bind(r.global, "o", o(target));
        bind(r.global, "k", mode === "primitive" ? s("x") : o(key));
        put(
            key,
            wellKnownToPrimitive,
            fn(r, (_r, _a, _c, _l) => normal(s("x"))),
        );
        if (mode === "ordinaryOne" || mode === "ordinaryTwo") {
            key.internalDelete(wellKnownToPrimitive);
            put(
                key,
                "toString",
                fn(r, (_r, _a, _c, _l) => normal(mode === "ordinaryTwo" ? o(key) : s("x"))),
            );
            put(
                key,
                "valueOf",
                fn(r, (_r, _a, _c, _l) => normal(s("x"))),
            );
        }
        bind(
            r.global,
            "f",
            fn(r, (_r, _a, _c, _l) => normal(n(7))),
        );
        const source =
            op +
            (mode === "invalidBase"
                ? " null[k];"
                : mode === "directCall"
                  ? " f();"
                  : mode === "nestedUnary"
                    ? op === "typeof"
                        ? " void 0;"
                        : " typeof 0;"
                    : " o[k];");
        const result = run(measured, source);
        const ticks =
            mode === "primitive" || mode === "invalidBase"
                ? 5
                : mode === "ordinaryOne"
                  ? 7
                  : mode === "ordinaryTwo"
                    ? 8
                    : mode === "directCall"
                      ? 3
                      : mode === "nestedUnary"
                        ? 4
                        : 6;
        const calls =
            mode === "ordinaryTwo"
                ? 2
                : mode === "canonical" || mode === "ordinaryOne" || mode === "directCall"
                  ? 1
                  : 0;
        check(
            measured.steps === ticks &&
                measured.invocations === calls &&
                measured.depth === 0 &&
                measured.calls === 0,
            "R8-R15 " + mode + " resources",
        );
        if (mode === "stepGuard" || mode === "callGuard") {
            error(
                result,
                mode === "stepGuard"
                    ? "execution step limit exceeded"
                    : "call depth limit exceeded",
                column,
                "R11 KeyGuard/R12 CallGuard",
                "RangeError",
            );
            check(target.reads === 0, "guard no Get");
        } else if (mode === "invalidBase") {
            error(
                result,
                "cannot convert null or undefined to object",
                column,
                "R13 InvalidBase",
                "TypeError",
            );
            check(target.reads === 0, "invalid no Get");
        } else {
            expect(
                result,
                op === "void" ? U : s(mode === "nestedUnary" ? "undefined" : "number"),
                "R8-R15 " + mode,
            );
        }
        if (
            mode === "primitive" ||
            mode === "canonical" ||
            mode === "ordinaryOne" ||
            mode === "ordinaryTwo"
        ) {
            check(target.reads === 1, "R8-R10 one target Get");
        }
        if (mode === "primitive" || mode === "nestedUnary") {
            check(measured.peakDepth === 4, "R8/R15 max depth4");
        }
        if (mode === "directCall") {
            check(measured.peakDepth === 3, "R14 max depth3");
        }
    }
}

// R19-R23: actual default64, host/guest recursion and foreign defining Realms.
for (const op of ["typeof", "void"]) {
    for (const foreign of [false, true]) {
        for (const guest of [false, true]) {
            for (const limit of guest ? [2, 64] : [0, 1, 2, 64]) {
                for (const stepGuard of guest && limit === 2 ? [false, true] : [false]) {
                    const realm = fresh();
                    const owner = foreign ? fresh() : realm;
                    const e =
                        limit === 64
                            ? new MeasuredEvaluator(realm)
                            : new MeasuredEvaluator(realm, stepGuard ? 17 : 100000, limit);
                    const target = new Observed();
                    const key = owner.createObject();
                    bind(realm.global, "o", o(target));
                    bind(realm.global, "k", o(key));
                    bind(owner.global, "o", o(target));
                    bind(owner.global, "k", o(key));
                    const ast = expression(op + " o[k];");
                    let hostCalls = 0;
                    if (guest) {
                        const setup = new Evaluator(owner);
                        expect(
                            program(setup, "function h() { return " + op + " o[k]; }"),
                            U,
                            "R21 GuestRecursiveKey setup",
                        );
                        put(key, wellKnownToPrimitive, owner.global.bindings.get("h")!.value);
                    } else {
                        put(
                            key,
                            wellKnownToPrimitive,
                            fn(owner, (_receiver, _args, context, _loc) => {
                                hostCalls++;
                                check(context.realm === owner, "R19 foreign hook Realm");
                                return e.evaluate(ast, owner.global, U);
                            }),
                        );
                    }
                    const result = run(e, op + " o[k];");
                    error(
                        result,
                        stepGuard ? "execution step limit exceeded" : "call depth limit exceeded",
                        guest ? (op === "typeof" ? 30 : 28) : op === "typeof" ? 8 : 6,
                        "R19-R23 recursion",
                        "RangeError",
                    );
                    const ticks = guest
                        ? limit === 64
                            ? 390
                            : 18
                        : limit === 64
                          ? 326
                          : limit === 2
                            ? 16
                            : limit === 1
                              ? 11
                              : 6;
                    check(
                        e.steps === ticks &&
                            e.invocations === limit &&
                            target.reads === 0 &&
                            (guest || hostCalls === limit),
                        "R19-R23 exact recurrence",
                    );
                    check(
                        e.calls === 0 && e.depth === 0 && e.context.realm === realm,
                        "R19-R23 cleanup",
                    );
                    e.maxSteps = 100000;
                    bind(realm.global, "x", n(7));
                    expect(run(e, "typeof x;"), s("number"), "R19-R23 reuse");
                    check(e.steps === ticks + 3, "R19-R23 monotonic");
                }
            }
        }
    }
}

// C1-C3: source is read at runtime in each executable, with literal guest oracles.
{
    const realm = fresh();
    const e = new Evaluator(realm);
    const foreign = fresh();
    expect(
        program(e, readFileSync("test/fixtures/typeof-void-basic.js", "utf8")),
        U,
        "C1 BasicFixture/C2 OneEffect",
    );
    const poison = new Observed();
    poison.hostFault = new Error("poison lookup");
    const callablePoison = new Observed(null, false, foreign.functionPrototype.callable);
    callablePoison.hostFault = new Error("callable poison lookup");
    bind(realm.global, "symbol", { kind: "symbol", value: new GuestSymbol("fixture") });
    bind(realm.global, "box", o(realm.createSymbolObject(new GuestSymbol("fixture"))));
    bind(
        realm.global,
        "foreign",
        fn(foreign, (_r, _a, _c, _l): Completion => {
            throw new Error("must not call");
        }),
    );
    bind(realm.global, "poison", o(poison));
    bind(realm.global, "callablePoison", o(callablePoison));
    expect(
        program(e, readFileSync("test/fixtures/typeof-void-injected.js", "utf8")),
        U,
        "C3 InjectedFixture",
    );
    check(
        poison.reads === 0 && callablePoison.reads === 0 && e.context.realm === realm,
        "C3 no poison hooks",
    );
}
// C8: exercise the real parse-before-execute entry point with an observable effect.
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
    const result = interpret("effect(); typeof;", realm);
    check(
        result.phase === "parse" && result.diagnostic.loc.column === 17 && effects === 0,
        "C8 no execution on parse failure",
    );
}
console.log("typeof-void ok");
