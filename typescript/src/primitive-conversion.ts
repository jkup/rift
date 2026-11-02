import { failure, normal, type OperationContext, type Value, type ValueCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

export type PrimitiveHint = "default" | "number" | "string";
export type OrdinaryPrimitiveHint = "number" | "string";

export function ordinaryToPrimitive(
    input: Value, hint: OrdinaryPrimitiveHint,
    context: OperationContext, loc: Location,
): ValueCompletion {
    if (input.kind !== "object") throw new Error("ordinaryToPrimitive requires an object");
    const names = hint === "string" ? ["toString", "valueOf"] : ["valueOf", "toString"];
    for (const name of names) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        // Lookup stays inside the loop: the preceding call may replace the method
        // or prototype. Preserve the original Value as both Get and Call receiver.
        const method = input.object.internalGet(name, input, loc);
        if (method.type === "throw") return method;
        if (method.value.kind !== "object" || method.value.object.callable === null) continue;
        const result = context.call(method.value, input, [], loc);
        if (result.type === "throw") return result;
        if (result.value.kind !== "object") return result;
    }
    return failure("TypeError", "cannot convert object to primitive", loc);
}

// Partial ToPrimitive: all primitive Values pass through unchanged.
// Object conversion uses ordinary methods; exotic symbol hooks remain deferred.
export function toPrimitive(
    input: Value, hint: PrimitiveHint,
    context: OperationContext, loc: Location,
): ValueCompletion {
    if (input.kind !== "object") return normal(input);
    return ordinaryToPrimitive(input, hint === "default" ? "number" : hint, context, loc);
}
