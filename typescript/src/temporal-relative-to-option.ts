import type { ISODate } from "./iso-calendar.js";
import { isoDateWithinLimits } from "./iso-calendar-fields.js";
import { GuestTemporalPlainDate } from "./temporal-plain-date-object.js";
import { GuestTemporalPlainDateTime } from "./temporal-plain-date-time-object.js";
import { parseTemporalDateTimeRecord } from "./temporal-plain-date-time-parse.js";
import { temporalCalendarWithISODefault } from "./temporal-calendar.js";
import { readTemporalDateField, resolveTemporalDateFields, type TemporalDateFields } from "./temporal-date-fields.js";
import { temporalInteger } from "./temporal-integer.js";
import { toPrimitive } from "./primitive-conversion.js";
import { parseUTCOffset } from "./utc-offset.js";
import type { Location } from "./syntax.js";
import { languageFailure, type Value, type OperationContext, type ThrowCompletion } from "./runtime.js";

type RelativeDateCompletion = { type: "normal"; value: ISODate | null } | ThrowCompletion;

export function temporalRelativeToOption(options: Value, context: OperationContext, loc: Location): RelativeDateCompletion {
    if (options.kind === "undefined") return { type: "normal", value: null };
    if (options.kind !== "object") return languageFailure(context.realm, "TypeError", "Temporal options must be an object", loc);
    const read = options.object.internalGet("relativeTo", options, context, loc);
    if (read.type === "throw") return read;
    const value = read.value;
    if (value.kind === "undefined") return { type: "normal", value: null };
    if (value.kind === "object") {
        const object = value.object;
        if (object instanceof GuestTemporalPlainDate) return { type: "normal", value: object.date };
        if (object instanceof GuestTemporalPlainDateTime) return { type: "normal", value: object.dateTime.date };
        const calendar = temporalCalendarWithISODefault(object, context, loc);
        if (calendar.type === "throw") return calendar;
        const fields: TemporalDateFields = { year: null, month: null, monthCode: null, day: null };
        for (const name of ["day", "hour", "microsecond", "millisecond", "minute", "month", "monthCode", "nanosecond", "offset", "second", "timeZone", "year"] as const) {
            if (name === "day" || name === "month" || name === "monthCode" || name === "year") {
                const field = readTemporalDateField(object, name, fields, context, loc);
                if (field.type === "throw") return field;
                continue;
            }
            const field = object.internalGet(name, value, context, loc);
            if (field.type === "throw") return field;
            if (field.value.kind === "undefined") continue;
            if (name === "timeZone") {
                if (field.value.kind !== "string") return languageFailure(context.realm, "TypeError", "timeZone must be a string", loc);
                return languageFailure(context.realm, "RangeError", "zoned relativeTo is unsupported", loc);
            }
            if (name === "offset") {
                const offset = toPrimitive(field.value, "string", context, loc);
                if (offset.type === "throw") return offset;
                if (offset.value.kind !== "string") return languageFailure(context.realm, "TypeError", "offset must convert to a string", loc);
                if (parseUTCOffset(offset.value.value) === null) return languageFailure(context.realm, "RangeError", "invalid relativeTo offset", loc);
            } else {
                const time = temporalInteger(field.value, context, loc);
                if (time.type === "throw") return time;
                // Constrained time fields are validated but do not affect the resulting PlainDate.
            }
        }
        return resolveTemporalDateFields(fields, false, context, loc);
    }
    if (value.kind !== "string") return languageFailure(context.realm, "TypeError", "relativeTo requires a string or date object", loc);
    for (let i = 0; i < value.value.length; i++) {
        const work = context.tick(loc);
        if (work.type === "throw") return work;
    }
    const parsed = parseTemporalDateTimeRecord(value.value);
    if (parsed === null) return languageFailure(context.realm, "RangeError", "invalid relativeTo string", loc);
    if (parsed.timeZone !== null) return languageFailure(context.realm, "RangeError", "zoned relativeTo is unsupported", loc);
    if (!isoDateWithinLimits(parsed.value.date)) return languageFailure(context.realm, "RangeError", "relativeTo date is outside its range", loc);
    return { type: "normal", value: parsed.value.date };
}
