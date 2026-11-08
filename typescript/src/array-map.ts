import { createDefaultSpeciesArray } from "./array-species.js";
import { lengthOfArrayLike } from "./array-like.js";
import { languageFailure, normal, type GuestObject, type OperationContext, type Value, type ValueCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";

// Internal object-only operation. Boxing and non-default species are deferred.
export function mapObjectDefaultArray(object: GuestObject, callback: Value, thisArg: Value, context: OperationContext, loc: Location): ValueCompletion {
    const length = lengthOfArrayLike(object, context, loc);
    if (length.type === "throw") return length;
    if (callback.kind !== "object" || callback.object.callable === null) return languageFailure(context.realm, "TypeError", "map callback is not callable", loc);
    const input: Value = { kind: "object", object };
    const created = createDefaultSpeciesArray(object, length.value, "map", context, loc);
    if (created.type === "throw") return created;
    const result = created.value;
    // Only the limit is captured. Presence and values are observed after each
    // callback, and holes consume the same active budget as present elements.
    for (let k = 0; k < length.value; k++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const key = String(k);
        const present = object.internalHasProperty(key, loc);
        if (present.type === "throw") return present;
        if (!present.value) continue;
        const element = object.internalGet(key, input, context, loc);
        if (element.type === "throw") return element;
        const mapped = context.call(callback, thisArg, [element.value, { kind: "number", value: k }, input], loc);
        if (mapped.type === "throw") return mapped;
        const defined = result.defineOwnProperty(key, { value: mapped.value, writable: true, enumerable: true, configurable: true }, context, loc);
        if (defined.type === "throw") return defined;
        if (!defined.value) throw new Error("fresh map array element invariant");
    }
    return normal({ kind: "object", object: result });
}
