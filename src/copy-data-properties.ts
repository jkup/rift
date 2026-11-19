import { toObject } from "./object-conversion.js";
import {
    normal,
    languageFailure,
    type GuestObject,
    type Value,
    type PropertyKey,
    type OperationContext,
    type ValueCompletion,
} from "./runtime.js";
import type { Location } from "./syntax.js";

export function copyDataProperties(
    target: GuestObject,
    source: Value,
    excluded: Set<PropertyKey> | null,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (source.kind === "undefined" || source.kind === "null") {
        return normal();
    }
    const boxed = toObject(source, context, loc);
    if (boxed.type === "throw") {
        return boxed;
    }
    const receiver: Value = { kind: "object", object: boxed.value };
    for (const key of boxed.value.ownPropertyKeys()) {
        const tick = context.tick(loc);
        if (tick.type === "throw") {
            return tick;
        }
        if (excluded !== null && excluded.has(key)) {
            continue;
        }
        const descriptor = boxed.value.getOwnProperty(key);
        if (descriptor === undefined || !descriptor.enumerable) {
            continue;
        }
        const value = boxed.value.internalGet(key, receiver, context, loc);
        if (value.type === "throw") {
            return value;
        }
        const defined = target.defineOwnProperty(
            key,
            { value: value.value, writable: true, enumerable: true, configurable: true },
            context,
            loc,
        );
        if (defined.type === "throw") {
            return defined;
        }
        if (!defined.value) {
            return languageFailure(context.realm, "TypeError", "cannot copy data property", loc);
        }
    }
    return normal();
}
