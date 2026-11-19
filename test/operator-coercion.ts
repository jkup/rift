import type { OperationContext } from "../src/runtime.js";
import type { PropertyKey } from "../src/runtime.js";
import { readFileSync } from "node:fs";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import { Realm } from "../src/realm.js";
import { GuestArray } from "../src/array-object.js";
import {
    GuestObject,
    UNDEFINED,
    failure,
    normal,
    type Builtin,
    type Completion,
    type Value,
    type ValueCompletion,
} from "../src/runtime.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function seed(active: Evaluator, name: string, value: Value): void {
    active.context.realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function binding(active: Evaluator, name: string): Value {
    const entry = active.context.realm.global.bindings.get(name);
    if (entry === undefined) {
        throw new Error("missing " + name);
    }
    return entry.value;
}
function builtin(realm: Realm, invoke: Builtin): Value {
    const object = new GuestObject(null, false, {
        kind: "builtin",
        initialName: null,
        realm,
        invoke,
    });
    return { kind: "object", object };
}
function run(active: Evaluator, source: string): Completion {
    const parsed = parse(source);
    if (parsed.error !== null) {
        throw new Error(parsed.error.message);
    }
    return active.block(parsed.body, active.context.realm.global, UNDEFINED);
}
function expect(active: Evaluator, source: string, expected: number | string | boolean): void {
    seed(active, "actualResult", UNDEFINED);
    const result = run(active, "actualResult = " + source + ";");
    const actual = binding(active, "actualResult");
    check(
        result.type === "normal" &&
            (actual.kind === "number" || actual.kind === "string" || actual.kind === "boolean") &&
            Object.is(actual.value, expected),
        source + " fixed result",
    );
}
const fixture = readFileSync("test/fixtures/operator-coercion.js", "utf8");
function setup(): Evaluator {
    const active = new Evaluator(new Realm((_line) => {}), 100000, 12);
    seed(
        active,
        "verify",
        builtin(active.context.realm, (_receiver, args, context, _loc) => {
            check(
                context === active.context && args[0].kind === "boolean" && args[0].value,
                "guest receiver/argument/context",
            );
            return normal();
        }),
    );
    check(run(active, fixture).type === "normal", "runtime-read fixture");
    return active;
}
const operators = ["-", "*", "/", "%", "+", "<", ">", "<=", ">="];
const expected: (number | boolean)[] = [4, 12, 3, 0, 8, false, true, false, true];
for (let i = 0; i < operators.length; i++) {
    const active = setup();
    expect(active, "left() " + operators[i] + " right()", expected[i]);
    expect(active, "trace", "LRPQ");
    check(active.calls === 0, "calls released");
}
// F2/F3: both objects convert before string/numeric selection, in source order.
for (const right of ["'2'", "2"]) {
    const results = right === "'2'" ? [true, false, true, false] : [false, true, false, true];
    for (let i = 0; i < 4; i++) {
        const active = setup();
        run(active, "leftValue = '10'; rightValue = " + right + ";");
        expect(active, "left() " + operators[i + 5] + " right()", results[i]);
        expect(active, "trace", "LRPQ");
    }
}
const addition = setup();
run(addition, "leftValue = '10';");
expect(addition, "left() + right()", "102");
expect(addition, "trace", "LRPQ");
// Fresh right lookup and captured operand Values survive binding replacement.
for (let i = 0; i < operators.length; i++) {
    const active = setup();
    run(
        active,
        `let saved = rightObject;
leftObject.valueOf = function() {
    trace = trace + 'P';
    saved.valueOf = function() { trace = trace + 'Q'; return 2; };
    rightObject = {};
    leftObject = {};
    return 6;
};`,
    );
    expect(active, "left() " + operators[i] + " right()", expected[i]);
    expect(active, "trace", "LRPQ");
}
// Exact abrupt records for every phase, including synthetic Get failures.
const sentinel = failure("Sentinel", "operator", { line: 71, column: 9 });
sentinel.value = { kind: "object", object: new GuestObject() };
class ThrowingGet extends GuestObject {
    reads = 0;
    override internalGet(
        _key: PropertyKey,
        _receiver: Value,
        context: OperationContext,
        _loc: Location,
    ): ValueCompletion {
        this.reads++;
        return sentinel;
    }
}
for (const op of operators) {
    for (const phase of ["L", "R", "P", "Q", "GetP", "GetQ"]) {
        const active = setup();
        seed(
            active,
            "stop",
            builtin(active.context.realm, (_r, _a, _c, _l): Completion => sentinel),
        );
        if (phase === "L" || phase === "R") {
            run(
                active,
                (phase === "L" ? "left" : "right") +
                    " = function() { trace = trace + '" +
                    phase +
                    "'; return stop(); };",
            );
        }
        if (phase === "P" || phase === "Q") {
            run(
                active,
                (phase === "P" ? "leftObject" : "rightObject") +
                    ".valueOf = function() { trace = trace + '" +
                    phase +
                    "'; return stop(); };",
            );
        }
        const trap = new ThrowingGet();
        if (phase === "GetP" || phase === "GetQ") {
            seed(active, phase === "GetP" ? "leftObject" : "rightObject", {
                kind: "object",
                object: trap,
            });
        }
        check(run(active, "left() " + op + " right();") === sentinel, op + " exact " + phase);
        expect(
            active,
            "trace",
            phase === "L"
                ? "L"
                : phase === "R" || phase === "GetP"
                  ? "LR"
                  : phase === "P" || phase === "GetQ"
                    ? "LRP"
                    : "LRPQ",
        );
        check(active.calls === 0, "abrupt cleanup");
        if (phase === "GetP" || phase === "GetQ") {
            check(trap.reads === 1, "one failing Get");
        }
    }
    for (const left of ["{}", "trap"]) {
        const active = setup();
        const trap = new ThrowingGet();
        seed(active, "trap", { kind: "object", object: trap });
        seed(
            active,
            "stop",
            builtin(active.context.realm, (_r, _a, _c, _l): Completion => sentinel),
        );
        check(
            run(active, "(" + left + ") " + op + " stop();") === sentinel && trap.reads === 0,
            "R wins before conversion",
        );
    }
}
// All object kinds, inherited methods, original Value receiver and zero arguments.
for (const kind of ["ordinary", "array", "function"]) {
    for (const expression of [
        "+operand",
        "-operand",
        ...operators.map((op) => "operand " + op + " 2"),
    ]) {
        const active = setup();
        const object =
            kind === "array"
                ? new GuestArray()
                : new GuestObject(
                      null,
                      false,
                      kind === "function"
                          ? {
                                kind: "builtin",
                                initialName: null,
                                realm: active.context.realm,
                                invoke: (_r, _a, _c, _l): Completion => {
                                    throw new Error("input function called");
                                },
                            }
                          : null,
                  );
        const input: Value = { kind: "object", object };
        const proto = new GuestObject();
        check(object.setPrototypeOf(proto).value, "install inherited method");
        let calls = 0;
        proto.bootstrapDefine("valueOf", {
            value: builtin(active.context.realm, (receiver, args, context, _loc) => {
                check(
                    receiver === input && args.length === 0 && context === active.context,
                    "inherited method receiver/args",
                );
                calls++;
                return normal({ kind: "number", value: 6 });
            }),
            writable: true,
            enumerable: true,
            configurable: true,
        });
        seed(active, "operand", input);
        const index =
            expression === "+operand"
                ? -2
                : expression === "-operand"
                  ? -1
                  : operators.indexOf(expression.split(" ")[1]);
        expect(active, expression, index === -2 ? 6 : index === -1 ? -6 : expected[index]);
        check(calls === 1, "one inherited call");
    }
}
// Noncallable first methods and object-return fallback; every primitive kind.
const primitiveRows: { source: string; numeric: number }[] = [
    { source: "undefined", numeric: NaN },
    { source: "null", numeric: 0 },
    { source: "false", numeric: 0 },
    { source: "true", numeric: 1 },
    { source: "-0", numeric: -0 },
    { source: "Number.NaN", numeric: NaN },
    { source: "'6'", numeric: 6 },
    { source: "''", numeric: 0 },
];
for (const row of primitiveRows) {
    for (const first of ["null", "function() { return {}; }"]) {
        const active = setup();
        run(
            active,
            "let operand = {valueOf: " +
                first +
                ", toString: function() { return " +
                row.source +
                "; }};",
        );
        expect(active, "+operand", row.numeric);
    }
}
// Object retains its tag; Function uses source and Array uses join.
for (const source of ["{}", "function() {}"]) {
    const active = setup();
    run(active, "let operand = " + source + ";");
    const tag = source === "{}" ? "Object" : source === "[]" ? "Array" : "Function";
    expect(active, "+operand", NaN);
    expect(active, "-operand", NaN);
    for (const op of operators) {
        expect(
            active,
            "operand " + op + " 2",
            op === "+"
                ? source === "{}"
                    ? "[object " + tag + "]2"
                    : "function() {}2"
                : ["<", ">", "<=", ">="].includes(op)
                  ? false
                  : NaN,
        );
    }
}
const emptyArray = setup();
run(emptyArray, "let operand = [];");
expect(emptyArray, "+operand", 0);
expect(emptyArray, "-operand", -0);
const arrayResults: (number | string | boolean)[] = [-2, 0, 0, 0, "2", true, false, true, false];
for (let i = 0; i < operators.length; i++) {
    expect(emptyArray, "operand " + operators[i] + " 2", arrayResults[i]);
}
for (const object of [
    "{valueOf: function() { return {}; }, toString: function() { return []; }}",
]) {
    for (const expression of [
        "+operand",
        "-operand",
        ...operators.map((op) => "operand " + op + " 2"),
    ]) {
        const active = setup();
        run(active, "let operand = " + object + ";");
        const result = run(active, "\n" + expression + ";");
        check(
            result.type === "throw" &&
                result.diagnostic.name === "TypeError" &&
                result.diagnostic.message === "cannot convert object to primitive" &&
                result.diagnostic.loc.line === 2 &&
                result.diagnostic.loc.column === 1,
            "located final failure " + expression,
        );
    }
}
const utf = setup();
seed(utf, "leftValue", { kind: "string", value: "\ud800\u0000" });
seed(utf, "rightValue", { kind: "string", value: "\ue000" });
expect(utf, "left() + right()", "\ud800\u0000\ue000");
expect(utf, "left() < right()", true);
run(utf, "leftValue = -0; rightValue = -0;");
expect(utf, "left() + right()", -0);
expect(utf, "+leftObject", -0);
run(utf, "leftValue = undefined;");
for (const op of ["<", ">", "<=", ">="]) {
    expect(utf, "left() " + op + " right()", false);
}
// Noncoercing paths must not read even a throwing method lookup.
const noncoercing = setup();
const trap = new ThrowingGet();
seed(noncoercing, "operand", { kind: "object", object: trap });
for (const expression of [
    "!operand",
    "operand !== operand",
    "Number.isNaN(operand)",
    "Number.isFinite(operand)",
]) {
    expect(noncoercing, expression, false);
}
for (const expression of [
    "operand === operand",
    "(operand && true)",
    "(operand || false) === operand",
]) {
    expect(noncoercing, expression, true);
}
check(trap.reads === 0, "truthiness/equality/predicates skip hooks");
// Nested parsed coercion, independent mutable realms, monotonic shared budgets.
const first = setup();
const second = setup();
expect(first, "+nested", 13);
expect(first, "+nested", 14);
expect(second, "+nested", 13);
check(binding(first, "counter") !== binding(second, "counter"), "realm objects distinct");
for (const name of ["looping", "recursive"]) {
    const active = setup();
    const before = active.steps;
    active.maxSteps = before + 300;
    const result = run(active, "+" + name + ";");
    check(
        result.type === "throw" &&
            result.diagnostic.name === "RangeError" &&
            result.diagnostic.message ===
                (name === "looping"
                    ? "execution step limit exceeded"
                    : "call depth limit exceeded"),
        "bounded " + name,
    );
    check(active.steps > before && active.calls === 0, "shared counter and unwind");
    const after = active.steps;
    run(active, "1;");
    check(active.steps > after, "counter never reset");
}
for (const mode of ["host", "break", "continue"] as const) {
    const active = setup();
    const object = new GuestObject();
    const fault = new Error("host operator fault");
    object.bootstrapDefine("valueOf", {
        value: builtin(active.context.realm, (_r, _a, _c, _l): Completion => {
            if (mode === "host") {
                throw fault;
            }
            return { type: mode, value: UNDEFINED };
        }),
        writable: true,
        enumerable: true,
        configurable: true,
    });
    seed(active, "operand", { kind: "object", object });
    let escaped = false;
    try {
        run(active, "+operand;");
    } catch (error) {
        escaped =
            error instanceof Error &&
            (mode === "host"
                ? error === fault
                : error.message === "invalid completion escaped call boundary: " + mode);
    }
    check(escaped && active.calls === 0, "existing host-fault cleanup");
}
console.log("operator coercion passed");
