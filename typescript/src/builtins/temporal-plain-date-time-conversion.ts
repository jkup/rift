import type { Realm } from "../realm.js";
import { GuestTemporalZonedDateTime, temporalZonedISODateTime } from "../temporal-zoned-date-time-object.js";
import type { Location } from "../syntax.js";
import { isoDateTimeToEpochNanoseconds, type ISODateTime } from "../iso-calendar.js";
import { combineISODateTime, isoDateTimeWithinLimits } from "../iso-date-time.js";
import { GuestTemporalPlainDate } from "../temporal-plain-date-object.js";
import { GuestTemporalPlainDateTime, createTemporalPlainDateTime, temporalPlainDateTimeValue } from "../temporal-plain-date-time-object.js";
import { readTemporalDateTimeFields, resolveTemporalDateTimeFields } from "../temporal-date-time-fields.js";
import { parseTemporalPlainDateTime } from "../temporal-plain-date-time-parse.js";
import { temporalCalendarWithISODefault } from "../temporal-calendar.js";
import { temporalOverflowReject } from "../temporal-options.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type Value, type OperationContext, type ThrowCompletion, type ValueCompletion } from "../runtime.js";

export function toDateTimeFields(value: Value, options: Value, context: OperationContext, loc: Location): { type: "normal"; value: ISODateTime } | ThrowCompletion {
    let dateTime: ISODateTime;
    if (value.kind === "object") {
        if (value.object instanceof GuestTemporalPlainDateTime) dateTime = value.object.dateTime;
        else if (value.object instanceof GuestTemporalZonedDateTime) dateTime = temporalZonedISODateTime(value.object);
        else if (value.object instanceof GuestTemporalPlainDate)
            dateTime = combineISODateTime(value.object.date, { hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });
        else {
            const calendar = temporalCalendarWithISODefault(value.object, context, loc);
            if (calendar.type === "throw") return calendar;
            const fields = readTemporalDateTimeFields(value.object, context, loc);
            if (fields.type === "throw") return fields;
            const overflow = temporalOverflowReject(options, context, loc);
            return overflow.type === "throw" ? overflow : resolveTemporalDateTimeFields(fields.value, overflow.value, context, loc);
        }
    } else if (value.kind === "string") {
        for (let i = 0; i < value.value.length; i++) {
            const work = context.tick(loc);
            if (work.type === "throw") return work;
        }
        const parsed = parseTemporalPlainDateTime(value.value);
        if (parsed === null) return languageFailure(context.realm, "RangeError", "invalid PlainDateTime string", loc);
        dateTime = parsed;
    } else return languageFailure(context.realm, "TypeError", "PlainDateTime requires a string or date-time object", loc);
    const overflow = temporalOverflowReject(options, context, loc);
    if (overflow.type === "throw") return overflow;
    return isoDateTimeWithinLimits(dateTime) ? { type: "normal", value: dateTime } :
        languageFailure(context.realm, "RangeError", "date-time is outside its range", loc);
}

function compareDateTime(left: ISODateTime, right: ISODateTime): number {
    const a = isoDateTimeToEpochNanoseconds(left), b = isoDateTimeToEpochNanoseconds(right);
    if (a === null || b === null) throw new Error("date-time comparison range invariant");
    return a < b ? -1 : a > b ? 1 : 0;
}

export function registerTemporalPlainDateTimeConversion(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "from", 1, (_receiver, args, context, loc): ValueCompletion => {
        const result = toDateTimeFields(args.length === 0 ? UNDEFINED : args[0], args.length < 2 ? UNDEFINED : args[1], context, loc);
        return result.type === "throw" ? result : createTemporalPlainDateTime(result.value, context.realm.temporalPlainDateTimePrototype, context, loc);
    });
    realm.registerBuiltin(constructor, "compare", 2, (_receiver, args, context, loc): ValueCompletion => {
        const left = toDateTimeFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
        if (left.type === "throw") return left;
        const right = toDateTimeFields(args.length < 2 ? UNDEFINED : args[1], UNDEFINED, context, loc);
        return right.type === "throw" ? right : normal({ kind: "number", value: compareDateTime(left.value, right.value) });
    });
    realm.registerBuiltin(realm.temporalPlainDateTimePrototype, "equals", 1, (receiver, args, context, loc): ValueCompletion => {
        const left = temporalPlainDateTimeValue(receiver, context, loc);
        if (left.type === "throw") return left;
        const right = toDateTimeFields(args.length === 0 ? UNDEFINED : args[0], UNDEFINED, context, loc);
        return right.type === "throw" ? right : normal({ kind: "boolean", value: compareDateTime(left.value, right.value) === 0 });
    });
}
