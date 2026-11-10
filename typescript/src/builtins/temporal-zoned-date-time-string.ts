import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import type { StringCompletion } from "../conversion.js";
import { temporalZonedDateTimeObject } from "../temporal-zoned-date-time-object.js";
import { temporalCalendarName, temporalFractionalDigits, temporalOptionString, temporalRoundingMode, temporalSmallestUnit, temporalStringPrecision, temporalPrecisionNanoseconds } from "../temporal-options.js";
import { formatISODateTime, formatISOCalendarAnnotation, type TemporalTimePrecision } from "../temporal-time-format.js";
import { roundTemporalInstant } from "../temporal-rounding.js";
import { isoDateTimeFromEpochNanoseconds } from "../iso-calendar.js";
import { formatUTCOffsetMinutes } from "../utc-offset.js";
import { GuestObject, languageFailure, normal, UNDEFINED, type OperationContext, type ValueCompletion } from "../runtime.js";

function displayOption(options: GuestObject, key: string, context: OperationContext, loc: Location): StringCompletion {
    const read = options.internalGet(key, { kind: "object", object: options }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: "auto" };
    const value = temporalOptionString(read.value, context, loc);
    if (value.type === "throw") return value;
    return value.value === "auto" || value.value === "never" || (key === "timeZoneName" && value.value === "critical") ? value :
        languageFailure(context.realm, "RangeError", "invalid " + key + " display option", loc);
}

export function registerTemporalZonedDateTimeString(realm: Realm): void {
    for (const name of ["toString", "toJSON", "toLocaleString"]) {
        realm.registerBuiltin(realm.temporalZonedDateTimePrototype, name, 0, (receiver, args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            if (object.type === "throw") return object;
            const value = object.value;
            let epoch = value.epochNanoseconds, calendarName = "auto", offsetName = "auto", zoneName = "auto";
            let precision: TemporalTimePrecision = "auto";
            if (name === "toString") {
                const supplied = args.length === 0 ? UNDEFINED : args[0];
                let options: GuestObject;
                if (supplied.kind === "undefined") options = new GuestObject(null);
                else if (supplied.kind === "object") options = supplied.object;
                else return languageFailure(context.realm, "TypeError", "ZonedDateTime string options must be an object", loc);
                const calendar = temporalCalendarName(options, context, loc);
                if (calendar.type === "throw") return calendar;
                const digits = temporalFractionalDigits(options, context, loc);
                if (digits.type === "throw") return digits;
                const offset = displayOption(options, "offset", context, loc);
                if (offset.type === "throw") return offset;
                const mode = temporalRoundingMode(options, context, loc, "trunc");
                if (mode.type === "throw") return mode;
                const unit = temporalSmallestUnit(options, context, loc);
                if (unit.type === "throw") return unit;
                const zone = displayOption(options, "timeZoneName", context, loc);
                if (zone.type === "throw") return zone;
                const selected = temporalStringPrecision(unit.value, digits.value);
                if (selected === null) return languageFailure(context.realm, "RangeError", "ZonedDateTime strings require minute or smaller units", loc);
                precision = selected; calendarName = calendar.value; offsetName = offset.value; zoneName = zone.value;
                epoch = roundTemporalInstant(epoch, temporalPrecisionNanoseconds(precision), mode.value);
            }
            const local = isoDateTimeFromEpochNanoseconds(epoch + value.timeZone.offsetNanoseconds);
            if (local === null) throw new Error("ZonedDateTime formatting range invariant");
            const text = formatISODateTime(local, precision), offset = formatUTCOffsetMinutes(Number(value.timeZone.offsetNanoseconds / 60000000000n));
            if (text === null || offset === null) throw new Error("ZonedDateTime formatting invariant");
            const zone = zoneName === "never" ? "" : "[" + (zoneName === "critical" ? "!" : "") + value.timeZone.identifier + "]";
            return normal({ kind: "string", value: text + (offsetName === "never" ? "" : offset) + zone + formatISOCalendarAnnotation(calendarName) });
        });
    }
}
