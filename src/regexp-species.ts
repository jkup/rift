import type { GuestObject, OperationContext, ValueCompletion } from "./runtime.js";
import { normal, languageFailure } from "./runtime.js";
import { wellKnownSpecies } from "./symbols.js";
import type { Location } from "./syntax.js";

export function regExpSpecies(
    object: GuestObject,
    defaultConstructor: GuestObject,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const constructor = object.internalGet("constructor", { kind: "object", object }, context, loc);
    if (constructor.type === "throw") {
        return constructor;
    }
    if (constructor.value.kind === "undefined") {
        return normal({ kind: "object", object: defaultConstructor });
    }
    if (constructor.value.kind !== "object") {
        return languageFailure(
            context.realm,
            "TypeError",
            "RegExp constructor is not an object",
            loc,
        );
    }
    const species = constructor.value.object.internalGet(
        wellKnownSpecies,
        constructor.value,
        context,
        loc,
    );
    if (species.type === "throw") {
        return species;
    }
    if (species.value.kind === "undefined" || species.value.kind === "null") {
        return normal({ kind: "object", object: defaultConstructor });
    }
    if (species.value.kind !== "object" || species.value.object.constructorSlot === null) {
        return languageFailure(
            context.realm,
            "TypeError",
            "RegExp species is not a constructor",
            loc,
        );
    }
    return species;
}
