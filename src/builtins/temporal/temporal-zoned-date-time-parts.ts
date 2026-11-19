import {
    timeZoneEpochNanoseconds,
    timeZoneStartOfDay,
} from "../../temporal/temporal-time-zone-operations.js";
import type { Realm } from "../../realm.js";
import {
    createTemporalZonedDateTime,
    temporalZonedDateTimeObject,
    temporalZonedISODateTime,
} from "../../temporal/temporal-zoned-date-time-object.js";
import { createTemporalInstant } from "../../temporal/temporal-instant-object.js";
import { createTemporalPlainDateTime } from "../../temporal/temporal-plain-date-time-object.js";
import { createTemporalPlainDate } from "../../temporal/temporal-plain-date-object.js";
import { createTemporalPlainTime } from "../../temporal/temporal-plain-time-object.js";
import { toTemporalTimeZone } from "../../temporal/temporal-time-zone.js";
import { toTemporalCalendar } from "../../temporal/temporal-calendar.js";
import { toTimeFieldsOrMidnight } from "./temporal-plain-time-conversion.js";
import { combineISODateTime } from "../../temporal/iso-date-time.js";
import { isoDateTimeToEpochNanoseconds } from "../../temporal/iso-calendar.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../../runtime.js";

export function registerTemporalZonedDateTimeParts(realm: Realm): void {
    for (const name of ["withPlainTime", "startOfDay"]) {
        realm.registerBuiltin(
            realm.temporalZonedDateTimePrototype,
            name,
            0,
            (receiver, args, context, loc): ValueCompletion => {
                const object = temporalZonedDateTimeObject(receiver, context, loc);
                if (object.type === "throw") {
                    return object;
                }
                const date = temporalZonedISODateTime(object.value).date;
                const time = toTimeFieldsOrMidnight(
                    name === "startOfDay" || args.length === 0 ? UNDEFINED : args[0],
                    context,
                    loc,
                );
                if (time.type === "throw") {
                    return time;
                }
                const local = isoDateTimeToEpochNanoseconds(combineISODateTime(date, time.value));
                if (local === null) {
                    throw new Error("ZonedDateTime local time invariant");
                }
                const useStart =
                    name === "startOfDay" || args.length === 0 || args[0].kind === "undefined";
                const epoch = useStart
                    ? timeZoneStartOfDay(object.value.timeZone, date)
                    : timeZoneEpochNanoseconds(object.value.timeZone, local);
                if (epoch === null) {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "local time outside the Instant range",
                        loc,
                    );
                }
                return createTemporalZonedDateTime(
                    epoch,
                    object.value.timeZone,
                    context.realm.temporalZonedDateTimePrototype,
                    context,
                    loc,
                );
            },
        );
    }
    for (const name of ["toInstant", "toPlainDate", "toPlainTime", "toPlainDateTime"]) {
        realm.registerBuiltin(
            realm.temporalZonedDateTimePrototype,
            name,
            0,
            (receiver, _args, context, loc): ValueCompletion => {
                const object = temporalZonedDateTimeObject(receiver, context, loc);
                if (object.type === "throw") {
                    return object;
                }
                if (name === "toInstant") {
                    return createTemporalInstant(
                        object.value.epochNanoseconds,
                        context.realm.temporalInstantPrototype,
                        context,
                        loc,
                    );
                }
                const value = temporalZonedISODateTime(object.value);
                if (name === "toPlainDate") {
                    return createTemporalPlainDate(
                        value.date,
                        context.realm.temporalPlainDatePrototype,
                        context,
                        loc,
                    );
                }
                if (name === "toPlainTime") {
                    return createTemporalPlainTime(
                        value,
                        context.realm.temporalPlainTimePrototype,
                        context,
                        loc,
                    );
                }
                return createTemporalPlainDateTime(
                    value,
                    context.realm.temporalPlainDateTimePrototype,
                    context,
                    loc,
                );
            },
        );
    }
    realm.registerBuiltin(
        realm.temporalZonedDateTimePrototype,
        "withTimeZone",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            if (object.type === "throw") {
                return object;
            }
            const zone = toTemporalTimeZone(args.length === 0 ? UNDEFINED : args[0], context, loc);
            return zone.type === "throw"
                ? zone
                : createTemporalZonedDateTime(
                      object.value.epochNanoseconds,
                      zone.value,
                      context.realm.temporalZonedDateTimePrototype,
                      context,
                      loc,
                  );
        },
    );
    realm.registerBuiltin(
        realm.temporalZonedDateTimePrototype,
        "withCalendar",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            if (object.type === "throw") {
                return object;
            }
            const calendar = toTemporalCalendar(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            return calendar.type === "throw"
                ? calendar
                : createTemporalZonedDateTime(
                      object.value.epochNanoseconds,
                      object.value.timeZone,
                      context.realm.temporalZonedDateTimePrototype,
                      context,
                      loc,
                  );
        },
    );
}
