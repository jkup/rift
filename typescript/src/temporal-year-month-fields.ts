import type { ISODate } from "./iso-calendar.js";
import { isoYearMonthWithinLimits } from "./iso-year-month.js";
import { readTemporalDateField, resolveTemporalMonth, type TemporalDateFields } from "./temporal-date-fields.js";
import type { Location } from "./syntax.js";
import { languageFailure, type GuestObject, type OperationContext, type ThrowCompletion } from "./runtime.js";

export function readTemporalYearMonthFields(object: GuestObject, context: OperationContext, loc: Location): { type: "normal"; value: TemporalDateFields } | ThrowCompletion {
    const fields: TemporalDateFields = { year: null, month: null, monthCode: null, day: 1 };
    for (const name of ["month", "monthCode", "year"] as const) {
        const result = readTemporalDateField(object, name, fields, context, loc);
        if (result.type === "throw") return result;
    }
    return { type: "normal", value: fields };
}

export function resolveTemporalYearMonthFields(fields: TemporalDateFields, reject: boolean, context: OperationContext, loc: Location): { type: "normal"; value: ISODate } | ThrowCompletion {
    if (fields.year === null || (fields.month === null && fields.monthCode === null))
        return languageFailure(context.realm, "TypeError", "year and month or monthCode are required", loc);
    const month = resolveTemporalMonth(fields, reject, context, loc);
    if (month.type === "throw") return month;
    const date = { year: fields.year, month: month.value, day: 1 };
    return isoYearMonthWithinLimits(date) ? { type: "normal", value: date } :
        languageFailure(context.realm, "RangeError", "year-month is invalid or outside its range", loc);
}
