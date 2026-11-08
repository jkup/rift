import { GuestArray } from "./array-object.js";
import { languageFailure, unsupportedFailure, type GuestObject, type OperationContext, type Value, type ThrowCompletion } from "./runtime.js";
import type { Location } from "./syntax.js";
import { wellKnownSpecies } from "./symbols.js";

type ArrayCompletion = { type: "normal"; value: GuestArray } | ThrowCompletion;

export function createDefaultSpeciesArray(object: GuestObject, length: number, method: "map" | "splice" | "slice" | "concat", context: OperationContext, loc: Location): ArrayCompletion {
    const input: Value = { kind: "object", object };
    const capability = method === "map" ? "runtime.map-species" : method === "splice" ? "runtime.splice-species" : method === "slice" ? "runtime.slice-species" : "runtime.concat-species";
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
                // Recognize constructibility without invoking a constructor or
                // acquiring construction authority for this bounded operation.
                return unsupportedFailure(capability, "TypeError", "unsupported " + method + " constructor/species", loc);
            }
        }
    }
    if (length > 4294967295) return languageFailure(context.realm, "RangeError", method + " result length exceeds array limit", loc);
    const result = context.realm.createArray();
    const initialized = result.defineOwnProperty("length", { value: { kind: "number", value: length } }, context, loc);
    if (initialized.type === "throw" || !initialized.value) throw new Error("fresh array length invariant");
    return { type: "normal", value: result };
}
