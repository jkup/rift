import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { toString } from "../conversion.js";
import { toPrimitive } from "../primitive-conversion.js";
import type { Realm } from "../realm.js";
import {
    GuestError,
    type GuestObject,
    normal,
    UNDEFINED,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import type { Location } from "../syntax.js";

// https://tc39.es/ecma262/#sec-suppressederror-constructor
function createSuppressedError(
    newTarget: GuestObject,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const prototype = getPrototypeFromConstructor(newTarget, "SuppressedError", context, loc);
    if (prototype.type === "throw") {
        return prototype;
    }
    const allocation = context.tick(loc);
    if (allocation.type === "throw") {
        return allocation;
    }
    const error = new GuestError(prototype.value);
    const message = args.length < 3 ? UNDEFINED : args[2];
    if (message.kind !== "undefined") {
        const primitive = toPrimitive(message, "string", context, loc);
        if (primitive.type === "throw") {
            return primitive;
        }
        const text = toString(primitive.value, loc, context.realm);
        if (text.type === "throw") {
            return text;
        }
        error.bootstrapDefine("message", {
            value: { kind: "string", value: text.value },
            writable: true,
            enumerable: false,
            configurable: true,
        });
    }
    // Neither payload is coerced; unlike Error, a fourth cause option is ignored.
    for (let index = 0; index < 2; index++) {
        error.bootstrapDefine(index === 0 ? "error" : "suppressed", {
            value: args.length <= index ? UNDEFINED : args[index],
            writable: true,
            enumerable: false,
            configurable: true,
        });
    }
    return normal({ kind: "object", object: error });
}

export function createSuppressedErrorConstructor(realm: Realm): GuestObject {
    const constructor = realm.createBuiltinConstructor(
        "SuppressedError",
        3,
        (_receiver, args, context, loc) => createSuppressedError(constructor, args, context, loc),
        (_callee, newTarget, args, context, loc) =>
            createSuppressedError(newTarget, args, context, loc),
    );
    return constructor;
}
