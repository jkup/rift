import { GuestArray } from "./array-object.js";
import { lengthOfArrayLike } from "./array-like.js";
import { languageFailure, unsupportedFailure, normal, type GuestObject, type OperationContext, type Value, type ValueCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";
import { wellKnownSpecies } from "./symbols.js";

// Internal object-only operation. Boxing and non-default species are deferred.
export function mapObjectDefaultArray(object: GuestObject, callback: Value, thisArg: Value, context: OperationContext, loc: Location): ValueCompletion {
    const length = lengthOfArrayLike(object, context, loc);
    if (length.type === "throw") return length;
    if (callback.kind !== "object" || callback.object.callable === null) return languageFailure(context.realm, "TypeError", "map callback is not callable", loc);
    const input: Value = { kind: "object", object };
    if (object instanceof GuestArray) {
        const constructor = object.internalGet("constructor", input, context, loc);
        if (constructor.type === "throw") return constructor;
        if (context.realm.profile === "legacy") {
            if (constructor.value.kind !== "undefined") return unsupportedFailure("runtime.map-species", "TypeError", "unsupported map constructor/species", loc);
        } else {
            let selected = constructor.value;
            // No Realm has an intrinsic Array constructor yet, so the foreign
            // intrinsic exception has no representable case. Names and prototype
            // properties do not establish intrinsic identity.
            if (selected.kind === "object") {
                const species = selected.object.internalGet(wellKnownSpecies, selected, context, loc);
                if (species.type === "throw") return species;
                selected = species.value.kind === "null" ? { kind: "undefined" } : species.value;
            }
            if (selected.kind !== "undefined") {
                if (selected.kind !== "object" || selected.object.constructorSlot === null)
                    return languageFailure(context.realm, "TypeError", "map species is not a constructor", loc);
                // Recognize constructibility without invoking a constructor or
                // acquiring construction authority for this bounded operation.
                return unsupportedFailure("runtime.map-species", "TypeError", "unsupported map constructor/species", loc);
            }
        }
    }
    if (length.value > 4294967295) return languageFailure(context.realm, "RangeError", "map result length exceeds array limit", loc);
    const result = context.realm.createArray();
    const initialized = result.defineOwnProperty("length", { value: { kind: "number", value: length.value } }, context, loc);
    if (initialized.type === "throw" || !initialized.value) throw new Error("fresh map array length invariant");
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
