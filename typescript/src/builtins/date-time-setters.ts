import type { Realm } from "../realm.js";
import { dateObject } from "../date-object.js";
import { DATE_MILLISECONDS_PER_DAY, dateTimeFields, dateTimeClip, dateMakeTime, dateMakeDate } from "../date-time.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toNumber } from "../conversion.js";
import { normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerDateTimeSetters(realm: Realm): void {
    realm.registerBuiltin(realm.datePrototype, "setTime", 1, (receiver, args, context, loc): ValueCompletion => {
        const date = dateObject(receiver, context, loc);
        if (date.type === "throw") return date;
        const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const number = toNumber(primitive.value, loc, context.realm);
        if (number.type === "throw") return number;
        const time = dateTimeClip(number.value);
        date.value.dateValue = time;
        return normal({ kind: "number", value: time });
    });
    const suffixes = ["Hours", "Minutes", "Seconds", "Milliseconds"];
    for (let start = 0; start < suffixes.length; start++) {
        for (const prefix of ["set", "setUTC"]) realm.registerBuiltin(realm.datePrototype, prefix + suffixes[start], 4 - start, (receiver, args, context, loc): ValueCompletion => {
            const date = dateObject(receiver, context, loc);
            if (date.type === "throw") return date;
            const original = date.value.dateValue;
            const fields = dateTimeFields(original);
            const values = fields === null ? [NaN, NaN, NaN, NaN] : [fields.hour, fields.minute, fields.second, fields.millisecond];
            for (let index = start; index < 4; index++) {
                const argument = index - start;
                if (argument !== 0 && argument >= args.length) break;
                const primitive = toPrimitive(argument < args.length ? args[argument] : UNDEFINED, "number", context, loc);
                if (primitive.type === "throw") return primitive;
                const number = toNumber(primitive.value, loc, context.realm);
                if (number.type === "throw") return number;
                values[index] = number.value;
            }
            if (fields === null) return normal({ kind: "number", value: NaN });
            const time = dateMakeTime(values[0], values[1], values[2], values[3]);
            const clipped = dateTimeClip(dateMakeDate(Math.floor(original / DATE_MILLISECONDS_PER_DAY), time));
            date.value.dateValue = clipped;
            return normal({ kind: "number", value: clipped });
        });
    }
}
