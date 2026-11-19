import { GuestTemporalPlainDateTime } from "../temporal-plain-date-time-object.js";
import { GuestTemporalZonedDateTime, temporalZonedISODateTime } from "../temporal-zoned-date-time-object.js";
import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import type { ISODate } from "../iso-calendar.js";
import { isoDateWithinLimits } from "../iso-calendar-fields.js";
import { GuestTemporalPlainDate, createTemporalPlainDate, temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { readTemporalDateFields, resolveTemporalDateFields } from "../temporal-date-fields.js";
import { parseTemporalPlainDate } from "../temporal-plain-date-parse.js";
import { temporalCalendarWithISODefault } from "../temporal-calendar.js";
import { temporalOverflowReject } from "../temporal-options.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type Value, type OperationContext, type ThrowCompletion, type ValueCompletion } from "../runtime.js";

export function toDateFields(value: Value, options: Value, context: OperationContext, loc: Location): { type: "normal"; value: ISODate } | ThrowCompletion {
    let date: ISODate;
    if (value.kind === "object") {
        if (value.object instanceof GuestTemporalPlainDateTime) date = value.object.dateTime.date;
        else if (value.object instanceof GuestTemporalPlainDate) date = value.object.date;
        else if (value.object instanceof GuestTemporalZonedDateTime) date = temporalZonedISODateTime(value.object).date;
        else {
            const calendar = temporalCalendarWithISODefault(value.object, context, loc);
            if (calendar.type === "throw") return calendar;
            const fields = readTemporalDateFields(value.object, context, loc);
            if (fields.type === "throw") return fields;
            const overflow = temporalOverflowReject(options, context, loc);
            return overflow.type === "throw" ? overflow : resolveTemporalDateFields(fields.value, overflow.value, context, loc);
        }
    } else if (value.kind === "string") {
        for (let i = 0; i < value.value.length; i++) {
            const work = context.tick(loc);
            if (work.type === "throw") return work;
        }
        const parsed = parseTemporalPlainDate(value.value);
        if (parsed === null) return languageFailure(context.realm, "RangeError", "invalid PlainDate string", loc);
        date = parsed;
    } else return languageFailure(context.realm, "TypeError", "PlainDate requires a string or date object", loc);
    const overflow = temporalOverflowReject(options, context, loc);
    if (overflow.type === "throw") return overflow;
    if (!isoDateWithinLimits(date)) return languageFailure(context.realm, "RangeError", "date is outside its range", loc);
    return { type: "normal", value: date };
}

function compareDate(left: ISODate, right: ISODate): number {
    for (const name of ["year", "month", "day"] as const) {
        if (left[name] < right[name]) return -1;
        if (left[name] > right[name]) return 1;
    }
    return 0;
}

export function registerTemporalPlainDateConversion(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "from", 1, (_receiver, args, context, loc): ValueCompletion => {
        const result = toDateFields(args.length === 0 ? UNDEFINED : args[0], args.length < 2 ? UNDEFINED : args[1], context, loc);
        return result.type === "throw" ? result : createTemporalPlainDate(result.value, context.realm.temporalPlainDatePrototype, context, loc);
    });
    realm.registerBuiltin(constructor, "compare", 2, (_receiver, args, context, loc): ValueCompletion => {
        const left = toDateFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
        if (left.type === "throw") return left;
        const right = toDateFields(args.length < 2 ? UNDEFINED : args[1], UNDEFINED, context, loc);
        return right.type === "throw" ? right : normal({ kind: "number", value: compareDate(left.value, right.value) });
    });
    realm.registerBuiltin(realm.temporalPlainDatePrototype, "equals", 1, (receiver, args, context, loc): ValueCompletion => {
        const left = temporalPlainDateValue(receiver, context, loc);
        if (left.type === "throw") return left;
        const right = toDateFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
        return right.type === "throw" ? right : normal({ kind: "boolean", value: compareDate(left.value, right.value) === 0 });
    });
}
