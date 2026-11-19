import type { Realm } from "../realm.js";
import { temporalPlainDateTimeValue } from "../temporal-plain-date-time-object.js";
import { temporalCalendarName, temporalFractionalDigits, temporalRoundingMode, temporalSmallestUnit, temporalStringPrecision, temporalPrecisionNanoseconds } from "../temporal-options.js";
import { formatISODateTime, formatISOCalendarAnnotation, type TemporalTimePrecision } from "../temporal-time-format.js";
import { roundISODateTime } from "../iso-date-time.js";
import { GuestObject, languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateTimeFormat(realm: Realm): void {
    for (const name of ["toString", "toJSON", "toLocaleString"]) {
        realm.registerBuiltin(realm.temporalPlainDateTimePrototype, name, 0, (receiver, args, context, loc): ValueCompletion => {
            const value = temporalPlainDateTimeValue(receiver, context, loc);
            if (value.type === "throw") return value;
            let dateTime = value.value, calendarName = "auto";
            let precision: TemporalTimePrecision = "auto";
            if (name === "toString") {
                const supplied = args.length === 0 ? UNDEFINED : args[0];
                let options: GuestObject;
                if (supplied.kind === "undefined") options = new GuestObject(null);
                else if (supplied.kind === "object") options = supplied.object;
                else return languageFailure(context.realm, "TypeError", "date-time string options must be an object", loc);
                const calendar = temporalCalendarName(options, context, loc);
                if (calendar.type === "throw") return calendar;
                calendarName = calendar.value;
                const digits = temporalFractionalDigits(options, context, loc);
                if (digits.type === "throw") return digits;
                const mode = temporalRoundingMode(options, context, loc, "trunc");
                if (mode.type === "throw") return mode;
                const unit = temporalSmallestUnit(options, context, loc);
                if (unit.type === "throw") return unit;
                const selected = temporalStringPrecision(unit.value, digits.value);
                if (selected === null) return languageFailure(context.realm, "RangeError", "date-time strings require minute or smaller units", loc);
                precision = selected;
                const rounded = roundISODateTime(dateTime, temporalPrecisionNanoseconds(precision), mode.value);
                if (rounded === null) return languageFailure(context.realm, "RangeError", "rounded date-time is outside its range", loc);
                dateTime = rounded;
            }
            const formatted = formatISODateTime(dateTime, precision);
            if (formatted === null) throw new Error("date-time string precision invariant");
            return normal({ kind: "string", value: formatted + formatISOCalendarAnnotation(calendarName) });
        });
    }
}
