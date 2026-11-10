import type { Realm } from "../realm.js";
import { dateObject } from "../date-object.js";
import { dateTimeFields, type DateFields } from "../date-time.js";
import { normal, type ValueCompletion } from "../runtime.js";

function fieldValue(fields: DateFields, suffix: string): number {
    switch (suffix) {
        case "FullYear": return fields.year;
        case "Month": return fields.month;
        case "Date": return fields.day;
        case "Day": return fields.weekday;
        case "Hours": return fields.hour;
        case "Minutes": return fields.minute;
        case "Seconds": return fields.second;
        case "Milliseconds": return fields.millisecond;
        default: throw new Error("Date getter invariant");
    }
}

export function registerDateGetters(realm: Realm): void {
    for (const suffix of ["FullYear", "Month", "Date", "Day", "Hours", "Minutes", "Seconds", "Milliseconds"]) {
        for (const prefix of ["get", "getUTC"]) realm.registerBuiltin(realm.datePrototype, prefix + suffix, 0, (receiver, _args, context, loc): ValueCompletion => {
            const date = dateObject(receiver, context, loc);
            if (date.type === "throw") return date;
            const fields = dateTimeFields(date.value.dateValue);
            return normal({ kind: "number", value: fields === null ? NaN : fieldValue(fields, suffix) });
        });
    }
    for (const name of ["getYear", "getTimezoneOffset"]) realm.registerBuiltin(realm.datePrototype, name, 0, (receiver, _args, context, loc): ValueCompletion => {
        const date = dateObject(receiver, context, loc);
        if (date.type === "throw") return date;
        const fields = dateTimeFields(date.value.dateValue);
        return normal({ kind: "number", value: fields === null ? NaN : name === "getYear" ? fields.year - 1900 : 0 });
    });
}
