import type { Realm } from "../realm.js";
import { createTemporalPlainDateTime, temporalPlainDateTimeValue } from "../temporal-plain-date-time-object.js";
import { createTemporalPlainDate } from "../temporal-plain-date-object.js";
import { createTemporalPlainTime } from "../temporal-plain-time-object.js";
import { combineISODateTime, isoDateTimeWithinLimits } from "../iso-date-time.js";
import { toTemporalCalendar } from "../temporal-calendar.js";
import { toTimeFields } from "./temporal-plain-time-conversion.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateTimeParts(realm: Realm): void {
    realm.registerBuiltin(realm.temporalPlainDateTimePrototype, "toPlainDate", 0, (receiver, _args, context, loc): ValueCompletion => {
        const value = temporalPlainDateTimeValue(receiver, context, loc);
        return value.type === "throw" ? value : createTemporalPlainDate(value.value.date, context.realm.temporalPlainDatePrototype, context, loc);
    });
    realm.registerBuiltin(realm.temporalPlainDateTimePrototype, "toPlainTime", 0, (receiver, _args, context, loc): ValueCompletion => {
        const value = temporalPlainDateTimeValue(receiver, context, loc);
        return value.type === "throw" ? value : createTemporalPlainTime(value.value, context.realm.temporalPlainTimePrototype, context, loc);
    });
    realm.registerBuiltin(realm.temporalPlainDateTimePrototype, "withCalendar", 1, (receiver, args, context, loc): ValueCompletion => {
        const value = temporalPlainDateTimeValue(receiver, context, loc);
        if (value.type === "throw") return value;
        const calendar = toTemporalCalendar(args.length === 0 ? UNDEFINED : args[0], context, loc);
        return calendar.type === "throw" ? calendar : createTemporalPlainDateTime(value.value, context.realm.temporalPlainDateTimePrototype, context, loc);
    });
    realm.registerBuiltin(realm.temporalPlainDateTimePrototype, "withPlainTime", 0, (receiver, args, context, loc): ValueCompletion => {
        const value = temporalPlainDateTimeValue(receiver, context, loc);
        if (value.type === "throw") return value;
        const supplied = args.length === 0 ? UNDEFINED : args[0];
        let time = { hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
        if (supplied.kind !== "undefined") {
            const converted = toTimeFields(supplied, UNDEFINED, context, loc);
            if (converted.type === "throw") return converted;
            time = converted.value;
        }
        const result = combineISODateTime(value.value.date, time);
        return isoDateTimeWithinLimits(result) ? createTemporalPlainDateTime(result, context.realm.temporalPlainDateTimePrototype, context, loc) :
            languageFailure(context.realm, "RangeError", "date-time is outside its range", loc);
    });
}
