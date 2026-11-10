import type { Realm } from "../realm.js";
import { temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { formatISODate } from "../temporal-time-format.js";
import { temporalOptionString } from "../temporal-options.js";
import { languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateFormat(realm: Realm): void {
    for (const name of ["toString", "toJSON", "toLocaleString"]) {
        realm.registerBuiltin(realm.temporalPlainDatePrototype, name, 0, (receiver, args, context, loc): ValueCompletion => {
            const date = temporalPlainDateValue(receiver, context, loc);
            if (date.type === "throw") return date;
            let calendarName = "auto";
            if (name === "toString") {
                const supplied = args.length === 0 ? UNDEFINED : args[0];
                if (supplied.kind !== "undefined") {
                    if (supplied.kind !== "object") return languageFailure(context.realm, "TypeError", "date string options must be an object", loc);
                    const read = supplied.object.internalGet("calendarName", supplied, context, loc);
                    if (read.type === "throw") return read;
                    if (read.value.kind !== "undefined") {
                        const option = temporalOptionString(read.value, context, loc);
                        if (option.type === "throw") return option;
                        calendarName = option.value;
                        if (calendarName !== "auto" && calendarName !== "always" && calendarName !== "never" && calendarName !== "critical")
                            return languageFailure(context.realm, "RangeError", "invalid calendarName option", loc);
                    }
                }
            }
            const annotation = calendarName === "always" ? "[u-ca=iso8601]" : calendarName === "critical" ? "[!u-ca=iso8601]" : "";
            return normal({ kind: "string", value: formatISODate(date.value) + annotation });
        });
    }
}
