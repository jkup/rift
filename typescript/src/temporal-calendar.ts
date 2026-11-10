import { GuestTemporalPlainMonthDay } from "./temporal-plain-month-day-object.js";
import { GuestTemporalPlainYearMonth } from "./temporal-plain-year-month-object.js";
import { GuestTemporalPlainDateTime } from "./temporal-plain-date-time-object.js";
import { parseTemporalCalendarString } from "./temporal-calendar-parse.js";
import { GuestTemporalPlainDate } from "./temporal-plain-date-object.js";
import type { StringCompletion } from "./conversion.js";
import type { Location } from "./syntax.js";
import { languageFailure, type GuestObject, type Value, type OperationContext } from "./runtime.js";

export function toTemporalCalendar(value: Value, context: OperationContext, loc: Location): StringCompletion {
    if (value.kind === "object" && hasTemporalCalendar(value.object)) return { type: "normal", value: "iso8601" };
    if (value.kind !== "string") return languageFailure(context.realm, "TypeError", "calendar requires a string or calendar-bearing Temporal object", loc);
    for (let i = 0; i < value.value.length; i++) {
        const work = context.tick(loc);
        if (work.type === "throw") return work;
    }
    const identifier = parseTemporalCalendarString(value.value);
    if (identifier === null || identifier.length !== 7 || identifier.toLowerCase() !== "iso8601")
        return languageFailure(context.realm, "RangeError", "invalid or unsupported calendar", loc);
    return { type: "normal", value: "iso8601" };
}


function hasTemporalCalendar(object: GuestObject): boolean {
    return object instanceof GuestTemporalPlainDate || object instanceof GuestTemporalPlainDateTime || object instanceof GuestTemporalPlainYearMonth || object instanceof GuestTemporalPlainMonthDay;
}

export function temporalCalendarWithISODefault(object: GuestObject, context: OperationContext, loc: Location): StringCompletion {
    if (hasTemporalCalendar(object)) return { type: "normal", value: "iso8601" };
    const calendar = object.internalGet("calendar", { kind: "object", object }, context, loc);
    if (calendar.type === "throw") return calendar;
    return calendar.value.kind === "undefined" ? { type: "normal", value: "iso8601" } : toTemporalCalendar(calendar.value, context, loc);
}
