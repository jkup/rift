import { Realm } from "../src/realm.js";
import { GuestArray } from "../src/array-object.js";
import { mapObject } from "../src/array-map.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import {
    GuestObject,
    normal,
    sameValue,
    UNDEFINED,
    type Value,
    type ValueCompletion,
} from "../src/runtime.js";
import { wellKnownSpecies, wellKnownToPrimitive } from "../src/symbols.js";

function check(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function seed(r: Realm, name: string, value: Value): void {
    r.defineScriptGlobal(name, { value, writable: true, configurable: true });
}
function run(r: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "Array", text }, r);
    if (prepared.kind !== "ready") {
        throw new Error("prepare Array");
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "session restored");
    return result;
}
function array(result: ValueCompletion, owner: Realm, length: number): GuestArray {
    if (
        result.type !== "normal" ||
        result.value.kind !== "object" ||
        !(result.value.object instanceof GuestArray)
    ) {
        throw new Error("Array result");
    }
    const object = result.value.object,
        descriptor = object.getOwnProperty("length");
    check(object.getPrototypeOf() === owner.arrayPrototype, "owning Realm prototype");
    check(
        descriptor !== undefined &&
            descriptor.kind === "data" &&
            descriptor.value.kind === "number" &&
            Object.is(descriptor.value.value, length) &&
            descriptor.writable &&
            !descriptor.enumerable &&
            !descriptor.configurable,
        "array length descriptor",
    );
    return object;
}
function boolean(result: ValueCompletion, expected: boolean): void {
    check(
        result.type === "normal" &&
            result.value.kind === "boolean" &&
            result.value.value === expected,
        "array brand",
    );
}

const r = fresh();
for (const prefix of ["", "new "]) {
    array(run(r, prefix + "Array();"), r, 0);
    for (const length of [0, -0, 3, 4294967295]) {
        seed(r, "input", { kind: "number", value: length });
        const object = array(run(r, prefix + "Array(input);"), r, length === 0 ? 0 : length);
        check(
            object.ownPropertyKeys().length === 1 && object.getOwnProperty("0") === undefined,
            "numeric length stays sparse",
        );
    }
    for (const invalid of [-1, 0.5, NaN, Infinity, -Infinity, 4294967296]) {
        seed(r, "input", { kind: "number", value: invalid });
        const result = run(r, prefix + "Array(input);");
        check(
            result.type === "throw" &&
                result.diagnostic.name === "RangeError" &&
                result.origin.kind === "engine-diagnostic",
            "invalid numeric length",
        );
    }
    const inputs: Value[] = [
        UNDEFINED,
        { kind: "null" },
        { kind: "boolean", value: false },
        { kind: "string", value: "3" },
        { kind: "symbol", value: wellKnownToPrimitive },
        { kind: "object", object: r.createNumberObject(3) },
    ];
    for (const value of inputs) {
        seed(r, "input", value);
        const object = array(run(r, prefix + "Array(input);"), r, 1),
            item = object.getOwnProperty("0");
        check(
            item !== undefined &&
                item.kind === "data" &&
                sameValue(item.value, value) &&
                item.writable &&
                item.enumerable &&
                item.configurable,
            "single non-number element",
        );
    }
    const values = array(run(r, prefix + "Array(1,undefined,3);"), r, 3);
    const keys = values.ownPropertyKeys();
    check(
        keys.length === 4 &&
            keys[0] === "0" &&
            keys[1] === "1" &&
            keys[2] === "2" &&
            keys[3] === "length",
        "multiple elements include explicit undefined",
    );
}
{
    const poison = r.createObject();
    const getter: Value = {
        kind: "object",
        object: r.createBuiltin(
            "poison",
            0,
            (_receiver, _args, _context, _loc): ValueCompletion => {
                throw new Error("Array must not coerce elements or inspect array-like properties");
            },
        ),
    };
    for (const key of ["valueOf", "toString", "length", "push", wellKnownToPrimitive]) {
        poison.bootstrapDefine(key, { get: getter });
    }
    seed(r, "input", { kind: "object", object: poison });
    array(run(r, "Array(input);"), r, 1);
    boolean(run(r, "Array.isArray(input);"), false);
    const fake = new GuestObject(r.arrayPrototype);
    seed(r, "input", { kind: "object", object: fake });
    boolean(run(r, "Array.isArray(input);"), false);
    const real = r.createArray();
    real.setPrototypeOf(null);
    seed(r, "input", { kind: "object", object: real });
    boolean(run(r, "Array.isArray(input);"), true);
    boolean(run(r, "Array.isArray(Array.prototype);"), true);
}
{
    const other = fresh();
    if (other.arrayConstructor === null) {
        throw new Error("Array intrinsic");
    }
    seed(r, "ForeignArray", { kind: "object", object: other.arrayConstructor });
    array(run(r, "ForeignArray(2);"), other, 2);
    array(run(r, "new ForeignArray(1,2);"), other, 2);
}
for (const owner of [r, fresh()]) {
    if (owner.arrayConstructor === null) {
        throw new Error("Array intrinsic");
    }
    const source = owner.createArray();
    let gets = 0;
    const species: Value = {
        kind: "object",
        object: owner.createBuiltin(
            "species",
            0,
            (_receiver, _args, _context, _loc): ValueCompletion => {
                gets++;
                return normal();
            },
        ),
    };
    owner.arrayConstructor.bootstrapDefine(wellKnownSpecies, { get: species, configurable: true });
    seed(owner, "Array", { kind: "number", value: 0 });
    const callback: Value = {
        kind: "object",
        object: r.createBuiltin(
            "callback",
            1,
            (_receiver, _args, _context, _loc): ValueCompletion => {
                throw new Error("empty map callback");
            },
        ),
    };
    seed(r, "probe", {
        kind: "object",
        object: r.createBuiltin("probe", 0, (_receiver, _args, context, loc): ValueCompletion =>
            mapObject(source, callback, UNDEFINED, context, loc),
        ),
    });
    array(run(r, "probe();"), r, 0);
    check(
        gets === (owner === r ? 1 : 0),
        "foreign intrinsic skips species before lookup despite global rebinding",
    );
}
{
    let interrupted = false,
        completed = false;
    for (let steps = 0; steps < 30; steps++) {
        const owner = fresh(),
            result = run(owner, "Array(1,2,3);", steps);
        if (result.type === "throw") {
            check(result.origin.kind === "resource-limit", "array allocation budget");
            interrupted = true;
        } else {
            array(result, owner, 3);
            completed = true;
        }
    }
    check(interrupted && completed, "array construction budget boundary");
}
console.log("Array constructor passed");
