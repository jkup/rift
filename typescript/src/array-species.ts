import { GuestArray } from "./array-object.js";
import { languageFailure, unsupportedFailure, type GuestObject, type OperationContext, type Value } from "./runtime.js";
import type { Location } from "./syntax.js";
import { wellKnownSpecies } from "./symbols.js";

import { createArrayWithLength } from "./array-create.js";
import type { ObjectCompletion } from "./object-conversion.js";

export function arraySpeciesCreate(object: GuestObject, length: number, method: "map" | "splice" | "slice" | "concat" | "filter" | "flat" | "flatMap", context: OperationContext, loc: Location): ObjectCompletion {
    const input: Value = { kind: "object", object };
    const capability = method === "flatMap" ? "runtime.flatmap-species" : `runtime.${method}-species` as const;
    if (object instanceof GuestArray) {
        const constructor = object.internalGet("constructor", input, context, loc);
        if (constructor.type === "throw") return constructor;
        if (context.realm.profile === "legacy") {
            if (constructor.value.kind !== "undefined") return unsupportedFailure(capability, "TypeError", "unsupported " + method + " constructor/species", loc);
        } else {
            let selected = constructor.value;
            if (selected.kind === "object") {
                const callable = selected.object.callable;
                if (callable !== null && callable.realm !== context.realm && callable.realm.arrayConstructor === selected.object)
                    selected = { kind: "undefined" };
            }
            if (selected.kind === "object") {
                const species = selected.object.internalGet(wellKnownSpecies, selected, context, loc);
                if (species.type === "throw") return species;
                selected = species.value.kind === "null" ? { kind: "undefined" } : species.value;
            }
            if (selected.kind !== "undefined") {
                if (selected.kind !== "object" || selected.object.constructorSlot === null)
                    return languageFailure(context.realm, "TypeError", method + " species is not a constructor", loc);
                if (context.construct === undefined) throw new Error("Array species construction unavailable");
                const result = context.construct(selected, [{ kind: "number", value: length }], selected, loc);
                if (result.type === "throw") return result;
                if (result.value.kind !== "object") throw new Error("constructor result invariant");
                return { type: "normal", value: result.value.object };
            }
        }
    }
    if (length > 4294967295) return languageFailure(context.realm, "RangeError", method + " result length exceeds array limit", loc);
    return createArrayWithLength(length, context, loc);
}
