import { readFileSync } from "node:fs";
import { Realm } from "../src/realm.js";
import { Evaluator } from "../src/evaluator.js";
import { prepareStrictScript } from "../src/script-record.js";
import {
    GuestObject,
    UNDEFINED,
    normal,
    failure,
    type Value,
    type ValueCompletion,
    type OperationContext,
    type ThrowCompletion,
} from "../src/runtime.js";
const loc = { line: 7, column: 9 };
function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function exactKeys(object: GuestObject, expected: string[]): boolean {
    const actual = object.ownPropertyKeys();
    return (
        actual.length === expected.length && actual.every((key, index) => key === expected[index])
    );
}
function obj(object: GuestObject): Value {
    return { kind: "object", object };
}
function accessor(object: GuestObject, key: string): Value {
    const d = object.getOwnProperty(key);
    if (d === undefined || d.kind !== "accessor") {
        throw new Error("accessor " + key);
    }
    check(
        !d.enumerable &&
            d.configurable &&
            d.get === d.set &&
            d.get.kind === "object" &&
            !("value" in d) &&
            !("writable" in d),
        "accessor flags/fields",
    );
    return d.get;
}
function object(value: Value): GuestObject {
    if (value.kind !== "object") {
        throw new Error("object");
    }
    return value.object;
}
function hostError(action: () => void, message: string): void {
    let caught = false;
    try {
        action();
    } catch (e) {
        if (!(e instanceof Error)) {
            throw new Error("non Error");
        }
        check(e.message === message, "guard message");
        caught = true;
    }
    check(caught, "guard required");
}
function result(r: ValueCompletion, value: Value): void {
    check(r.type === "normal" && r.value === value, "exact normal Value");
}
const input = readFileSync(process.argv[2], "utf8").trim();
check(input === "caller|7|left" || input === "arguments|11|right", "input");
const a = new Realm((_line: string) => {
    throw new Error("output");
}, "script");
const b = new Realm((_line: string) => {
    throw new Error("output");
}, "script");
const legacy = new Realm((_line: string) => {
    throw new Error("output");
});
let ticks = 0,
    calls = 0,
    trace = "";
const sentinel: ThrowCompletion = {
    ...failure("TypeError", "recording projection sentinel", loc),
    value: obj(a.createObject()),
};
let expectedReceiver: Value = UNDEFINED,
    expectedArgs: Value[] = [];
const t = accessor(a.functionPrototype, "caller"),
    thrower = object(t);
const context: OperationContext = {
    realm: a,
    tick: (_loc): ValueCompletion => {
        ticks++;
        return normal();
    },
    call: (callee, receiver, args, at): ValueCompletion => {
        calls++;
        check(callee === t && receiver === expectedReceiver && at === loc, "dispatch identities");
        check(
            args.length === expectedArgs.length &&
                (args.length === 0 || args[0] === expectedArgs[0]),
            "dispatch args",
        );
        trace += args.length === 0 ? "get;" : "set;";
        return sentinel;
    },
};
check(accessor(a.functionPrototype, "arguments") === t, "four shared endpoints");
const bt = accessor(b.functionPrototype, "caller");
check(
    accessor(b.functionPrototype, "arguments") === bt && object(bt) !== thrower,
    "distinct Realms",
);
check(
    thrower.callable !== null &&
        thrower.callable.kind === "builtin" &&
        thrower.callable.realm === a &&
        thrower.getPrototypeOf() === a.functionPrototype &&
        !thrower.isExtensible(),
    "thrower identity",
);
check(exactKeys(thrower, ["length", "name"]), "exact keys");
for (const key of ["name", "length"]) {
    const d = thrower.getOwnProperty(key);
    check(
        d !== undefined &&
            d.kind === "data" &&
            !d.writable &&
            !d.enumerable &&
            !d.configurable &&
            !("get" in d) &&
            !("set" in d),
        "metadata flags",
    );
    if (d === undefined || d.kind !== "data") {
        throw new Error("metadata");
    }
    check(
        key === "name"
            ? d.value.kind === "string" && d.value.value === ""
            : d.value.kind === "number" && Object.is(d.value.value, 0),
        "metadata value",
    );
}
for (const key of ["prototype", "caller", "arguments"]) {
    check(thrower.getOwnProperty(key) === undefined, "no own " + key);
}
check(calls === 0 && ticks === 0 && trace === "", "inspection no effects");
console.log("R29 PASS");
const prepared = prepareStrictScript(
    { id: "restricted", text: '"use strict";function f(a){return a;}' },
    a,
);
if (prepared.kind !== "ready") {
    throw new Error("prepare");
}
function materialize(): Value {
    if (prepared.kind !== "ready") {
        throw new Error("prepare");
    }
    const r = a.createScriptFunction(
        prepared.record,
        1,
        { kind: "global", record: a.globalEnvironment },
        null,
        context,
    );
    if (r.type !== "normal" || r.value.kind !== "object") {
        throw new Error("factory");
    }
    check(
        r.value.object.callable !== null && r.value.object.callable.kind === "script-guest",
        "genuine factory",
    );
    return r.value;
}
const left = materialize(),
    right = materialize();
check(ticks === 2 && calls === 0 && object(left) !== object(right), "factory effects");
const f = object(left);
for (const key of ["caller", "arguments", "cal" + "ler", "arg" + "uments"]) {
    expectedReceiver = left;
    expectedArgs = [];
    check(
        f.getOwnProperty(key) === undefined && f.internalGet(key, left, context, loc) === sentinel,
        "R30 Get projection",
    );
    const eleven: Value = { kind: "number", value: 11 };
    expectedArgs = [eleven];
    check(
        f.internalSet(key, eleven, left, context, loc) === sentinel &&
            f.getOwnProperty(key) === undefined,
        "R30 Set projection",
    );
}
check(
    trace === "get;set;get;set;get;set;get;set;" && calls === 8 && ticks === 2,
    "literal projection trace",
);
// Input changes the actual key, Value and receiver identity after compilation.
const fields = input.split("|"),
    key = fields[0];
const seven: Value = { kind: "number", value: 7 },
    eleven: Value = { kind: "number", value: 11 };
const selected = fields[2] === "left" ? left : right,
    selectedValue = fields[1] === "7" ? seven : eleven;
check(
    input === "caller|7|left"
        ? key === "caller" && selected === left && selectedValue === seven
        : key === "arguments" && selected === right && selectedValue === eleven,
    "literal runtime selection",
);
expectedReceiver = selected;
expectedArgs = [];
check(object(selected).internalGet(key, selected, context, loc) === sentinel, "runtime Get");
expectedArgs = [selectedValue];
check(
    object(selected).internalSet(key, selectedValue, selected, context, loc) === sentinel &&
        object(selected).getOwnProperty(key) === undefined,
    "runtime Set",
);
check(
    trace === "get;set;get;set;get;set;get;set;get;set;" && calls === 10 && ticks === 2,
    "runtime literal trace",
);
object(selected).bootstrapDefine(key, { value: selectedValue, writable: true, configurable: true });
result(object(selected).internalGet(key, selected, context, loc), selectedValue);
const selectedDescriptor = object(selected).getOwnProperty(key);
const otherReceiver = selected === left ? right : left;
const otherKey = key === "caller" ? "arguments" : "caller";
check(
    selectedDescriptor !== undefined &&
        selectedDescriptor.kind === "data" &&
        selectedDescriptor.value === selectedValue &&
        object(otherReceiver).getOwnProperty(key) === undefined &&
        object(selected).getOwnProperty(otherKey) === undefined &&
        calls === 10 &&
        ticks === 2,
    "runtime shadow key/value/receiver neighbors",
);
const deletedSelected = object(selected).internalDelete(key);
check(
    deletedSelected.type === "normal" &&
        deletedSelected.value &&
        object(selected).getOwnProperty(key) === undefined,
    "runtime shadow cleanup",
);
console.log("R30 dispatch projection PASS " + input);
const deletedCaller = a.functionPrototype.internalDelete("caller");
check(deletedCaller.type === "normal" && deletedCaller.value, "delete caller");
result(f.internalGet("caller", left, context, loc), UNDEFINED);
a.functionPrototype.bootstrapDefine("arguments", { value: seven, writable: true });
result(f.internalGet("arguments", left, context, loc), seven);
f.bootstrapDefine("caller", { value: eleven, writable: true, configurable: true });
result(f.internalGet("caller", left, context, loc), eleven);
const ordinary = a.createObject();
for (const k of ["caller", "arguments"]) {
    result(ordinary.internalGet(k, obj(ordinary), context, loc), UNDEFINED);
    ordinary.bootstrapDefine(k, { value: selectedValue });
    result(ordinary.internalGet(k, obj(ordinary), context, loc), selectedValue);
}
check(
    accessor(b.functionPrototype, "caller") === bt &&
        accessor(b.functionPrototype, "arguments") === bt,
    "B unchanged",
);
a.functionPrototype.bootstrapDefine("caller", {
    get: t,
    set: t,
    enumerable: false,
    configurable: true,
});
const deletedShadow = f.internalDelete("caller");
check(deletedShadow.type === "normal" && deletedShadow.value, "delete shadow");
expectedReceiver = left;
expectedArgs = [];
check(
    f.internalGet("caller", left, context, loc) === sentinel && calls === 11 && ticks === 2,
    "restored accessor",
);
console.log("R31 PASS");
for (const k of ["name", "length"]) {
    const d = thrower.getOwnProperty(k);
    if (d === undefined || d.kind !== "data") {
        throw new Error("data");
    }
    const changed: Value = k === "name" ? { kind: "string", value: "changed" } : eleven;
    const bad = thrower.defineOwnProperty(k, { value: changed }, context, loc),
        config = thrower.defineOwnProperty(k, { configurable: true }, context, loc);
    check(
        bad.type === "normal" && !bad.value && config.type === "normal" && !config.value,
        "reject metadata changes",
    );
    const same = thrower.defineOwnProperty(
            k,
            { value: d.value, configurable: false },
            context,
            loc,
        ),
        empty = thrower.defineOwnProperty(k, {}, context, loc);
    const after = thrower.getOwnProperty(k);
    check(
        same.type === "normal" &&
            same.value &&
            empty.type === "normal" &&
            empty.value &&
            after !== undefined &&
            after.kind === "data" &&
            after.value === d.value &&
            !after.writable &&
            !after.enumerable &&
            !after.configurable,
        "equivalent metadata/unchanged",
    );
}
const added = thrower.defineOwnProperty("extra", { value: seven }, context, loc);
check(
    added.type === "normal" &&
        !added.value &&
        !thrower.setPrototypeOf(a.objectPrototype).value &&
        thrower.setPrototypeOf(a.functionPrototype).value &&
        exactKeys(thrower, ["length", "name"]),
    "frozen shape",
);
a.functionPrototype.bootstrapDefine("arguments", { get: t, set: t });
check(
    accessor(a.functionPrototype, "caller") === t &&
        accessor(a.functionPrototype, "arguments") === t,
    "configurable independently",
);
a.functionPrototype.bootstrapDefine("caller", { configurable: false });
const rejected = a.functionPrototype.defineOwnProperty("caller", { get: bt }, context, loc);
const frozen = a.functionPrototype.getOwnProperty("caller");
check(
    rejected.type === "normal" &&
        !rejected.value &&
        frozen !== undefined &&
        frozen.kind === "accessor" &&
        frozen.get === t &&
        frozen.set === t &&
        !frozen.enumerable &&
        !frozen.configurable &&
        accessor(a.functionPrototype, "arguments") === t,
    "frozen endpoint independence",
);
const replaced = a.functionPrototype.defineOwnProperty("arguments", { get: bt }, context, loc);
check(replaced.type === "normal" && replaced.value, "configurable endpoint replacement");
console.log("R32 PASS");
const evaluator = new Evaluator(legacy);
evaluator.steps = 5;
evaluator.calls = 2;
evaluator.depth = 3;
const callable = thrower.callable;
if (callable === null || callable.kind !== "builtin") {
    throw new Error("builtin");
}
hostError(() => {
    callable.invoke(left, [], context, loc);
}, "Script execution unavailable");
hostError(() => {
    evaluator.call(t, left, [], loc);
}, "cross-profile callable invocation");
hostError(() => {
    new Evaluator(a);
}, "legacy Realm required");
check(
    evaluator.steps === 5 &&
        evaluator.calls === 2 &&
        evaluator.depth === 3 &&
        evaluator.context.realm === legacy &&
        ticks === 2 &&
        calls === 11,
    "guards before effects",
);
check(
    exactKeys(legacy.functionPrototype, ["length", "name", "call", "apply", "toString"]) &&
        legacy.functionPrototype.getOwnProperty("caller") === undefined &&
        legacy.functionPrototype.getOwnProperty("arguments") === undefined,
    "legacy exact surface",
);
console.log("R35 guarded invocation PASS");
