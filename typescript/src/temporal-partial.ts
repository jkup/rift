import { GuestTemporalPlainDate } from "./temporal-plain-date-object.js";
import { GuestTemporalPlainTime } from "./temporal-plain-time-object.js";
import type { Location } from "./syntax.js";
import { languageFailure, type GuestObject, type Value, type OperationContext, type ThrowCompletion } from "./runtime.js";

export function temporalPartialObject(value: Value, context: OperationContext, loc: Location): { type: "normal"; value: GuestObject } | ThrowCompletion {
    if (value.kind !== "object" || value.object instanceof GuestTemporalPlainDate || value.object instanceof GuestTemporalPlainTime)
        return languageFailure(context.realm, "TypeError", "with requires a partial Temporal object", loc);
    for (const name of ["calendar", "timeZone"]) {
        const read = value.object.internalGet(name, value, context, loc);
        if (read.type === "throw") return read;
        if (read.value.kind !== "undefined") return languageFailure(context.realm, "TypeError", "partial object must not specify calendar or timeZone", loc);
    }
    return { type: "normal", value: value.object };
}
