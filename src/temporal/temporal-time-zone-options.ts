import type { Location } from "../syntax.js";
import { temporalOptionString } from "./temporal-options.js";
import {
    languageFailure,
    type GuestObject,
    type OperationContext,
    type ThrowCompletion,
} from "../runtime.js";

export function temporalDisambiguation(
    options: GuestObject,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: "compatible" | "earlier" | "later" | "reject" } | ThrowCompletion {
    const read = options.internalGet(
        "disambiguation",
        { kind: "object", object: options },
        context,
        loc,
    );
    if (read.type === "throw") {
        return read;
    }
    if (read.value.kind === "undefined") {
        return { type: "normal", value: "compatible" };
    }
    const converted = temporalOptionString(read.value, context, loc);
    if (converted.type === "throw") {
        return converted;
    }
    const text = converted.value;
    return text === "compatible" || text === "earlier" || text === "later" || text === "reject"
        ? { type: "normal", value: text }
        : languageFailure(context.realm, "RangeError", "invalid disambiguation option", loc);
}
