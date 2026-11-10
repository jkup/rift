import type { Realm } from "../realm.js";
import { dateObject } from "../date-object.js";
import { DATE_MILLISECONDS_PER_DAY, dateTimeFields, dateTimeClip, dateMakeDate, dateMakeFullYear } from "../date-time.js";
import { dateMakeDay } from "../date-calendar.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber } from "../conversion.js";
import { normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerDateCalendarSetters(realm: Realm): void {
    realm.registerBuiltin(realm.datePrototype, "setYear", 1, (receiver, args, context, loc): ValueCompletion => {
        const date = dateObject(receiver, context, loc);
        if (date.type === "throw") return date;
        const original = date.value.dateValue;
        const base = Number.isNaN(original) ? 0 : original;
        const fields = dateTimeFields(base);
        if (fields === null) throw new Error("Date year setter invariant");
        const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const year = toNumber(primitive.value, loc, context.realm);
        if (year.type === "throw") return year;
        const day = dateMakeDay(dateMakeFullYear(year.value), fields.month, fields.day);
        const withinDay = base - Math.floor(base / DATE_MILLISECONDS_PER_DAY) * DATE_MILLISECONDS_PER_DAY;
        const clipped = dateTimeClip(dateMakeDate(day, withinDay));
        date.value.dateValue = clipped;
        return normal({ kind: "number", value: clipped });
    });
    const suffixes = ["FullYear", "Month", "Date"];
    for (let start = 0; start < suffixes.length; start++) {
        for (const prefix of ["set", "setUTC"]) realm.registerBuiltin(realm.datePrototype, prefix + suffixes[start], 3 - start, (receiver, args, context, loc): ValueCompletion => {
            const date = dateObject(receiver, context, loc);
            if (date.type === "throw") return date;
            const original = date.value.dateValue;
            const base = start === 0 && Number.isNaN(original) ? 0 : original;
            const fields = dateTimeFields(base);
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
            const withinDay = base - Math.floor(base / DATE_MILLISECONDS_PER_DAY) * DATE_MILLISECONDS_PER_DAY;
            const clipped = dateTimeClip(dateMakeDate(day, withinDay));
            date.value.dateValue = clipped;
            return normal({ kind: "number", value: clipped });
        });
    }
}
