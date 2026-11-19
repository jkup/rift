import type { Realm } from "../realm.js";
import { temporalPlainYearMonthValue } from "../temporal-plain-year-month-object.js";
import { formatISOYear, formatISOCalendarAnnotation } from "../temporal-time-format.js";
import { temporalCalendarName } from "../temporal-options.js";
import { languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainYearMonthFormat(realm: Realm): void {
    for (const name of ["toString", "toJSON", "toLocaleString"]) {
        realm.registerBuiltin(
            realm.temporalPlainYearMonthPrototype,
            name,
            0,
            (receiver, args, context, loc): ValueCompletion => {
                const date = temporalPlainYearMonthValue(receiver, context, loc);
                if (date.type === "throw") {
                    return date;
                }
                let calendarName = "auto";
                if (name === "toString") {
                    const supplied = args.length === 0 ? UNDEFINED : args[0];
                    if (supplied.kind !== "undefined") {
                        if (supplied.kind !== "object") {
                            return languageFailure(
                                context.realm,
                                "TypeError",
                                "year-month string options must be an object",
                                loc,
                            );
                        }
                        const option = temporalCalendarName(supplied.object, context, loc);
                        if (option.type === "throw") {
                            return option;
                        }
                        calendarName = option.value;
                    }
                }
                let text =
                    formatISOYear(date.value.year) +
                    "-" +
                    String(date.value.month).padStart(2, "0");
                if (calendarName === "always" || calendarName === "critical") {
                    text += "-" + String(date.value.day).padStart(2, "0");
                }
                const annotation = formatISOCalendarAnnotation(calendarName);
                return normal({ kind: "string", value: text + annotation });
            },
        );
    }
}
