import { toObject } from "./object-conversion.js";
import type { OperationContext, PropertyKey, Value, ValueCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export function invoke(
    receiver: Value,
    key: PropertyKey,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const object = toObject(receiver, context, loc);
    if (object.type === "throw") {
        return object;
    }
    const tick = context.tick(loc);
    if (tick.type === "throw") {
        return tick;
    }
    const method = object.value.internalGet(key, receiver, context, loc);
    if (method.type === "throw") {
        return method;
    }
    return context.call(method.value, receiver, args, loc);
}
