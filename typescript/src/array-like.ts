import type { GuestObject, OperationContext } from "./runtime.js";
import { toPrimitive } from "./primitive-conversion.js";
import type { Location } from "./syntax.js";
import { toLength, type NumberCompletion } from "./conversion.js";

// The caller already has an object; ToObject/primitive boxing is not provided.
export function lengthOfArrayLike(object: GuestObject, context: OperationContext, loc: Location): NumberCompletion {
    const length = object.internalGet("length", { kind: "object", object }, loc);
    if (length.type === "throw") return length;
    // Save the fetched Value: hooks may replace the source length property.
    const primitive = toPrimitive(length.value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    return toLength(primitive.value, loc);
}
