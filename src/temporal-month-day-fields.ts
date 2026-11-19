import { isoDaysInMonth, type ISODate } from "./iso-calendar.js";
import { resolveTemporalMonth, type TemporalDateFields } from "./temporal-date-fields.js";
import type { Location } from "./syntax.js";
import { languageFailure, type OperationContext, type ThrowCompletion } from "./runtime.js";

export function resolveTemporalMonthDayFields(
    fields: TemporalDateFields,
    reject: boolean,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: ISODate } | ThrowCompletion {
    if (fields.day === null || (fields.month === null && fields.monthCode === null)) {
        return languageFailure(
            context.realm,
            "TypeError",
            "day and month or monthCode are required",
            loc,
        );
    }
    const month = resolveTemporalMonth(fields, reject, context, loc);
    if (month.type === "throw") {
        return month;
    }
    if (month.value < 1 || month.value > 12) {
        return languageFailure(context.realm, "RangeError", "month is outside its range", loc);
    }
    const limit = isoDaysInMonth(fields.year ?? 1972, month.value);
    if (reject && fields.day > limit) {
        return languageFailure(context.realm, "RangeError", "day is outside its range", loc);
    }
    return {
        type: "normal",
        value: { year: 1972, month: month.value, day: Math.min(fields.day, limit) },
    };
}
