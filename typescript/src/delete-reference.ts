import { failure, normal, type Reference, type OperationContext, type ValueCompletion } from "./runtime.js";
import { toObject } from "./object-conversion.js";
import { toPropertyKey } from "./conversion.js";
import { formatPropertyKey } from "./symbols.js";
import type { Location } from "./syntax.js";

export function deleteReference(ref: Reference, context: OperationContext, loc: Location, strict = true): ValueCompletion {
    if (ref.kind !== "property") throw new Error("delete requires a property reference");
    // Fixed 2025 ordering: box the captured base before converting the deferred
    // key. Nullish bases suppress key hooks, but not key-expression evaluation.
    const base = toObject(ref.base, context, ref.loc);
    if (base.type === "throw") return base;
    const object = base.value;
    const key = toPropertyKey(ref.key, context, ref.loc);
    if (key.type === "throw") return key;
    const deleted = object.internalDelete(key.value);
    if (deleted.type === "throw") return deleted;
    if (!deleted.value && strict) return failure("TypeError", "property is not configurable: " + formatPropertyKey(key.value), loc);
    return normal({ kind: "boolean", value: deleted.value });
}
