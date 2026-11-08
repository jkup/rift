import type { Realm } from "../realm.js";
import { toObject } from "../object-conversion.js";
import { GuestError, normal, UNDEFINED, type Value } from "../runtime.js";
import { toPropertyKey } from "../conversion.js";
import { registerObjectEnumeration } from "./object-enumeration.js";
import { GuestArray } from "../array-object.js";
import { GuestBoolean, GuestNumber, GuestStringObject } from "../primitive-objects.js";
import { wellKnownToStringTag } from "../symbols.js";
import type { OperationContext, ValueCompletion } from "../runtime.js";
import type { Location } from "../syntax.js";

function objectArgument(args: Value[], context: OperationContext, loc: Location): ValueCompletion {
    const value = args.length === 0 ? undefined : args[0];
    // Equal-newTarget construction and call both preserve an existing object.
    if (value !== undefined && value.kind === "object") return normal(value);
    const allocation = context.tick(loc);
    if (allocation.type === "throw") return allocation;
    if (value === undefined || value.kind === "undefined" || value.kind === "null")
        return normal({ kind: "object", object: context.realm.createObject() });
    const boxed = toObject(value, context, loc);
    if (boxed.type === "throw") return boxed;
    return normal({ kind: "object", object: boxed.value });
}

export function registerObject(realm: Realm): void {
    const constructor = realm.createBuiltinConstructor("Object", 1,
        (_receiver, args, context, loc) => objectArgument(args, context, loc),
        (_callee, args, context, loc) => objectArgument(args, context, loc));
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.objectPrototype }, writable: false, enumerable: false, configurable: false });
    realm.registerBuiltin(constructor, "hasOwn", 2, (_receiver, args, context, loc) => {
        const object = toObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (object.type === "throw") return object;
        const key = toPropertyKey(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (key.type === "throw") return key;
        return normal({ kind: "boolean", value: object.value.getOwnProperty(key.value) !== undefined });
    });
    realm.objectPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    registerObjectEnumeration(realm, constructor);
    realm.registerBuiltin(realm.objectPrototype, "hasOwnProperty", 1, (receiver, args, context, loc) => {
        const key = toPropertyKey(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (key.type === "throw") return key;
        const object = toObject(receiver, context, loc);
        if (object.type === "throw") return object;
        return normal({ kind: "boolean", value: object.value.getOwnProperty(key.value) !== undefined });
    });
    realm.defineScriptGlobal("Object", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}

export function registerObjectValueOf(realm: Realm): void {
    realm.registerBuiltin(realm.objectPrototype, "valueOf", 0, (receiver, _args, context, loc) => {
        const result = toObject(receiver, context, loc);
        if (result.type === "throw") return result;
        return normal({ kind: "object", object: result.value });
    });
}

export function registerObjectToString(realm: Realm): Value {
    return realm.registerBuiltin(realm.objectPrototype, "toString", 0, (receiver, _args, context, loc) => {
        if (receiver.kind === "undefined") return normal({ kind: "string", value: "[object Undefined]" });
        if (receiver.kind === "null") return normal({ kind: "string", value: "[object Null]" });
        const boxed = toObject(receiver, context, loc);
        if (boxed.type === "throw") return boxed;
        const object = boxed.value;
        // Classification precedes observable Get. Symbol has no builtin tag:
        // its prototype's real symbol property supplies the public tag instead.
        let tag = "Object";
        if (object instanceof GuestArray) tag = "Array";
        else if (object.callable !== null) tag = "Function";
        else if (object instanceof GuestError) tag = "Error";
        else if (object instanceof GuestBoolean) tag = "Boolean";
        else if (object instanceof GuestNumber) tag = "Number";
        else if (object instanceof GuestStringObject) tag = "String";
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const custom = object.internalGet(wellKnownToStringTag, { kind: "object", object }, context, loc);
        if (custom.type === "throw") return custom;
        if (custom.value.kind === "string") tag = custom.value.value;
        return normal({ kind: "string", value: "[object " + tag + "]" });
    });
}
