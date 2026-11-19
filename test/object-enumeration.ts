import { Realm } from "../src/realm.js";
import { GuestArray } from "../src/array-object.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import {
    normal,
    sameValue,
    type GuestObject,
    type Value,
    type ValueCompletion,
} from "../src/runtime.js";
import { wellKnownToPrimitive } from "../src/symbols.js";

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
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("own data property");
    }
    return descriptor.value;
}
function run(r: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "enumeration", text }, r);
    if (prepared.kind !== "ready") {
        throw new Error("prepare enumeration");
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "session restored");
    return result;
}
function array(value: Value, owner: Realm, expected: Value[]): GuestArray {
    if (value.kind !== "object" || !(value.object instanceof GuestArray)) {
        throw new Error("enumeration array");
    }
    const object = value.object;
    check(
        object.getPrototypeOf() === owner.arrayPrototype &&
            sameValue(own(object, "length"), { kind: "number", value: expected.length }),
        "array Realm and length",
    );
    check(object.ownPropertyKeys().length === expected.length + 1, "dense result own keys");
    for (let i = 0; i < expected.length; i++) {
        const descriptor = object.getOwnProperty(String(i));
        check(
            descriptor !== undefined &&
                descriptor.kind === "data" &&
                sameValue(descriptor.value, expected[i]) &&
                descriptor.writable &&
                descriptor.enumerable &&
                descriptor.configurable,
            "result element and attributes",
        );
    }
    return object;
}
function result(completion: ValueCompletion): Value {
    if (completion.type !== "normal") {
        throw new Error("normal enumeration");
    }
    return completion.value;
}
function string(value: string): Value {
    return { kind: "string", value };
}
function number(value: number): Value {
    return { kind: "number", value };
}

for (const method of ["keys", "values", "entries"]) {
    const r = fresh(),
        object = r.createObject();
    let effects = "";
    const getter: Value = {
        kind: "object",
        object: r.createBuiltin("first", 0, (receiver, _args, context, _loc): ValueCompletion => {
            check(
                receiver.kind === "object" && receiver.object === object && context.realm === r,
                "getter receiver and Realm",
            );
            effects += "G";
            object.internalDelete("gone");
            object.bootstrapDefine("hiddenLater", { enumerable: false });
            object.bootstrapDefine("visibleLater", { enumerable: true });
            object.bootstrapDefine("added", { value: number(99), enumerable: true });
            return normal(number(7));
        }),
    };
    const poison: Value = {
        kind: "object",
        object: r.createBuiltin(
            "poison",
            0,
            (_receiver, _args, _context, _loc): ValueCompletion => {
                throw new Error("excluded getter invoked");
            },
        ),
    };
    object.bootstrapDefine("first", { get: getter, enumerable: true });
    object.bootstrapDefine("gone", { value: number(1), enumerable: true, configurable: true });
    object.bootstrapDefine("hiddenLater", {
        value: number(2),
        enumerable: true,
        configurable: true,
    });
    object.bootstrapDefine("visibleLater", { value: number(3), configurable: true });
    object.bootstrapDefine("hidden", { get: poison });
    object.bootstrapDefine(wellKnownToPrimitive, { get: poison, enumerable: true });
    seed(r, "input", { kind: "object", object });
    const value = result(run(r, "Object." + method + "(input);"));
    if (method === "keys") {
        array(value, r, [string("first"), string("gone"), string("hiddenLater")]);
        check(effects === "", "keys never invokes getters");
    } else if (method === "values") {
        array(value, r, [number(7), number(3)]);
    } else {
        if (value.kind !== "object") {
            throw new Error("entries result");
        }
        const first = own(value.object, "0"),
            second = own(value.object, "1");
        array(value, r, [first, second]);
        const left = array(first, r, [string("first"), number(7)]);
        const right = array(second, r, [string("visibleLater"), number(3)]);
        check(left !== right && left !== value.object, "distinct entry arrays");
    }
    if (method !== "keys") {
        check(effects === "G", "single getter and live descriptor checks");
    }
}
for (const method of ["values", "entries"]) {
    const r = fresh(),
        object = r.createObject();
    seed(r, "input", { kind: "object", object });
    const prepared = prepareBoundedScript(
        { id: "getter", text: "function getter(){throw input;} getter;" },
        r,
    );
    if (prepared.kind !== "ready") {
        throw new Error("prepare getter");
    }
    const getter = result(evaluateScript(createScriptSession(), prepared.record).completion);
    object.bootstrapDefine("first", { get: getter, enumerable: true });
    object.bootstrapDefine("next", {
        get: {
            kind: "object",
            object: r.createBuiltin(
                "poison",
                0,
                (_receiver, _args, _context, _loc): ValueCompletion => {
                    throw new Error("read after abrupt getter");
                },
            ),
        },
        enumerable: true,
    });
    const completion = run(r, "Object." + method + "(input);");
    check(
        completion.type === "throw" &&
            completion.origin.kind === "guest" &&
            completion.value.kind === "object" &&
            completion.value.object === object,
        "exact getter throw identity",
    );
}
{
    const owner = fresh(),
        caller = fresh();
    const constructor = own(owner.globalObject, "Object");
    if (constructor.kind !== "object") {
        throw new Error("Object constructor");
    }
    for (const method of ["keys", "values", "entries"]) {
        seed(caller, "enumerate", own(constructor.object, method));
        const first = result(run(caller, "enumerate({});")),
            second = result(run(caller, "enumerate({});"));
        check(
            array(first, owner, []) !== array(second, owner, []),
            "fresh empty result in builtin Realm",
        );
    }
}
{
    const r = fresh();
    for (const method of ["keys", "values", "entries"]) {
        let interrupted = false,
            completed = false;
        for (let steps = 0; steps < 50; steps++) {
            const completion = run(r, "Object." + method + "({a:1,b:2});", steps);
            if (completion.type === "throw") {
                check(completion.origin.kind === "resource-limit", "enumeration resource bound");
                interrupted = true;
            } else {
                check(
                    completion.value.kind === "object" &&
                        sameValue(own(completion.value.object, "length"), number(2)),
                    "completed bounded result",
                );
                completed = true;
            }
        }
        check(interrupted && completed, "enumeration budget boundary");
    }
    seed(r, "symbol", { kind: "symbol", value: wellKnownToPrimitive });
    array(result(run(r, "Object.keys(symbol);")), r, []);
    array(result(run(r, "Object.values(symbol);")), r, []);
}
console.log("Object enumeration passed");
