import type { GuestObject, OperationContext, Value } from "./runtime.js";
import { toPrimitive } from "./primitive-conversion.js";
import type { Location } from "./syntax.js";
import { toLength, toIntegerOrInfinity, type NumberCompletion } from "./conversion.js";

// The caller already has an object; ToObject/primitive boxing is not provided.
export function lengthOfArrayLike(object: GuestObject, context: OperationContext, loc: Location): NumberCompletion {
    const length = object.internalGet("length", { kind: "object", object }, context, loc);
    if (length.type === "throw") return length;
    // Save the fetched Value: hooks may replace the source length property.
    const primitive = toPrimitive(length.value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    return toLength(primitive.value, loc, context.realm);
}

export function toClampedIndex(value: Value, length: number, context: OperationContext, loc: Location): NumberCompletion {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    const integer = toIntegerOrInfinity(primitive.value, loc, context.realm);
    if (integer.type === "throw") return integer;
    const index = integer.value < 0 ? length + integer.value : integer.value;
    return { type: "normal", value: Math.min(Math.max(index, 0), length) };
}
