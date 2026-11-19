import { Realm } from "../src/realm.js";
import {
    GuestObject,
    normal,
    sameValue,
    UNDEFINED,
    type Value,
    type ValueCompletion,
    type OperationContext,
    type PropertyKey,
    type InternalBooleanCompletion,
} from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { wellKnownToPrimitive } from "../src/symbols.js";
import type { Location } from "../src/syntax.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function obj(object: GuestObject): Value {
    return { kind: "object", object };
}
function seed(r: Realm, name: string, value: Value): void {
    r.defineScriptGlobal(name, { value, writable: true, configurable: true });
}
function data(object: GuestObject, key: PropertyKey, value: Value): void {
    object.bootstrapDefine(key, { value, writable: true, configurable: true });
}
function run(r: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "descriptor", text }, r);
    if (prepared.kind !== "ready") {
        throw new Error("prepare descriptor");
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    check(session.inspect().active === null && session.inspect().calls === 0, "session restored");
    return result;
}
function value(completion: ValueCompletion): Value {
    if (completion.type !== "normal") {
        throw new Error("normal descriptor completion");
    }
    return completion.value;
}
function object(completion: ValueCompletion): GuestObject {
    const result = value(completion);
    if (result.kind !== "object") {
        throw new Error("descriptor object");
    }
    return result.object;
}
function typeError(completion: ValueCompletion): void {
    check(
        completion.type === "throw" &&
            completion.diagnostic.name === "TypeError" &&
            completion.origin.kind === "engine-diagnostic",
        "descriptor TypeError",
    );
}
class Observed extends GuestObject {
    trace = "";
    internalHasProperty(key: PropertyKey, loc: Location): InternalBooleanCompletion {
        this.trace += "H" + key + ";";
        return super.internalHasProperty(key, loc);
    }
    internalGet(
        key: PropertyKey,
        receiver: Value,
        context: OperationContext,
        loc: Location,
    ): ValueCompletion {
        this.trace += "G" + key + ";";
        return super.internalGet(key, receiver, context, loc);
    }
}
const fields = ["enumerable", "configurable", "value", "writable", "get", "set"];
for (const accessor of [false, true]) {
    const r = fresh(),
        inherited = r.createObject(),
        attrs = new Observed(inherited),
        target = r.createObject();
    data(inherited, "enumerable", { kind: "string", value: "yes" });
    data(inherited, "configurable", { kind: "number", value: 0 });
    if (accessor) {
        data(inherited, "get", UNDEFINED);
        data(inherited, "set", UNDEFINED);
    } else {
        data(inherited, "value", UNDEFINED);
        data(inherited, "writable", { kind: "object", object: r.createObject() });
    }
    seed(r, "attrs", obj(attrs));
    seed(r, "target", obj(target));
    seed(r, "symbol", { kind: "symbol", value: wellKnownToPrimitive });
    check(
        sameValue(value(run(r, "Object.defineProperty(target,symbol,attrs);")), obj(target)),
        "define returns exact target",
    );
    const expected = accessor
        ? "Henumerable;Genumerable;Hconfigurable;Gconfigurable;Hvalue;Hwritable;Hget;Gget;Hset;Gset;"
        : "Henumerable;Genumerable;Hconfigurable;Gconfigurable;Hvalue;Gvalue;Hwritable;Gwritable;Hget;Hset;";
    check(attrs.trace === expected, "ordered inherited descriptor fields");
    const stored = target.getOwnProperty(wellKnownToPrimitive);
    check(
        stored !== undefined &&
            stored.enumerable &&
            !stored.configurable &&
            stored.kind === (accessor ? "accessor" : "data"),
        "stored attributes",
    );
    const descriptor = object(run(r, "Object.getOwnPropertyDescriptor(target,symbol);"));
    check(descriptor.getPrototypeOf() === r.objectPrototype, "descriptor Realm");
    const keys = descriptor.ownPropertyKeys(),
        expectedKeys = accessor
            ? ["get", "set", "enumerable", "configurable"]
            : ["value", "writable", "enumerable", "configurable"];
    check(keys.length === 4, "complete descriptor fields");
    for (let i = 0; i < keys.length; i++) {
        check(keys[i] === expectedKeys[i], "descriptor field order");
        const field = descriptor.getOwnProperty(keys[i]);
        check(
            field !== undefined &&
                field.kind === "data" &&
                field.writable &&
                field.enumerable &&
                field.configurable,
            "descriptor field flags",
        );
    }
    data(descriptor, accessor ? "get" : "value", { kind: "number", value: 99 });
    const again = object(run(r, "Object.getOwnPropertyDescriptor(target,symbol);"));
    check(again !== descriptor, "detached descriptor identity");
    const original = again.getOwnProperty(accessor ? "get" : "value");
    check(
        original !== undefined && original.kind === "data" && original.value.kind === "undefined",
        "descriptor edits do not mutate target",
    );
}
{
    const r = fresh(),
        attrs = new Observed(r.objectPrototype),
        target = r.createObject();
    for (const field of fields) {
        data(attrs, field, UNDEFINED);
    }
    seed(r, "attrs", obj(attrs));
    seed(r, "target", obj(target));
    typeError(run(r, "Object.defineProperty(target,'x',attrs);"));
    check(
        attrs.trace ===
            "Henumerable;Genumerable;Hconfigurable;Gconfigurable;Hvalue;Gvalue;Hwritable;Gwritable;Hget;Gget;Hset;Gset;" &&
            target.getOwnProperty("x") === undefined,
        "mixed fields rejected only after ordered reads",
    );
    data(attrs, "get", { kind: "null" });
    attrs.trace = "";
    typeError(run(r, "Object.defineProperty(target,'x',attrs);"));
    check(
        attrs.trace.endsWith("Hget;Gget;") && !attrs.trace.includes("Hset;"),
        "invalid getter prevents reading setter",
    );
}
for (const field of fields) {
    const r = fresh(),
        attrs = r.createObject(),
        target = r.createObject();
    seed(r, "target", obj(target));
    seed(r, "attrs", obj(attrs));
    const getter = value(run(r, "function fail(){throw target;} fail;"));
    attrs.bootstrapDefine(field, { get: getter });
    const thrown = run(r, "Object.defineProperty(target,'x',attrs);");
    check(
        thrown.type === "throw" &&
            thrown.origin.kind === "guest" &&
            sameValue(thrown.value, obj(target)) &&
            target.getOwnProperty("x") === undefined,
        "exact descriptor getter throw before definition",
    );
}
{
    const r = fresh(),
        target = r.createObject(),
        attrs = new Observed(r.objectPrototype),
        key = r.createObject();
    data(attrs, "value", UNDEFINED);
    data(
        key,
        wellKnownToPrimitive,
        obj(
            r.createBuiltin("key", 1, (_receiver, args, _context, _loc): ValueCompletion => {
                check(
                    args.length === 1 && sameValue(args[0], { kind: "string", value: "string" }),
                    "key string hint",
                );
                attrs.trace += "K;";
                return normal({ kind: "string", value: "x" });
            }),
        ),
    );
    seed(r, "target", obj(target));
    seed(r, "attrs", obj(attrs));
    seed(r, "key", obj(key));
    typeError(run(r, "Object.defineProperty(1,key,attrs);"));
    check(attrs.trace === "", "define target validation precedes key and attrs");
    typeError(run(r, "Object.getOwnPropertyDescriptor(null,key);"));
    check(attrs.trace === "", "descriptor boxing precedes key");
    value(run(r, "Object.defineProperty(target,key,attrs);"));
    check(attrs.trace.startsWith("K;Henumerable;"), "key conversion before descriptor fields");
}
{
    const owner = fresh(),
        caller = fresh();
    const constructor = owner.globalObject.getOwnProperty("Object");
    if (
        constructor === undefined ||
        constructor.kind !== "data" ||
        constructor.value.kind !== "object"
    ) {
        throw new Error("Object constructor");
    }
    const method = constructor.value.object.getOwnProperty("getOwnPropertyDescriptor");
    if (method === undefined || method.kind !== "data") {
        throw new Error("descriptor method");
    }
    seed(caller, "inspect", method.value);
    const descriptor = object(run(caller, "inspect('a','0');"));
    check(
        descriptor.getPrototypeOf() === owner.objectPrototype,
        "foreign builtin owns descriptor object",
    );
    const target = caller.createObject();
    target.preventExtensions();
    seed(caller, "target", obj(target));
    typeError(run(caller, "Object.defineProperty(target,'x',{});"));
    check(
        target.getOwnProperty("x") === undefined,
        "nonextensible definition fails without mutation",
    );
}
{
    let interrupted = false,
        completed = false;
    for (let steps = 0; steps < 45; steps++) {
        const r = fresh(),
            target = r.createObject();
        seed(r, "target", obj(target));
        const completion = run(r, "Object.defineProperty(target,'x',{value:7});", steps);
        if (completion.type === "throw") {
            check(
                completion.origin.kind === "resource-limit" &&
                    target.getOwnProperty("x") === undefined,
                "descriptor conversion budget prevents definition",
            );
            interrupted = true;
        } else {
            check(target.getOwnProperty("x") !== undefined, "completed bounded definition");
            completed = true;
        }
    }
    check(interrupted && completed, "descriptor conversion budget boundary");
}
console.log("Property descriptor reflection passed");
