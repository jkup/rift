import { timeZoneOffsetNanoseconds, timeZoneStartOfDay } from "../temporal-time-zone-operations.js";
import type { Realm } from "../realm.js";
import type { TimeFields } from "../temporal-time.js";
import { temporalZonedDateTimeObject, temporalZonedISODateTime } from "../temporal-zoned-date-time-object.js";
import { temporalCalendarFields, temporalCalendarField } from "./temporal-calendar-fields.js";
import { isoDateToEpochDay, epochDayToISODate } from "../iso-calendar.js";
import { formatUTCOffset } from "../utc-offset.js";
import { languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalZonedDateTimeFields(realm: Realm): void {
    const prototype = realm.temporalZonedDateTimePrototype;
    for (const name of temporalCalendarFields) {
        if (name === "calendarId") continue;
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            return object.type === "throw" ? object : normal(temporalCalendarField(temporalZonedISODateTime(object.value).date, name));
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    const names: (keyof TimeFields)[] = ["hour", "minute", "second", "millisecond", "microsecond", "nanosecond"];
    for (const name of names) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            return object.type === "throw" ? object : normal({ kind: "number", value: temporalZonedISODateTime(object.value)[name] });
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    for (const name of ["offset", "offsetNanoseconds", "hoursInDay"]) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            if (object.type === "throw") return object;
            const value = object.value, offset = timeZoneOffsetNanoseconds(value.timeZone, value.epochNanoseconds);
            if (offset === null) throw new Error("ZonedDateTime offset range invariant");
            if (name === "offsetNanoseconds") return normal({ kind: "number", value: Number(offset) });
            if (name === "offset") {
                const formatted = formatUTCOffset(offset);
                if (formatted === null) throw new Error("ZonedDateTime offset invariant");
                return normal({ kind: "string", value: formatted });
            }
            const day = isoDateToEpochDay(temporalZonedISODateTime(value).date);
            if (day === null) throw new Error("ZonedDateTime day invariant");
            const nextDate = epochDayToISODate(day + 1);
            const midnight = timeZoneStartOfDay(value.timeZone, temporalZonedISODateTime(value).date);
            const next = nextDate === null ? null : timeZoneStartOfDay(value.timeZone, nextDate);
            if (midnight === null || next === null)
                return languageFailure(context.realm, "RangeError", "day boundary outside the Instant range", loc);
            return normal({ kind: "number", value: Number(next - midnight) / 3600000000000 });
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
}
