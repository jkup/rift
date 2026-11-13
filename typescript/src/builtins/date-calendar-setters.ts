import type { Realm } from "../realm.js";
import { dateObject } from "../date-object.js";
import { dateTimeFields, dateTimeClip, dateMakeTime, dateMakeDate, dateMakeFullYear } from "../date-time.js";
import { dateMakeDay } from "../date-calendar.js";
import { dateLocalFields, dateEpochFromLocalTime } from "../date-time-zone.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber } from "../conversion.js";
import { normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerDateCalendarSetters(realm: Realm): void {
    realm.registerBuiltin(realm.datePrototype, "setYear", 1, (receiver, args, context, loc): ValueCompletion => {
        const date = dateObject(receiver, context, loc);
        if (date.type === "throw") return date;
        const original = date.value.dateValue;
        const fields = Number.isNaN(original) ? dateTimeFields(0) : dateLocalFields(original, context.realm.dateTimeZone);
        if (fields === null) throw new Error("Date year setter invariant");
        const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const year = toNumber(primitive.value, loc, context.realm);
        if (year.type === "throw") return year;
        const day = dateMakeDay(dateMakeFullYear(year.value), fields.month, fields.day);
        const withinDay = dateMakeTime(fields.hour, fields.minute, fields.second, fields.millisecond);
        const clipped = dateEpochFromLocalTime(dateMakeDate(day, withinDay), context.realm.dateTimeZone);
        date.value.dateValue = clipped;
        return normal({ kind: "number", value: clipped });
    });
    const suffixes = ["FullYear", "Month", "Date"];
    for (let start = 0; start < suffixes.length; start++) {
        for (const prefix of ["set", "setUTC"]) realm.registerBuiltin(realm.datePrototype, prefix + suffixes[start], 3 - start, (receiver, args, context, loc): ValueCompletion => {
            const date = dateObject(receiver, context, loc);
            if (date.type === "throw") return date;
            const original = date.value.dateValue;
            const fields = start === 0 && Number.isNaN(original) ? dateTimeFields(0) :
                prefix === "set" ? dateLocalFields(original, context.realm.dateTimeZone) : dateTimeFields(original);
            const values = fields === null ? [NaN, NaN, NaN] : [fields.year, fields.month, fields.day];
            for (let index = start; index < 3; index++) {
                const argument = index - start;
                if (argument !== 0 && argument >= args.length) break;
                const primitive = toPrimitive(argument < args.length ? args[argument] : UNDEFINED, "number", context, loc);
                if (primitive.type === "throw") return primitive;
                const number = toNumber(primitive.value, loc, context.realm);
                if (number.type === "throw") return number;
                values[index] = number.value;
            }
            if (fields === null) return normal({ kind: "number", value: NaN });
            const day = dateMakeDay(values[0], values[1], values[2]);
            const withinDay = dateMakeTime(fields.hour, fields.minute, fields.second, fields.millisecond);
            const next = dateMakeDate(day, withinDay);
            const clipped = prefix === "set" ? dateEpochFromLocalTime(next, context.realm.dateTimeZone) : dateTimeClip(next);
            date.value.dateValue = clipped;
            return normal({ kind: "number", value: clipped });
        });
    }
}
