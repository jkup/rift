import { parseTemporalTimeZone, type TemporalTimeZone } from "./temporal-time-zone-parse.js";
import { GuestTemporalZonedDateTime } from "./temporal-zoned-date-time-object.js";
import type { Location } from "../syntax.js";
import {
    languageFailure,
    type Value,
    type OperationContext,
    type ThrowCompletion,
} from "../runtime.js";

export function toTemporalTimeZone(
    value: Value,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: TemporalTimeZone } | ThrowCompletion {
    if (value.kind === "object" && value.object instanceof GuestTemporalZonedDateTime) {
        return { type: "normal", value: value.object.timeZone };
    }
    if (value.kind !== "string") {
        return languageFailure(context.realm, "TypeError", "timeZone must be a string", loc);
    }
    for (let index = 0; index < value.value.length; index++) {
        const work = context.tick(loc);
        if (work.type === "throw") {
            return work;
        }
    }
    const zone = parseTemporalTimeZone(value.value);
    return zone === null
        ? languageFailure(context.realm, "RangeError", "invalid or unsupported time zone", loc)
        : { type: "normal", value: zone };
}
