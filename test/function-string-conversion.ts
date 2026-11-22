import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { Realm } from "../src/realm.js";
import { parse } from "../src/parser.js";
import { lex } from "../src/lexer.js";
import {
    GuestObject,
    UNDEFINED,
    normal,
    failure,
    sameValue,
    type Value,
    type ValueCompletion,
    type PropertyKey,
    type Builtin,
    type OperationContext,
} from "../src/runtime.js";
import { GuestSymbol, wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import { toPrimitive } from "../src/primitive-conversion.js";
import { toNumber, toString, toLength, toPropertyKey } from "../src/conversion.js";
import type { Location, FunctionSource, Stmt } from "../src/syntax.js";

const loc: Location = { line: 77, column: 9 };
function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error("Function conversion " + label);
    }
}
function obj(object: GuestObject): Value {
    return { kind: "object", object };
}
function str(value: string): Value {
    return { kind: "string", value };
}
function num(value: number): Value {
    return { kind: "number", value };
}
function object(value: Value): GuestObject {
    if (value.kind !== "object") {
        throw new Error("expected object");
    }
    return value.object;
}
function result(completion: ValueCompletion): Value {
    if (completion.type !== "normal") {
        throw new Error(completion.diagnostic.message);
    }
    return completion.value;
}
function expect(completion: ValueCompletion, expected: Value, label: string): void {
    check(completion.type === "normal" && sameValue(completion.value, expected), label);
}
function error(completion: ValueCompletion, message: string, name: string = "TypeError"): void {
    check(
        completion.type === "throw" &&
            completion.diagnostic.phase === "runtime" &&
            completion.diagnostic.name === name &&
            completion.diagnostic.message === message &&
            completion.diagnostic.loc.line === 77 &&
            completion.diagnostic.loc.column === 9 &&
            sameValue(completion.value, str(name + ": " + message)),
        "exact " + message,
    );
}
function put(target: GuestObject, key: PropertyKey, value: Value): void {
    target.bootstrapDefine(key, { value, writable: true, enumerable: true, configurable: true });
}
function binding(realm: Realm, name: string): Value {
    const slot = realm.global.bindings.get(name);
    if (slot === undefined || !slot.initialized) {
        throw new Error("missing " + name);
    }
    return slot.value;
}
function run(realm: Realm, input: string): Stmt[] {
    const parsed = parse(input);
    check(parsed.error === null, "parse success");
    check(
        new Evaluator(realm).block(parsed.body, realm.global, UNDEFINED).type === "normal",
        "execution success",
    );
    return parsed.body;
}
function source(value: Value): FunctionSource {
    const callable = object(value).callable;
    if (callable === null || callable.kind !== "guest" || callable.source === null) {
        throw new Error("missing parsed source");
    }
    return callable.source;
}
const a = new Realm((_line) => {});
const b = new Realm((_line) => {});
const c = new Realm((_line) => {});
const active = new Evaluator(c);
const T = a.functionPrototype.get("toString", active.context, loc);
function text(value: Value, expected: string, label: string): void {
    expect(active.call(T, value, [], loc), str(expected), label);
    check(active.calls === 0 && active.context.realm === c, label + " cleanup");
}
function hook(realm: Realm, body: Builtin): Value {
    return obj(realm.createBuiltin("hook", 0, body));
}

// Independent literal ledger from accepted S1-S9; never derived from parser output.
const sourceRows: { id: string; input: string; ranges: [number, number, string][] }[] = [
    {
        id: "S1",
        input: "/*lead*/ function /*a*/ f ( x ) { /*b*/ return x; } /*tail*/",
        ranges: [[9, 51, "function /*a*/ f ( x ) { /*b*/ return x; }"]],
    },
    {
        id: "S2",
        input: "let f = (function /*a*/ (x) {return x;}) /*tail*/;",
        ranges: [[9, 39, "function /*a*/ (x) {return x;}"]],
    },
    {
        id: "S3",
        input: "//lead\r\nfunction f() {\r\n//keep\r\n}\r\n",
        ranges: [[8, 33, "function f() {\r\n//keep\r\n}"]],
    },
    {
        id: "S4",
        input: "function outer() { function inner() { return 1; } return inner; }",
        ranges: [
            [0, 65, "function outer() { function inner() { return 1; } return inner; }"],
            [19, 49, "function inner() { return 1; }"],
        ],
    },
    {
        id: "S5",
        input: "let f=function(){return 'a\\n\\t\\\\b';};",
        ranges: [[6, 36, "function(){return 'a\\n\\t\\\\b';}"]],
    },
    {
        id: "S6",
        input: "/*😀*/let f=function(){return '😀\ud800x\udc00\u0000';};",
        ranges: [[12, 40, "function(){return '😀\ud800x\udc00\u0000';}"]],
    },
    {
        id: "S7",
        input: "function f(){/*  */return 1;}",
        ranges: [[0, 29, "function f(){/*  */return 1;}"]],
    },
    {
        id: "S8",
        input: "function f(){/* } function */return '}';} //tail",
        ranges: [[0, 41, "function f(){/* } function */return '}';}"]],
    },
    {
        id: "S9",
        input: "function a(){} /*gap*/ function b(){}",
        ranges: [
            [0, 14, "function a(){}"],
            [23, 37, "function b(){}"],
        ],
    },
];
for (const row of sourceRows) {
    const realm = new Realm((_line) => {});
    const ast = run(realm, row.input);
    const values: Value[] = [];
    if (row.id === "S4") {
        const outer = binding(realm, "outer");
        values.push(outer, result(active.call(outer, UNDEFINED, [], loc)));
    } else if (row.id === "S9") {
        values.push(binding(realm, "a"), binding(realm, "b"));
    } else {
        values.push(binding(realm, "f"));
    }
    for (let i = 0; i < values.length; i++) {
        const retained = source(values[i]);
        const expected = row.ranges[i];
        check(
            retained.start === expected[0] && retained.end === expected[1],
            row.id + " fixed offsets",
        );
        check(
            retained.source.text === row.input && retained.source === source(values[0]).source,
            row.id + " shared source",
        );
        text(values[i], expected[2], row.id);
    }
    const first = ast[0];
    let astSource: FunctionSource | null;
    if (first.kind === "function") {
        astSource = first.source;
    } else if (first.kind === "let" && first.init !== null && first.init.kind === "function") {
        astSource = first.init.source;
    } else {
        astSource = null;
    }
    check(astSource === source(values[0]), row.id + " AST range propagated unchanged");
    const tokens = lex(row.input);
    const eof = tokens.tokens[tokens.tokens.length - 1];
    check(eof.start === row.input.length && eof.end === row.input.length, row.id + " EOF offsets");
    if (row.id === "S3") {
        check(first.loc.line === 2 && first.loc.column === 1, "S3 function location");
        const close = tokens.tokens[tokens.tokens.length - 2];
        check(close.loc.line === 4 && close.loc.column === 1, "S3 closing location");
    }
    if (row.id === "S7") {
        const returned = tokens.tokens[5];
        check(returned.text === "return" && returned.loc.line === 3, "S7 separator locations");
    }
    if (row.id === "S5") {
        const literal = tokens.tokens[8];
        check(
            literal.kind === "string" &&
                literal.text === "a\n\t\\b" &&
                literal.start === 24 &&
                literal.end === 34,
            "S5 decoded token independent of raw range",
        );
    }
}
// S10-S14: distinct environments share only the immutable range from their AST.
function retainedOuter(): Value {
    const realm = new Realm((_line) => {});
    run(realm, "function outer() { function inner() { return 1; } return inner; }");
    return binding(realm, "outer");
}
const outer = retainedOuter();
const inner1 = result(active.call(outer, UNDEFINED, [], loc));
const inner2 = result(active.call(outer, UNDEFINED, [], loc));
check(
    object(inner1) !== object(inner2) && source(inner1) === source(inner2),
    "S10 distinct functions same range",
);
const call1 = object(inner1).callable;
const call2 = object(inner2).callable;
check(
    call1 !== null &&
        call2 !== null &&
        call1.kind === "guest" &&
        call2.kind === "guest" &&
        call1.environment !== call2.environment,
    "S10 distinct environments",
);
for (const inner of [inner1, inner2]) {
    text(inner, "function inner() { return 1; }", "S10");
    expect(active.call(inner, UNDEFINED, [], loc), num(1), "S10 call");
}
const againA = new Realm((_line) => {});
const againB = new Realm((_line) => {});
const astA = run(againA, sourceRows[0].input);
const astB = run(againB, sourceRows[0].input);
const fA = binding(againA, "f");
const fB = binding(againB, "f");
check(
    astA[0] !== astB[0] && object(fA) !== object(fB) && source(fA).source !== source(fB).source,
    "S11 fresh parse records",
);
text(fA, "function /*a*/ f ( x ) { /*b*/ return x; }", "S11 old");
text(fB, "function /*a*/ f ( x ) { /*b*/ return x; }", "S11 new");
const oldRealm = new Realm((_line) => {});
const newRealm = new Realm((_line) => {});
run(oldRealm, "function f(){return 1;}");
const old = binding(oldRealm, "f");
run(newRealm, "function f(){return 2;}");
const fresh = binding(newRealm, "f");
text(old, "function f(){return 1;}", "S12 old");
text(fresh, "function f(){return 2;}", "S12 new");
expect(active.call(old, UNDEFINED, [], loc), num(1), "S12 call old");
expect(active.call(fresh, UNDEFINED, [], loc), num(2), "S12 call new");
function retainedInner(): Value {
    return result(active.call(retainedOuter(), UNDEFINED, [], loc));
}
const orphan = retainedInner();
const laterOuter = retainedOuter();
run(new Realm((_line) => {}), "function unrelated(){}");
text(orphan, "function inner() { return 1; }", "S13 retained inner");
text(
    result(active.call(laterOuter, UNDEFINED, [], loc)),
    "function inner() { return 1; }",
    "S14 later allocation",
);
const hoisted = new Realm((_line) => {});
run(hoisted, "let before = f.toString(); function f(){}");
check(sameValue(binding(hoisted, "before"), str("function f(){}")), "S15 hoisted source");
text(
    obj(a.createGuestFunction([], [], a.global, null)),
    "function () { [native code] }",
    "S16 host source-less",
);
const limit = new Realm((_line) => {});
run(limit, "function f(){}" + " ".repeat(99986));
const limited = binding(limit, "f");
check(
    source(limited).start === 0 &&
        source(limited).end === 14 &&
        source(limited).source.text.length === 100000,
    "S17 range",
);
text(limited, "function f(){}", "S17 accepted limit");
const negatives: { input: string; message: string; column: number }[] = [
    { input: " ".repeat(100001), message: "source exceeds 100000 UTF-16 units", column: 1 },
    { input: "function f(){", message: "expected '}', found '<eof>'", column: 14 },
    { input: "let f = function named() {};", message: "expected '(', found 'named'", column: 18 },
    { input: "let f = () => 1;", message: "unsupported operator: =>", column: 12 },
    {
        input: "let f = function(){return '\\u0061';};",
        message: "unsupported string escape",
        column: 27,
    },
    { input: "function* f(){}", message: "expected binding identifier", column: 9 },
    { input: "class C {}", message: "unsupported or unexpected syntax: class", column: 1 },
];
for (const row of negatives) {
    const parsed = parse(row.input);
    check(
        parsed.error !== null &&
            parsed.error.phase === "parse" &&
            parsed.error.name === "SyntaxError" &&
            parsed.error.message === row.message &&
            parsed.error.loc.line === 1 &&
            parsed.error.loc.column === row.column,
        "S17-S19 exact parse negative " + row.message,
    );
}

// F1-F8: installation and immutable internal names are independent of descriptors.
for (const realm of [a, b]) {
    const descriptor = realm.functionPrototype.getOwnProperty("toString");
    check(
        descriptor !== undefined &&
            descriptor.kind === "data" &&
            descriptor.writable &&
            !descriptor.enumerable &&
            descriptor.configurable,
        "F1 method descriptor",
    );
    const method = object(realm.functionPrototype.get("toString", active.context, loc));
    check(
        method.getPrototypeOf() === realm.functionPrototype &&
            method.callable !== null &&
            method.callable.realm === realm,
        "F1 ownership",
    );
    for (const key of ["name", "length"]) {
        const metadata = method.getOwnProperty(key);
        check(
            metadata !== undefined &&
                metadata.kind === "data" &&
                !metadata.writable &&
                !metadata.enumerable &&
                metadata.configurable &&
                sameValue(metadata.value, key === "name" ? str("toString") : num(0)),
            "F1 metadata",
        );
    }
    const keys = realm.functionPrototype.ownPropertyKeys();
    check(
        keys.length === 5 &&
            keys[0] === "length" &&
            keys[1] === "name" &&
            keys[2] === "call" &&
            keys[3] === "apply" &&
            keys[4] === "toString",
        "F2 root keys",
    );
    check(
        !realm.global.bindings.has("Function") &&
            realm.functionPrototype.getOwnProperty("constructor") === undefined,
        "F2 bounded root",
    );
}
check(
    T !== b.functionPrototype.get("toString", active.context, loc) &&
        object(T) !== object(b.functionPrototype.get("toString", active.context, loc)),
    "F1 fresh methods",
);
text(obj(b.functionPrototype), "function () { [native code] }", "F3 root");
text(T, "function toString() { [native code] }", "F3 method");
text(
    b.functionPrototype.get("call", active.context, loc),
    "function call() { [native code] }",
    "F3 call",
);
text(
    object(binding(b, "console")).get("log", active.context, loc),
    "function log() { [native code] }",
    "F4 log",
);
text(
    object(binding(b, "Number")).get("isFinite", active.context, loc),
    "function isFinite() { [native code] }",
    "F4 isFinite",
);
text(
    b.symbolPrototype.get(wellKnownToPrimitive, active.context, loc),
    "function [Symbol.toPrimitive]() { [native code] }",
    "F4 symbol",
);
const names: (string | null)[] = [null, "", "$x_2", "throw"];
const nativeTexts = [
    "function () { [native code] }",
    "function () { [native code] }",
    "function $x_2() { [native code] }",
    "function throw() { [native code] }",
];
for (let i = 0; i < names.length; i++) {
    const raw = new GuestObject(a.functionPrototype, false, {
        kind: "builtin",
        realm: a,
        initialName: names[i],
        invoke: (_receiver, _args, _context, _loc) => normal(),
    });
    text(obj(raw), nativeTexts[i], "F5 raw name");
}
for (const name of ["a b", "x) {}", "\n", "é", "[bad]"]) {
    let caught = false;
    try {
        a.createBuiltin(name, 0, (_receiver, _args, _context, _loc) => normal());
    } catch (fault) {
        caught = fault instanceof Error && fault.message === "invalid builtin initial name";
    }
    check(caught, "F6 factory rejects name");
    const raw = new GuestObject(a.functionPrototype, false, {
        kind: "builtin",
        realm: b,
        initialName: name,
        invoke: (_receiver, _args, _context, _loc) => normal(),
    });
    caught = false;
    try {
        active.call(T, obj(raw), [], loc);
    } catch (fault) {
        caught = fault instanceof Error && fault.message === "invalid builtin initial name";
    }
    check(
        caught && active.calls === 0 && active.context.realm === c,
        "F6 raw metadata fault cleanup",
    );
}
let effects = 0;
const throwing = hook(a, (_receiver, _args, _context, _loc): ValueCompletion => {
    effects++;
    throw new Error("unexpected hook");
});
const poison = a.createObject();
put(poison, "toString", throwing);
put(poison, "valueOf", throwing);
const named = a.createBuiltin("original", 5, (_receiver, _args, _context, _loc) => normal());
check(
    named.internalDelete("name").type === "normal" &&
        named.internalDelete("length").type === "normal",
    "F7 delete metadata",
);
put(named, "name", obj(poison));
put(named, "length", obj(poison));
put(object(old), "name", obj(poison));
put(object(old), "length", num(99));
text(obj(named), "function original() { [native code] }", "F7 immutable builtin name");
text(old, "function f(){return 1;}", "F7 guest metadata");
put(b.functionPrototype, "name", obj(poison));
text(obj(b.functionPrototype), "function () { [native code] }", "F7 root initial name");
put(object(old), "toString", throwing);
put(object(old), wellKnownToStringTag, str("Custom"));
text(old, "function f(){return 1;}", "F8 saved source");
expect(
    active.call(a.objectPrototype.get("toString", active.context, loc), old, [], loc),
    str("[object Custom]"),
    "F8 explicit tag",
);
check(effects === 0, "F7/F8 no coercion");
class NoReads extends GuestObject {
    internalGet(
        _key: PropertyKey,
        _receiver: Value,
        _context: OperationContext,
        _at: Location,
    ): ValueCompletion {
        throw new Error("unexpected receiver read");
    }
}
const invalids: Value[] = [
    UNDEFINED,
    { kind: "null" },
    { kind: "boolean", value: true },
    num(NaN),
    num(-0),
    str("x"),
    { kind: "symbol", value: new GuestSymbol("x") },
    obj(a.createObject()),
    obj(a.createArray()),
    obj(a.createBooleanObject(false)),
    obj(a.createNumberObject(0)),
    obj(a.createStringObject("")),
    obj(a.createSymbolObject(new GuestSymbol("box"))),
    obj(new NoReads(a.functionPrototype)),
];
for (const receiver of invalids) {
    error(
        active.call(T, receiver, [], loc),
        "Function.prototype.toString receiver is not callable",
    );
    check(active.calls === 0 && active.context.realm === c, "F9/F11/F13 cleanup");
}
const observed = new NoReads(null, false, {
    kind: "builtin",
    realm: b,
    initialName: "observed",
    invoke: (_receiver, _args, _context, _loc) => {
        effects++;
        return normal();
    },
});
expect(
    active.call(T, obj(observed), [obj(poison)], loc),
    str("function observed() { [native code] }"),
    "F10 no reads/callbacks/extra coercion",
);
const bodyRealm = new Realm((_line) => {});
run(bodyRealm, "let effects = 0; function f(){effects = effects + 1; throw 'body';}");
text(
    binding(bodyRealm, "f"),
    "function f(){effects = effects + 1; throw 'body';}",
    "F12 body never run",
);
check(sameValue(binding(bodyRealm, "effects"), num(0)) && effects === 0, "F12 no effects");
for (const parent of [b.functionPrototype, null]) {
    check(object(fresh).setPrototypeOf(parent).value, "F14 relink");
    text(fresh, "function f(){return 2;}", "F14 saved result");
    check(
        object(fresh).callable !== null && object(fresh).callable!.realm === newRealm,
        "F14 owner stable",
    );
}
const badRanges: [number, number][] = [
    [-1, 2],
    [0.5, 2],
    [NaN, 2],
    [0, NaN],
    [0, 1.5],
    [2, 2],
    [3, 2],
    [0, 99],
    [0, Infinity],
];
for (const range of badRanges) {
    let caught = false;
    try {
        a.createGuestFunction([], [], a.global, {
            source: { text: "abc" },
            start: range[0],
            end: range[1],
        });
    } catch (fault) {
        caught = fault instanceof Error && fault.message === "invalid function source range";
    }
    check(caught, "F15 invalid trusted range");
}

// R1-R12: call boundaries use the same evaluator budgets and restore Realm state.
const budgetRealm = new Realm((_line) => {});
run(budgetRealm, "let f = function() {};");
const f = binding(budgetRealm, "f");
function idle(evaluator: Evaluator): void {
    check(evaluator.calls === 0 && evaluator.context.realm === c, "R context restored");
}
const zeroSteps = new Evaluator(c, 0, 1);
expect(zeroSteps.call(T, f, [], loc), str("function() {}"), "R1 zero body ticks");
check(zeroSteps.steps === 0, "R1 steps");
idle(zeroSteps);
for (const receiver of [f, UNDEFINED]) {
    const noCalls = new Evaluator(c, 0, 0);
    error(noCalls.call(T, receiver, [], loc), "call depth limit exceeded", "RangeError");
    check(noCalls.steps === 0, "R2 precedes receiver validation");
    idle(noCalls);
}
error(
    zeroSteps.call(T, UNDEFINED, [], loc),
    "Function.prototype.toString receiver is not callable",
);
check(zeroSteps.steps === 0, "R3 no ticks");
idle(zeroSteps);
for (const maxCalls of [1, 2]) {
    const borrowed = new Evaluator(c, 0, maxCalls);
    const completion = borrowed.call(
        b.functionPrototype.get("call", borrowed.context, loc),
        T,
        [f, obj(poison)],
        loc,
    );
    if (maxCalls === 2) {
        expect(completion, str("function() {}"), "R4 borrowed call");
    } else {
        error(completion, "call depth limit exceeded", "RangeError");
    }
    check(borrowed.steps === 0, "R4 steps");
    idle(borrowed);
}
// R5: foreign metadata and object identities survive the saved call.
const foreignRows: { receiver: Value; expected: string }[] = [
    { receiver: f, expected: "function() {}" },
    { receiver: obj(b.functionPrototype), expected: "function () { [native code] }" },
    {
        receiver: object(binding(b, "console")).get("log", zeroSteps.context, loc),
        expected: "function log() { [native code] }",
    },
];
check(
    object(T).callable !== null && object(T).callable!.realm === a,
    "R5 saved method defining Realm",
);
for (const row of foreignRows) {
    const receiver = row.receiver;
    const before = object(receiver).getPrototypeOf();
    const owner = object(receiver).callable;
    const completion = active.call(T, receiver, [], loc);
    expect(completion, str(row.expected), "R5 exact foreign result");
    check(
        object(receiver).getPrototypeOf() === before && object(receiver).callable === owner,
        "R5 foreign immutable identity",
    );
    idle(active);
}
for (const hint of ["default", "number", "string"] as const) {
    const evaluator = new Evaluator(c, 3, 1);
    const callees: Value[] = [];
    const observedContext: OperationContext = {
        realm: c,
        tick: (at) => evaluator.tick(at),
        call: (callee, receiver, args, at) => {
            check(evaluator.calls === 0, "R6/R7 sequential calls");
            callees.push(callee);
            return evaluator.call(callee, receiver, args, at);
        },
    };
    expect(toPrimitive(f, hint, observedContext, loc), str("function() {}"), "R6/R7 source");
    check(
        callees.length === (hint === "string" ? 1 : 2) &&
            callees[callees.length - 1] ===
                budgetRealm.functionPrototype.get("toString", observedContext, loc),
        "R6/R7 candidates",
    );
    if (hint !== "string") {
        check(
            callees[0] === budgetRealm.objectPrototype.get("valueOf", observedContext, loc),
            "R6 first candidate",
        );
    }
    check(evaluator.steps === (hint === "string" ? 2 : 3), "R6/R7 exact steps");
    idle(evaluator);
    const exhausted = new Evaluator(c, hint === "string" ? 1 : 2, 1);
    error(
        toPrimitive(f, hint, exhausted.context, loc),
        "execution step limit exceeded",
        "RangeError",
    );
    check(exhausted.steps === (hint === "string" ? 2 : 3), "R8/R9 failed tick charged");
    idle(exhausted);
    const noCalls = new Evaluator(c, 3, 0);
    error(toPrimitive(f, hint, noCalls.context, loc), "call depth limit exceeded", "RangeError");
    check(noCalls.steps === 2, "R10 rejection point");
    idle(noCalls);
}
const keyContext = new Evaluator(c, 2, 1);
const key = toPropertyKey(f, keyContext.context, loc);
check(
    key.type === "normal" && key.value === "function() {}" && keyContext.steps === 2,
    "R7 property key",
);
idle(keyContext);
zeroSteps.steps = 10;
expect(zeroSteps.call(T, f, [], loc), str("function() {}"), "R11 already exhausted steps");
check(zeroSteps.steps === 10, "R11 unchanged");
idle(zeroSteps);
const explicitTag = new Evaluator(c, 1, 1);
expect(
    explicitTag.call(a.objectPrototype.get("toString", explicitTag.context, loc), f, [], loc),
    str("[object Function]"),
    "R12 explicit tag",
);
check(explicitTag.steps === 1, "R12 one body tick");
idle(explicitTag);

// C5: saved join uses the element's source through ordinary string conversion.
const elementArray = a.createArray();
put(elementArray, "0", f);
expect(
    active.call(a.arrayPrototype.get("join", explicitTag.context, loc), obj(elementArray), [], loc),
    str("function() {}"),
    "C5 saved join",
);
// C7-C13: mutation is observed by ordinary conversion, not saved stringification.
put(object(f), wellKnownToPrimitive, throwing);
for (const completion of [toNumber(f, loc, null), toString(f, loc, null), toLength(f, loc, null)]) {
    check(
        completion.type === "throw" &&
            completion.diagnostic.name === "TypeError" &&
            completion.diagnostic.message === "object-to-primitive conversion unsupported",
        "C7 primitive-only boundary",
    );
}
check(effects === 0, "C7 no hooks");
object(f).internalDelete(wellKnownToPrimitive);
let trace = "";
const changed = hook(budgetRealm, (_receiver, _args, _context, _loc) => {
    trace += "changed;";
    return normal(str("changed"));
});
const next = hook(budgetRealm, (_receiver, _args, _context, _loc) => {
    trace += "next;";
    return normal(str("next"));
});
put(object(f), "toString", changed);
expect(toPrimitive(f, "default", active.context, loc), str("changed"), "C8 first");
put(object(f), "toString", next);
expect(toPrimitive(f, "default", active.context, loc), str("next"), "C8 second");
text(f, "function() {}", "C8 saved");
check(trace === "changed;next;", "C8 trace");
const freshHook = hook(budgetRealm, (_receiver, _args, _context, _loc) => {
    trace += "fresh;";
    return normal(str("fresh"));
});
put(
    object(f),
    "valueOf",
    hook(budgetRealm, (receiver, _args, _context, _loc) => {
        trace += "valueOf;";
        put(object(receiver), "toString", freshHook);
        return normal(receiver);
    }),
);
trace = "";
expect(toPrimitive(f, "default", active.context, loc), str("fresh"), "C9 fresh lookup");
check(trace === "valueOf;fresh;", "C9 order");
object(f).internalDelete("valueOf");
object(f).internalDelete("toString");
const deletion = budgetRealm.functionPrototype.internalDelete("toString");
check(deletion.type === "normal" && deletion.value, "C10 delete root");
const deleted = new Evaluator(c);
expect(
    toPrimitive(f, "default", deleted.context, loc),
    str("[object Function]"),
    "C10 inherited fallback",
);
check(deleted.steps === 4, "C10 steps");
text(f, "function() {}", "C10 saved");
expect(
    toPrimitive(obj(a.functionPrototype), "default", active.context, loc),
    str("function () { [native code] }"),
    "C10 other Realm ordinary conversion",
);
put(object(f), "toString", num(0));
const shadowed = new Evaluator(c);
error(toPrimitive(f, "default", shadowed.context, loc), "cannot convert object to primitive");
check(shadowed.steps === 3, "C11 shadow steps");
const sentinel = failure("Sentinel", "protocol", loc);
put(
    object(f),
    wellKnownToPrimitive,
    hook(budgetRealm, (_receiver, args, _context, _loc) => {
        check(args.length === 1 && sameValue(args[0], str("number")), "C12 original hint");
        return normal(str("protocol"));
    }),
);
expect(toPrimitive(f, "number", active.context, loc), str("protocol"), "C12 protocol wins");
put(
    object(f),
    wellKnownToPrimitive,
    hook(budgetRealm, (_receiver, _args, _context, _loc) => sentinel),
);
check(toPrimitive(f, "default", active.context, loc) === sentinel, "C12 original abrupt");
put(object(f), wellKnownToPrimitive, num(0));
const noncallable = toPrimitive(f, "default", active.context, loc);
check(
    noncallable.type === "throw" && noncallable.diagnostic.name === "TypeError",
    "C12 noncallable hook",
);
object(f).internalDelete(wellKnownToPrimitive);
object(f).internalDelete("toString");
object(f).setPrototypeOf(null);
const detached = new Evaluator(c);
error(toPrimitive(f, "default", detached.context, loc), "cannot convert object to primitive");
check(detached.steps === 3 && detached.calls === 0, "C13 lookups no calls");
text(f, "function() {}", "C13 saved");

const fixtureRealm = new Realm((_line) => {});
run(fixtureRealm, readFileSync("test/fixtures/function-string-conversion.js", "utf8"));
const expectedBindings: { name: string; expected: Value }[] = [
    { name: "left", expected: str("function() {}1") },
    { name: "right", expected: str("1function() {}") },
    { name: "lexicalLess", expected: { kind: "boolean", value: true } },
    { name: "lexicalGreaterEqual", expected: { kind: "boolean", value: false } },
    { name: "distinct", expected: { kind: "boolean", value: false } },
    { name: "sameIdentity", expected: { kind: "boolean", value: false } },
    { name: "literalKey", expected: num(7) },
    { name: "sameKey", expected: num(7) },
    { name: "differentKey", expected: UNDEFINED },
    { name: "oldTagKey", expected: UNDEFINED },
    { name: "joined", expected: str("function() {}") },
    { name: "overridden", expected: str("override") },
    { name: "original", expected: str("function() {}") },
    { name: "hoisted", expected: str("function declaration() { /* retained */ return 1; }") },
    { name: "laterText", expected: str("function(){return 3;}") },
];
for (const row of expectedBindings) {
    check(
        sameValue(binding(fixtureRealm, row.name), row.expected),
        "runtime C1/C3-C5/C14 " + row.name,
    );
}
for (const name of ["positive", "negative", "subtract", "multiply", "divide", "remainder"]) {
    check(sameValue(binding(fixtureRealm, name), num(NaN)), "C2 NaN " + name);
}
for (const name of ["less", "greater", "lessEqual", "greaterEqual"]) {
    check(
        sameValue(binding(fixtureRealm, name), { kind: "boolean", value: false }),
        "C2 numeric relation " + name,
    );
}
// Remove C14 override before C6: invalid length conversion must see function source.
object(binding(fixtureRealm, "f")).internalDelete("toString");
const lengthResult = active.call(binding(fixtureRealm, "invalidLength"), UNDEFINED, [], loc);
check(
    lengthResult.type === "throw" &&
        lengthResult.diagnostic.phase === "runtime" &&
        lengthResult.diagnostic.name === "RangeError" &&
        lengthResult.diagnostic.message === "invalid array length" &&
        lengthResult.diagnostic.loc.line === 32 &&
        lengthResult.diagnostic.loc.column === 27,
    "C6 assignment location",
);
check(
    sameValue(object(binding(fixtureRealm, "array")).get("length", detached.context, loc), num(2)),
    "C6 atomic length",
);
const failingRealm = new Realm((_line) => {});
failingRealm.global.bindings.set("T", { initialized: true, mutable: true, value: T });
const failing = parse(readFileSync("test/fixtures/function-string-invalid.js", "utf8"));
check(failing.error === null, "C15 parse");
const failedEvaluator = new Evaluator(failingRealm);
const failed = failedEvaluator.block(failing.body, failingRealm.global, UNDEFINED);
check(
    failed.type === "throw" &&
        failed.diagnostic.phase === "runtime" &&
        failed.diagnostic.name === "TypeError" &&
        failed.diagnostic.message === "Function.prototype.toString receiver is not callable" &&
        failed.diagnostic.loc.line === 2 &&
        failed.diagnostic.loc.column === 1,
    "C15 call-site error",
);
check(
    failedEvaluator.steps > 0 &&
        failedEvaluator.calls === 0 &&
        failedEvaluator.context.realm === failingRealm,
    "C15 AST ticks and cleanup",
);
console.log("function-string-conversion ok");
