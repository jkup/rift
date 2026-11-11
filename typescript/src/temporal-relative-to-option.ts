import type { ISODate } from "./iso-calendar.js";
import { isoDateWithinLimits } from "./iso-calendar-fields.js";
import { GuestTemporalPlainDate } from "./temporal-plain-date-object.js";
import { GuestTemporalPlainDateTime } from "./temporal-plain-date-time-object.js";
import { GuestTemporalZonedDateTime } from "./temporal-zoned-date-time-object.js";
import { parseTemporalZonedDateTime } from "./temporal-zoned-parse.js";
import { interpretTemporalZonedDateTime } from "./temporal-zoned-interpret.js";
import { toTemporalTimeZone } from "./temporal-time-zone.js";
import type { TemporalTimeZone } from "./temporal-time-zone-parse.js";
import { resolveTemporalDateTimeFields } from "./temporal-date-time-fields.js";
import { parseTemporalDateTimeRecord } from "./temporal-plain-date-time-parse.js";
import { temporalCalendarWithISODefault } from "./temporal-calendar.js";
import { readTemporalDateField, resolveTemporalDateFields, type TemporalDateFields } from "./temporal-date-fields.js";
import { temporalInteger } from "./temporal-integer.js";
import { toPrimitive } from "./primitive-conversion.js";
import { parseUTCOffset } from "./utc-offset.js";
import type { Location } from "./syntax.js";
import { languageFailure, type Value, type OperationContext, type ThrowCompletion } from "./runtime.js";

export type TemporalRelativeTo = { readonly kind: "plain"; readonly date: ISODate } |
    { readonly kind: "zoned"; readonly epoch: bigint; readonly timeZone: TemporalTimeZone };
type RelativeDateCompletion = { type: "normal"; value: TemporalRelativeTo | null } | ThrowCompletion;

export function temporalRelativeToOption(options: Value, context: OperationContext, loc: Location): RelativeDateCompletion {
    if (options.kind === "undefined") return { type: "normal", value: null };
    if (options.kind !== "object") return languageFailure(context.realm, "TypeError", "Temporal options must be an object", loc);
    const read = options.object.internalGet("relativeTo", options, context, loc);
    if (read.type === "throw") return read;
    const value = read.value;
    if (value.kind === "undefined") return { type: "normal", value: null };
    if (value.kind === "object") {
        const object = value.object;
        if (object instanceof GuestTemporalPlainDate) return { type: "normal", value: { kind: "plain", date: object.date } };
        if (object instanceof GuestTemporalPlainDateTime) return { type: "normal", value: { kind: "plain", date: object.dateTime.date } };
        if (object instanceof GuestTemporalZonedDateTime) return { type: "normal", value: { kind: "zoned", epoch: object.epochNanoseconds, timeZone: object.timeZone } };
        const calendar = temporalCalendarWithISODefault(object, context, loc);
        if (calendar.type === "throw") return calendar;
        const fields: TemporalDateFields = { year: null, month: null, monthCode: null, day: null };
        const time = { hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
        let timeZone: TemporalTimeZone | null = null, offsetNanoseconds: bigint | null = null;
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
                const zone = toTemporalTimeZone(field.value, context, loc);
                if (zone.type === "throw") return zone;
                timeZone = zone.value;
            } else if (name === "offset") {
                const offset = toPrimitive(field.value, "string", context, loc);
                if (offset.type === "throw") return offset;
                if (offset.value.kind !== "string") return languageFailure(context.realm, "TypeError", "offset must convert to a string", loc);
                offsetNanoseconds = parseUTCOffset(offset.value.value);
                if (offsetNanoseconds === null) return languageFailure(context.realm, "RangeError", "invalid relativeTo offset", loc);
            } else {
                const converted = temporalInteger(field.value, context, loc);
                if (converted.type === "throw") return converted;
                time[name] = converted.value;
            }
        }
        if (timeZone === null) {
            const date = resolveTemporalDateFields(fields, false, context, loc);
            return date.type === "throw" ? date : { type: "normal", value: { kind: "plain", date: date.value } };
        }
        const resolved = resolveTemporalDateTimeFields({ date: fields, time }, false, context, loc);
        if (resolved.type === "throw") return resolved;
        const epoch = interpretTemporalZonedDateTime({ dateTime: resolved.value, timeZone, startOfDay: false,
            offsetBehaviour: offsetNanoseconds === null ? "wall" : "option", offsetNanoseconds: offsetNanoseconds ?? 0n, matchMinutes: false }, "reject");
        return epoch === null ? languageFailure(context.realm, "RangeError", "relativeTo offset or range is invalid", loc) :
            { type: "normal", value: { kind: "zoned", epoch, timeZone } };
    }
    if (value.kind !== "string") return languageFailure(context.realm, "TypeError", "relativeTo requires a string or date object", loc);
    for (let i = 0; i < value.value.length; i++) {
        const work = context.tick(loc);
        if (work.type === "throw") return work;
    }
    const zoned = parseTemporalZonedDateTime(value.value);
    if (zoned !== null) {
        const epoch = interpretTemporalZonedDateTime(zoned, "reject");
        return epoch === null ? languageFailure(context.realm, "RangeError", "relativeTo offset or range is invalid", loc) :
            { type: "normal", value: { kind: "zoned", epoch, timeZone: zoned.timeZone } };
    }
    const parsed = parseTemporalDateTimeRecord(value.value);
    if (parsed === null) return languageFailure(context.realm, "RangeError", "invalid relativeTo string", loc);
    if (parsed.timeZone !== null) return languageFailure(context.realm, "RangeError", "invalid zoned relativeTo string", loc);
    if (!isoDateWithinLimits(parsed.value.date)) return languageFailure(context.realm, "RangeError", "relativeTo date is outside its range", loc);
    return { type: "normal", value: { kind: "plain", date: parsed.value.date } };
}
