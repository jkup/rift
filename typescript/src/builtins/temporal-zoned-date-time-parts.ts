import type { Realm } from "../realm.js";
import { createTemporalZonedDateTime, temporalZonedDateTimeObject, temporalZonedISODateTime } from "../temporal-zoned-date-time-object.js";
import { createTemporalInstant } from "../temporal-instant-object.js";
import { createTemporalPlainDateTime } from "../temporal-plain-date-time-object.js";
import { createTemporalPlainDate } from "../temporal-plain-date-object.js";
import { createTemporalPlainTime } from "../temporal-plain-time-object.js";
import { toTemporalTimeZone } from "../temporal-time-zone.js";
import { toTemporalCalendar } from "../temporal-calendar.js";
import { UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalZonedDateTimeParts(realm: Realm): void {
    for (const name of ["toInstant", "toPlainDate", "toPlainTime", "toPlainDateTime"]) {
        realm.registerBuiltin(realm.temporalZonedDateTimePrototype, name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            if (object.type === "throw") return object;
            if (name === "toInstant") return createTemporalInstant(object.value.epochNanoseconds, context.realm.temporalInstantPrototype, context, loc);
            const value = temporalZonedISODateTime(object.value);
            if (name === "toPlainDate") return createTemporalPlainDate(value.date, context.realm.temporalPlainDatePrototype, context, loc);
            if (name === "toPlainTime") return createTemporalPlainTime(value, context.realm.temporalPlainTimePrototype, context, loc);
            return createTemporalPlainDateTime(value, context.realm.temporalPlainDateTimePrototype, context, loc);
        });
    }
    realm.registerBuiltin(realm.temporalZonedDateTimePrototype, "withTimeZone", 1, (receiver, args, context, loc): ValueCompletion => {
        const object = temporalZonedDateTimeObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const zone = toTemporalTimeZone(args.length === 0 ? UNDEFINED : args[0], context, loc);
        return zone.type === "throw" ? zone : createTemporalZonedDateTime(object.value.epochNanoseconds, zone.value, context.realm.temporalZonedDateTimePrototype, context, loc);
    });
    realm.registerBuiltin(realm.temporalZonedDateTimePrototype, "withCalendar", 1, (receiver, args, context, loc): ValueCompletion => {
        const object = temporalZonedDateTimeObject(receiver, context, loc);
        if (object.type === "throw") return object;
        const calendar = toTemporalCalendar(args.length === 0 ? UNDEFINED : args[0], context, loc);
        return calendar.type === "throw" ? calendar : createTemporalZonedDateTime(object.value.epochNanoseconds, object.value.timeZone, context.realm.temporalZonedDateTimePrototype, context, loc);
    });
}
