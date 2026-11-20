import { toPropertyKey } from "../conversion.js";
import { toObject } from "../object-conversion.js";
import type { Realm } from "../realm.js";
import {
    GuestObject,
    languageFailure,
    normal,
    UNDEFINED,
    type OperationContext,
    type PropertyDescriptorUpdate,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import type { Location } from "../syntax.js";

// ECMAScript legacy Object.prototype accessor methods.
// https://tc39.es/ecma262/#sec-legacy-object.prototype-accessor-methods
function defineAccessor(
    receiver: Value,
    args: Value[],
    getter: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const object = toObject(receiver, context, loc);
    if (object.type === "throw") {
        return object;
    }
    const accessor = args.length < 2 ? UNDEFINED : args[1];
    if (accessor.kind !== "object" || accessor.object.callable === null) {
        return languageFailure(context.realm, "TypeError", "accessor must be callable", loc);
    }
    const key = toPropertyKey(args.length === 0 ? UNDEFINED : args[0], context, loc);
    if (key.type === "throw") {
        return key;
    }
    // Omit the opposite accessor: redefining one half preserves the other half.
    const descriptor: PropertyDescriptorUpdate = getter
        ? { get: accessor, enumerable: true, configurable: true }
        : { set: accessor, enumerable: true, configurable: true };
    const tick = context.tick(loc);
    if (tick.type === "throw") {
        return tick;
    }
    const defined = object.value.defineOwnProperty(key.value, descriptor, context, loc);
    if (defined.type === "throw") {
        return defined;
    }
    if (!defined.value) {
        return languageFailure(context.realm, "TypeError", "cannot define accessor", loc);
    }
    return normal();
}

function lookupAccessor(
    receiver: Value,
    args: Value[],
    getter: boolean,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const object = toObject(receiver, context, loc);
    if (object.type === "throw") {
        return object;
    }
    const key = toPropertyKey(args.length === 0 ? UNDEFINED : args[0], context, loc);
    if (key.type === "throw") {
        return key;
    }
    let candidate: GuestObject | null = object.value;
    while (candidate instanceof GuestObject) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        const descriptor = candidate.getOwnProperty(key.value);
        if (descriptor !== undefined) {
            if (descriptor.kind === "accessor") {
                return normal(getter ? descriptor.get : descriptor.set);
            }
            return normal();
        }
        candidate = candidate.getPrototypeOf();
    }
    return normal();
}

export function registerLegacyAccessors(realm: Realm): void {
    for (const name of ["__defineGetter__", "__defineSetter__"] as const) {
        realm.registerBuiltin(realm.objectPrototype, name, 2, (receiver, args, context, loc) =>
            defineAccessor(receiver, args, name === "__defineGetter__", context, loc),
        );
    }
    for (const name of ["__lookupGetter__", "__lookupSetter__"] as const) {
        realm.registerBuiltin(realm.objectPrototype, name, 1, (receiver, args, context, loc) =>
            lookupAccessor(receiver, args, name === "__lookupGetter__", context, loc),
        );
    }
}
