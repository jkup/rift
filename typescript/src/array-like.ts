import type { GuestObject } from "./runtime.js";
import type { Location } from "./syntax.js";
import { toLength, type NumberCompletion } from "./conversion.js";

// The caller already has an object; ToObject/primitive boxing is not provided.
export function lengthOfArrayLike(object: GuestObject, loc: Location): NumberCompletion {
    const length = object.internalGet("length", { kind: "object", object }, loc);
    if (length.type === "throw") return length;
    return toLength(length.value, loc);
}
