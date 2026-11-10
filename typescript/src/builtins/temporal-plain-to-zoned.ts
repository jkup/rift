import type { Realm } from "../realm.js";
import { temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { temporalPlainDateTimeValue } from "../temporal-plain-date-time-object.js";
import { createTemporalZonedDateTime } from "../temporal-zoned-date-time-object.js";
import { toTemporalTimeZone } from "../temporal-time-zone.js";
import { temporalDisambiguation } from "../temporal-time-zone-options.js";
import { toTimeFieldsOrMidnight } from "./temporal-plain-time-conversion.js";
import { combineISODateTime, isoDateTimeWithinLimits } from "../iso-date-time.js";
import { interpretTemporalZonedDateTime } from "../temporal-zoned-interpret.js";
import { GuestObject, languageFailure, UNDEFINED, type Value, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainToZoned(realm: Realm): void {
    realm.registerBuiltin(realm.temporalPlainDateTimePrototype, "toZonedDateTime", 1, (receiver, args, context, loc): ValueCompletion => {
        const value = temporalPlainDateTimeValue(receiver, context, loc);
        if (value.type === "throw") return value;
        const zone = toTemporalTimeZone(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (zone.type === "throw") return zone;
        const supplied = args.length < 2 ? UNDEFINED : args[1];
        let options: GuestObject;
        if (supplied.kind === "undefined") options = new GuestObject(null);
        else if (supplied.kind === "object") options = supplied.object;
        else return languageFailure(context.realm, "TypeError", "Temporal options must be an object", loc);
        const disambiguation = temporalDisambiguation(options, context, loc);
        if (disambiguation.type === "throw") return disambiguation;
        const epoch = interpretTemporalZonedDateTime({ dateTime: value.value, timeZone: zone.value, startOfDay: false, offsetBehaviour: "wall", offsetNanoseconds: 0n }, "ignore");
        return epoch === null ? languageFailure(context.realm, "RangeError", "date-time outside the Instant range", loc) :
            createTemporalZonedDateTime(epoch, zone.value, context.realm.temporalZonedDateTimePrototype, context, loc);
    });
    realm.registerBuiltin(realm.temporalPlainDatePrototype, "toZonedDateTime", 1, (receiver, args, context, loc): ValueCompletion => {
        const value = temporalPlainDateValue(receiver, context, loc);
        if (value.type === "throw") return value;
        const supplied = args.length === 0 ? UNDEFINED : args[0];
        let zoneLike = supplied, wrapped = false;
        if (supplied.kind === "object") {
            const read = supplied.object.internalGet("timeZone", supplied, context, loc);
            if (read.type === "throw") return read;
            if (read.value.kind !== "undefined") { zoneLike = read.value; wrapped = true; }
        }
        const zone = toTemporalTimeZone(zoneLike, context, loc);
        if (zone.type === "throw") return zone;
        let timeLike: Value = UNDEFINED;
        if (wrapped && supplied.kind === "object") {
            const read = supplied.object.internalGet("plainTime", supplied, context, loc);
            if (read.type === "throw") return read;
            timeLike = read.value;
        }
        const time = toTimeFieldsOrMidnight(timeLike, context, loc);
        if (time.type === "throw") return time;
        const dateTime = combineISODateTime(value.value, time.value);
        if (timeLike.kind !== "undefined" && !isoDateTimeWithinLimits(dateTime)) return languageFailure(context.realm, "RangeError", "date-time outside the supported range", loc);
        const epoch = interpretTemporalZonedDateTime({ dateTime, timeZone: zone.value, startOfDay: timeLike.kind === "undefined", offsetBehaviour: "wall", offsetNanoseconds: 0n }, "ignore");
        return epoch === null ? languageFailure(context.realm, "RangeError", "date outside the Instant range", loc) :
            createTemporalZonedDateTime(epoch, zone.value, context.realm.temporalZonedDateTimePrototype, context, loc);
    });
}
