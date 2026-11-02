import { readFileSync } from "node:fs";
import { toString, toPropertyKey, numberToString } from "../src/conversion.js";
import { GuestObject, UNDEFINED, normal, getValue, putValue, type OperationContext, type Builtin, type Completion, type Value, type ValueCompletion, type ThrowCompletion } from "../src/runtime.js";
import { GuestArray } from "../src/array-object.js";
import { Realm } from "../src/realm.js";
import { Evaluator } from "../src/evaluator.js";
import { parse } from "../src/parser.js";
import type { Location } from "../src/syntax.js";

const keyEvaluator = new Evaluator(new Realm((_line) => {}));
const keyContext = keyEvaluator.context;
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function obj(object: GuestObject): Value { return { kind: "object", object }; }
function num(value: number): Value { return { kind: "number", value }; }
function str(value: string): Value { return { kind: "string", value }; }
function isNumber(value: Value, expected: number): boolean { return value.kind === "number" && value.value === expected; }
const loc: Location = { line: 17, column: 9 };
function seed(realm: Realm, name: string, value: Value): void {
    realm.global.bindings.set(name, { initialized: true, mutable: true, value });
}
function binding(realm: Realm, name: string): Value {
    const entry = realm.global.bindings.get(name);
    if (entry === undefined) throw new Error("missing binding: " + name);
    return entry.value;
}
function builtin(realm: Realm, invoke: Builtin): Value {
    const object = new GuestObject(null, false, { kind: "builtin", realm, invoke });
    return obj(object);
}
function execute(source: string, evaluator: Evaluator): Completion {
    const parsed = parse(source);
    if (parsed.error !== null) throw new Error("fixture parse: " + parsed.error.message);
    return evaluator.block(parsed.body, evaluator.context.realm.global, UNDEFINED);
}
function fixture(name: string): string {
    return readFileSync("test/fixtures/property-key-conversion/" + name + ".js", "utf8");
}
function exact(result: Completion, sentinel: ThrowCompletion): void {
    check(result === sentinel, "original completion record");
    if (result.type !== "throw") throw new Error("expected throw");
    check(result.value === sentinel.value && result.diagnostic === sentinel.diagnostic && result.diagnostic.loc === loc, "original payload, diagnostic and location");
}
function typeError(result: Completion, message: string, column: number): void {
    check(result.type === "throw" && result.diagnostic.name === "TypeError" && result.diagnostic.phase === "runtime" && result.diagnostic.message === message && result.diagnostic.loc.line === 1 && result.diagnostic.loc.column === column, "located TypeError: " + message);
}

// Fixed expectations, not computed through the backend under test.
const cases: { label: string; input: number; expected: string }[] = [
    { label: "positive-zero", input: 0, expected: "0" },
    { label: "negative-zero", input: -0, expected: "0" },
    { label: "nan", input: NaN, expected: "NaN" },
    { label: "positive-infinity", input: Infinity, expected: "Infinity" },
    { label: "negative-infinity", input: -Infinity, expected: "-Infinity" },
    { label: "one", input: 1, expected: "1" },
    { label: "negative-integer", input: -42, expected: "-42" },
    { label: "fraction", input: 1.5, expected: "1.5" },
    { label: "safe-max", input: 9007199254740991, expected: "9007199254740991" },
    { label: "safe-next", input: 9007199254740992, expected: "9007199254740992" },
    { label: "rounded-integer", input: 1000000000000000128, expected: "1000000000000000100" },
    { label: "array-index-max", input: 4294967294, expected: "4294967294" },
    { label: "array-nonindex", input: 4294967295, expected: "4294967295" },
    { label: "max-finite", input: Number.MAX_VALUE, expected: "1.7976931348623157e+308" },
    { label: "negative-max", input: -Number.MAX_VALUE, expected: "-1.7976931348623157e+308" },
    { label: "min-subnormal", input: Number.MIN_VALUE, expected: "5e-324" },
    { label: "negative-subnormal", input: -Number.MIN_VALUE, expected: "-5e-324" },
    { label: "next-subnormal", input: 1e-323, expected: "1e-323" },
    { label: "largest-subnormal", input: 2.225073858507201e-308, expected: "2.225073858507201e-308" },
    { label: "min-normal", input: 2.2250738585072014e-308, expected: "2.2250738585072014e-308" },
    { label: "below-small-boundary", input: 9.999999999999997e-7, expected: "9.999999999999997e-7" },
    { label: "small-boundary", input: 1e-6, expected: "0.000001" },
    { label: "above-small-boundary", input: 0.0000010000000000000002, expected: "0.0000010000000000000002" },
    { label: "small-exponent", input: 1e-7, expected: "1e-7" },
    { label: "negative-small-boundary", input: -1e-6, expected: "-0.000001" },
    { label: "large-decimal", input: 1e20, expected: "100000000000000000000" },
    { label: "below-large-boundary", input: 999999999999999900000, expected: "999999999999999900000" },
    { label: "large-boundary", input: 1e21, expected: "1e+21" },
    { label: "above-large-boundary", input: 1.0000000000000001e21, expected: "1.0000000000000001e+21" },
    { label: "negative-large-boundary", input: -1e21, expected: "-1e+21" },
    { label: "tenth", input: 0.1, expected: "0.1" },
    { label: "sum", input: 0.1 + 0.2, expected: "0.30000000000000004" },
    { label: "one-next", input: 1.0000000000000002, expected: "1.0000000000000002" },
    { label: "one-previous", input: 0.9999999999999999, expected: "0.9999999999999999" },
    { label: "seventeen-digits", input: 1.2345678901234567, expected: "1.2345678901234567" },
    { label: "pi", input: Math.PI, expected: "3.141592653589793" },
];


for (const row of cases) {
    check(numberToString(row.input) === row.expected, row.label + " backend");
    const string = toString(num(row.input), loc);
    const key = toPropertyKey(num(row.input), keyContext, loc);
    check(string.type === "normal" && string.value === row.expected && key.type === "normal" && key.value === row.expected, row.label + " conversion");
    const target = obj(new GuestObject());
    const rhs = obj(new GuestObject());
    const ref = { kind: "property" as const, base: target, key: num(row.input), loc };
    const write = putValue(ref, rhs, keyContext, loc);
    const read = getValue(ref, keyContext, loc);
    check(write.type === "normal" && write.value === rhs && read.type === "normal" && read.value === rhs, row.label + " reference");
    check(target.kind === "object" && target.object.get(row.expected) === rhs, row.label + " exact property name");
}
const primitives: { value: Value; expected: string }[] = [
    { value: UNDEFINED, expected: "undefined" }, { value: { kind: "null" }, expected: "null" },
    { value: { kind: "boolean", value: true }, expected: "true" }, { value: { kind: "boolean", value: false }, expected: "false" },
    { value: str(""), expected: "" }, { value: str("a\0\ud800\udfff"), expected: "a\0\ud800\udfff" },
];
for (const row of primitives) {
    const string = toString(row.value, loc);
    const key = toPropertyKey(row.value, keyContext, loc);
    check(string.type === "normal" && string.value === row.expected && key.type === "normal" && key.value === row.expected, "primitive exact UTF-16");
    for (const target of [new GuestObject(), new GuestArray()]) {
        const rhs = obj(new GuestObject());
        const ref = { kind: "property" as const, base: obj(target), key: row.value, loc };
        const write = putValue(ref, rhs, keyContext, loc);
        const read = getValue(ref, keyContext, loc);
        check(write.type === "normal" && write.value === rhs && read.type === "normal" && read.value === rhs && target.get(row.expected) === rhs, "primitive key on ordinary/array");
    }
}
const accessRealm = new Realm((_line) => {});
check(execute(fixture("access"), new Evaluator(accessRealm)).type === "normal", "ordinary and array fixture");
const ordinary = binding(accessRealm, "o");
const array = binding(accessRealm, "a");
if (ordinary.kind !== "object" || array.kind !== "object") throw new Error("fixture objects");
for (const row of [{ key: "1", value: 2 }, { key: "0", value: 3 }, { key: "-0", value: 4 }, { key: "01", value: 5 }, { key: "1.5", value: 6 }, { key: "-1", value: 7 }, { key: "NaN", value: 8 }, { key: "Infinity", value: 9 }, { key: "-Infinity", value: 10 }]) {
    check(isNumber(ordinary.object.get(row.key), row.value), "distinct name " + row.key);
}
check(isNumber(array.object.get("0"), 1) && isNumber(array.object.get("length"), 4) && array.object.getOwnProperty("1") === undefined && array.object.getOwnProperty("2")?.value === UNDEFINED && isNumber(array.object.get("3"), 4), "holes and explicit undefined");
const sparse = new GuestArray();
for (const value of [4294967295, -1, 1.5, 1e21]) {
    check(putValue({ kind: "property", base: obj(sparse), key: num(value), loc }, num(8), keyContext, loc).type === "normal", "nonindex write");
    check(isNumber(sparse.get("length"), 0) && isNumber(sparse.get(numberToString(value)), 8), "nonindex does not grow");
}
check(putValue({ kind: "property", base: obj(sparse), key: num(4294967294), loc }, num(9), keyContext, loc).type === "normal", "max index");
check(isNumber(sparse.get("length"), 4294967295) && sparse.getOwnProperty("0") === undefined, "sparse maximum length");
const small = new GuestArray();
putValue({ kind: "property", base: obj(small), key: num(2), loc }, num(9), keyContext, loc);
check(isNumber(small.get("length"), 3) && small.getOwnProperty("1") === undefined, "numeric index growth");

// Synthetic operations observe order and exact completion identity, without
// claiming guest accessors.
class ObservedObject extends GuestObject {
    trace = "";
    getThrow = false;
    setThrow = false;
    seenContext: OperationContext | null = null;
    receiver: Value = UNDEFINED;
    sentinel: ThrowCompletion = { type: "throw", value: obj(new GuestObject()), diagnostic: { phase: "runtime", name: "RangeError", message: "sentinel", loc } };
    internalGet(key: string, receiver: Value, location: Location): ValueCompletion {
        this.trace += "G";
        this.receiver = receiver;
        return this.getThrow ? this.sentinel : super.internalGet(key, receiver, location);
    }
    set(key: string, value: Value, context: OperationContext, location: Location): Completion {
        this.seenContext = context;
        this.trace += "S";
        return this.setThrow ? this.sentinel : super.set(key, value, context, location);
    }
}
class ForbiddenKey extends GuestObject {
    internalGet(_key: string, _receiver: Value, _location: Location): ValueCompletion { throw new Error("object key read"); }
    get(_key: string): Value { throw new Error("object key get"); }
}


class Scenario {
    realm = new Realm((_line) => {});
    evaluator = new Evaluator(this.realm);
    original = new ObservedObject();
    replacement = new GuestObject();
    originalValue = obj(this.original);
    rhsValue = obj(new GuestObject());
    keyValue: Value = num(1);
    baseValue: Value = this.originalValue;
    stop = "";
    replace = false;
    args = 0;
    constructor(inherited: boolean = false) {
        seed(this.realm, "selectedBase", this.originalValue);
        seed(this.realm, "selectedKey", this.keyValue);
        const method = builtin(this.realm, (receiver, args, context, _location) => {
            this.original.trace += "M";
            check(receiver === this.originalValue && context === this.evaluator.context, "exact original receiver/context");
            check(args.length === 2 && args[0] === this.rhsValue && args[1] === this.rhsValue, "argument identities");
            return normal(receiver);
        });
        if (inherited) {
            const parent = new GuestObject();
            parent.bootstrapDefine("1", { value: method, writable: true, enumerable: true, configurable: true });
            this.original.setPrototypeOf(parent);
        } else this.original.bootstrapDefine("1", { value: method, writable: true, enumerable: true, configurable: true });
        seed(this.realm, "base", builtin(this.realm, (_receiver, _args, _context, _location) => {
            this.original.trace += "B";
            return this.stop === "B" ? this.original.sentinel : normal(this.replace ? binding(this.realm, "selectedBase") : this.baseValue);
        }));
        seed(this.realm, "key", builtin(this.realm, (_receiver, _args, _context, _location) => {
            this.original.trace += "K";
            return this.stop === "K" ? this.original.sentinel : normal(this.replace ? binding(this.realm, "selectedKey") : this.keyValue);
        }));
        seed(this.realm, "rhs", builtin(this.realm, (_receiver, _args, _context, _location) => {
            this.original.trace += "R";
            if (this.replace) this.replaceBindings();
            return this.stop === "R" ? this.original.sentinel : normal(this.rhsValue);
        }));
        seed(this.realm, "arg", builtin(this.realm, (_receiver, _args, _context, _location) => {
            this.original.trace += "A";
            this.args++;
            if (this.replace) this.replaceBindings();
            return this.stop === "A" ? this.original.sentinel : normal(this.rhsValue);
        }));
    }
    replaceBindings(): void {
        seed(this.realm, "selectedBase", obj(this.replacement));
        seed(this.realm, "selectedKey", num(2));
        this.baseValue = binding(this.realm, "selectedBase");
        this.keyValue = binding(this.realm, "selectedKey");
    }
    run(name: string): Completion { return execute(fixture(name), this.evaluator); }
}
const write = new Scenario();
write.replace = true;
check(write.run("write").type === "normal" && write.original.trace === "BKRS", "one-time write order");
check(write.original.get("1") === write.rhsValue && write.original.getOwnProperty("2") === undefined && write.replacement.getOwnProperty("1") === undefined && write.replacement.getOwnProperty("2") === undefined, "original write base and key");
check(write.original.seenContext === write.evaluator.context, "Set context identity");
check(binding(write.realm, "assigned") === write.rhsValue, "assignment result exact RHS");
for (const inherited of [false, true]) {
    const call = new Scenario(inherited);
    call.replace = true;
    check(call.run("call").type === "normal" && call.original.trace === "BKGAAM", "method order");
    check(call.original.receiver === call.originalValue && binding(call.realm, "returned") === call.originalValue && call.replacement.getOwnProperty("1") === undefined, "Get and method original receiver");
}
// A detached guest method retains the strict undefined-this restriction.
const detached = new Scenario();
const parsedMethod = execute("function method() { return this.x; }", detached.evaluator);
check(parsedMethod.type === "normal", "method setup");
detached.original.bootstrapDefine("1", { value: binding(detached.realm, "method"), writable: true, enumerable: true, configurable: true });
const detachedResult = detached.run("detached");
check(detachedResult.type === "throw" && detachedResult.diagnostic.message === "property base must be an object" && detached.original.trace === "BKG", "detached method");
for (const path of ["read", "write", "call"]) {
    for (const stage of ["B", "K"]) {
        const early = new Scenario();
        early.stop = stage;
        if (stage === "K") early.baseValue = { kind: "null" };
        exact(early.run(path), early.original.sentinel);
        check(early.original.trace === (stage === "B" ? "B" : "BK"), "early abrupt skips later work");
    }
}
const primitiveBases: Value[] = [{ kind: "null" }, UNDEFINED, { kind: "boolean", value: true }, num(3), str("text")];
for (const base of primitiveBases) {
    for (const path of ["read", "call", "write"]) {
        const invalid = new Scenario();
        invalid.baseValue = base;
        invalid.keyValue = obj(new ForbiddenKey());
        const result = invalid.run(path);
        typeError(result, "property base must be an object", path === "write" ? 16 : path === "call" ? 16 : 1);
        check(invalid.original.trace === (path === "write" ? "BKR" : "BK"), "base restriction timing before conversion");
    }
    const abrupt = new Scenario();
    abrupt.baseValue = base;
    abrupt.keyValue = obj(new ForbiddenKey());
    abrupt.stop = "R";
    exact(abrupt.run("write"), abrupt.original.sentinel);
    check(abrupt.original.trace === "BKR", "RHS dominates invalid base/key");
}
const callableKey = new GuestObject(null, false, { kind: "builtin", realm: keyEvaluator.context.realm, invoke: (_receiver, _args, _context, _location): Completion => { throw new Error("key itself called"); } });
for (const object of [new GuestObject(), new GuestArray(), callableKey]) {
    let calls = 0;
    const keyValue = obj(object);
    object.bootstrapDefine("toString", { value: builtin(keyEvaluator.context.realm, (receiver, args, _context, _location) => {
        check(receiver === keyValue && args.length === 0, "key receiver/arguments");
        calls++;
        return normal(str("1"));
    }), writable: true, enumerable: true, configurable: true });
    object.bootstrapDefine("valueOf", { value: builtin(keyEvaluator.context.realm, (_r, _a, _c, _l): Completion => { throw new Error("wrong hint"); }), writable: true, enumerable: true, configurable: true });
    const directString = toString(keyValue, loc);
    check(directString.type === "throw" && directString.diagnostic.message === "object-to-primitive conversion unsupported" && directString.diagnostic.loc === loc && calls === 0, "direct ToString stays primitive-only");
    const directKey = toPropertyKey(keyValue, keyContext, loc);
    check(directKey.type === "normal" && directKey.value === "1" && calls === 1, "direct object key");
    for (const path of ["read", "write", "call"]) {
        const positive = new Scenario();
        positive.keyValue = keyValue;
        const before = calls;
        check(positive.run(path).type === "normal" && calls === before + 1, "object key converts once");
        check(positive.original.trace === (path === "write" ? "BKRS" : path === "call" ? "BKGAAM" : "BKG"), "object key completes reference");
    }
    const abrupt = new Scenario();
    abrupt.keyValue = keyValue;
    abrupt.stop = "R";
    const before = calls;
    exact(abrupt.run("write"), abrupt.original.sentinel);
    check(abrupt.original.trace === "BKR" && calls === before, "RHS dominates object conversion");
}
for (const path of ["read", "call"]) {
    const abrupt = new Scenario();
    abrupt.original.getThrow = true;
    exact(abrupt.run(path), abrupt.original.sentinel);
    check(abrupt.original.trace === "BKG", "Get throw skips args");
}
const setThrow = new Scenario();
setThrow.original.setThrow = true;
exact(setThrow.run("write"), setThrow.original.sentinel);
check(setThrow.original.trace === "BKRS", "Set throw after RHS");
for (const inherited of [false, true]) {
    const readonly = new Scenario();
    const owner = inherited ? new GuestObject() : readonly.original;
    owner.bootstrapDefine("2", { value: num(42), writable: false, enumerable: true, configurable: true });
    if (inherited) readonly.original.setPrototypeOf(owner);
    readonly.keyValue = num(2);
    const read = readonly.run("read");
    check(read.type === "normal" && readonly.original.trace === "BKG", "inherited numeric read");
    const ref = getValue({ kind: "property", base: readonly.originalValue, key: num(2), loc }, keyContext, loc);
    check(ref.type === "normal" && isNumber(ref.value, 42), "inherited read value");
    readonly.original.trace = "";
    typeError(readonly.run("write"), "property is not writable: 2", 16);
    check(readonly.original.trace === "BKRS" && isNumber(owner.get("2"), 42), "readonly Set after RHS");
}
const closed = new Scenario();
closed.original.preventExtensions();
closed.keyValue = num(2);
typeError(closed.run("write"), "property is not writable: 2", 16);
check(closed.original.trace === "BKRS" && closed.original.getOwnProperty("2") === undefined, "nonextensible false Set");
for (const stop of ["", "A"]) {
    const notCallable = new Scenario();
    notCallable.original.bootstrapDefine("1", { value: num(42), writable: true, enumerable: true, configurable: true });
    notCallable.stop = stop;
    const result = notCallable.run("call");
    if (stop === "A") exact(result, notCallable.original.sentinel);
    else typeError(result, "value is not callable", 16);
    check(notCallable.original.trace === (stop === "A" ? "BKGA" : "BKGAA"), "arguments before callability, abrupt skips later arguments");
}
// Reuse one evaluator to establish monotonic budgets and frame recovery.
const budget = new Scenario();
check(budget.run("read").type === "normal", "budget initial read");
const steps = budget.evaluator.steps;
check(budget.run("read").type === "normal" && budget.evaluator.steps > steps, "monotonic reference ticks");
budget.evaluator.maxSteps = budget.evaluator.steps;
const exhausted = budget.run("read");
check(exhausted.type === "throw" && exhausted.diagnostic.name === "RangeError" && exhausted.diagnostic.loc.line === 1 && exhausted.diagnostic.loc.column === 1 && budget.evaluator.calls === 0 && budget.evaluator.depth === 0, "budget location and cleanup");
budget.evaluator.maxSteps += 100;
check(budget.run("read").type === "normal", "budget recovery without counter reset");
const calls = new Scenario();
calls.evaluator.maxCalls = 0;
const limited = calls.run("call");
check(limited.type === "throw" && limited.diagnostic.name === "RangeError" && calls.evaluator.calls === 0 && calls.evaluator.depth === 0, "call limit cleanup");
calls.evaluator.maxCalls = 64;
check(calls.run("read").type === "normal", "call limit recovery");
const independent = new Realm((_line) => {});
check(execute(fixture("access"), new Evaluator(independent)).type === "normal", "second realm fixture");
const otherObject = binding(independent, "o");
check(otherObject.kind === "object" && otherObject.object !== ordinary.object && otherObject.object.get("1") !== ordinary.object.get("1"), "realm property state independent");
console.log("property key conversion passed");
