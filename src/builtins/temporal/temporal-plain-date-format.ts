import type { Realm } from "../../realm.js";
import { temporalPlainDateValue } from "../../temporal/temporal-plain-date-object.js";
import { formatISODate, formatISOCalendarAnnotation } from "../../temporal/temporal-time-format.js";
import { temporalCalendarName } from "../../temporal/temporal-options.js";
import { languageFailure, normal, UNDEFINED, type ValueCompletion } from "../../runtime.js";

export function registerTemporalPlainDateFormat(realm: Realm): void {
    for (const name of ["toString", "toJSON", "toLocaleString"]) {
        realm.registerBuiltin(
            realm.temporalPlainDatePrototype,
            name,
            0,
            (receiver, args, context, loc): ValueCompletion => {
                const date = temporalPlainDateValue(receiver, context, loc);
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
                                "date string options must be an object",
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
                const annotation = formatISOCalendarAnnotation(calendarName);
                return normal({ kind: "string", value: formatISODate(date.value) + annotation });
            },
        );
    }
}
