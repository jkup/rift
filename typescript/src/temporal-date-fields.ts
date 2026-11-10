import { isoDaysInMonth, type ISODate } from "./iso-calendar.js";
import { isoDateWithinLimits } from "./iso-calendar-fields.js";
import { temporalInteger } from "./temporal-integer.js";
import { toPrimitive } from "./primitive-conversion.js";
import type { Location } from "./syntax.js";
import { languageFailure, type GuestObject, type OperationContext, type ThrowCompletion } from "./runtime.js";

export interface TemporalDateFields {
    year: number | null;
    month: number | null;
    monthCode: string | null;
    day: number | null;
}

export function readTemporalDateFields(object: GuestObject, context: OperationContext, loc: Location): { type: "normal"; value: TemporalDateFields } | ThrowCompletion {
    const fields: TemporalDateFields = { year: null, month: null, monthCode: null, day: null };
    for (const name of ["day", "month", "monthCode", "year"] as const) {
        const result = readTemporalDateField(object, name, fields, context, loc);
        if (result.type === "throw") return result;
    }
    return { type: "normal", value: fields };
}

export function readTemporalDateField(object: GuestObject, name: keyof TemporalDateFields, fields: TemporalDateFields, context: OperationContext, loc: Location): { type: "normal"; value: TemporalDateFields } | ThrowCompletion {
    const read = object.internalGet(name, { kind: "object", object }, context, loc);
    if (read.type === "throw") return read;
    if (read.value.kind === "undefined") return { type: "normal", value: fields };
    if (name === "monthCode") {
        const primitive = toPrimitive(read.value, "string", context, loc);
        if (primitive.type === "throw") return primitive;
        if (primitive.value.kind !== "string") return languageFailure(context.realm, "TypeError", "monthCode must convert to a string", loc);
        const code = primitive.value.value;
        const tens = code.charCodeAt(1), ones = code.charCodeAt(2);
        if ((code.length !== 3 && code.length !== 4) || code.charAt(0) !== "M" ||
            tens < 48 || tens > 57 || ones < 48 || ones > 57 ||
            (code.length === 4 && code.charAt(3) !== "L") || code === "M00")
            return languageFailure(context.realm, "RangeError", "invalid monthCode syntax", loc);
        fields.monthCode = code;
    } else {
        const converted = temporalInteger(read.value, context, loc);
        if (converted.type === "throw") return converted;
        if (name !== "year" && converted.value < 1)
            return languageFailure(context.realm, "RangeError", "month and day must be positive", loc);
        if (name === "day") fields.day = converted.value;
        else if (name === "month") fields.month = converted.value;
        else fields.year = converted.value;
    }
    return { type: "normal", value: fields };
}

export function resolveTemporalMonth(fields: TemporalDateFields, reject: boolean, context: OperationContext, loc: Location): { type: "normal"; value: number } | ThrowCompletion {
    let month = fields.month;
    if (fields.monthCode !== null) {
        const code = fields.monthCode, codeMonth = (code.charCodeAt(1) - 48) * 10 + code.charCodeAt(2) - 48;
        if (code.length !== 3 || codeMonth > 12 || (month !== null && month !== codeMonth))
            return languageFailure(context.realm, "RangeError", "monthCode is inconsistent with the ISO date", loc);
        month = codeMonth;
    }
    if (month === null) throw new Error("resolved month invariant");
    return { type: "normal", value: reject ? month : Math.max(1, Math.min(12, month)) };
}

export function resolveTemporalDateFields(fields: TemporalDateFields, reject: boolean, context: OperationContext, loc: Location): { type: "normal"; value: ISODate } | ThrowCompletion {
    if (fields.year === null || fields.day === null || (fields.month === null && fields.monthCode === null))
        return languageFailure(context.realm, "TypeError", "year, day and month or monthCode are required", loc);
    const resolvedMonth = resolveTemporalMonth(fields, reject, context, loc);
    if (resolvedMonth.type === "throw") return resolvedMonth;
    const month = resolvedMonth.value;
    let day = fields.day;
    if (!reject) {
        day = Math.max(1, Math.min(isoDaysInMonth(fields.year, month), day));
    }
    const date = { year: fields.year, month, day };
    if (!isoDateWithinLimits(date)) return languageFailure(context.realm, "RangeError", "date is invalid or outside its range", loc);
    return { type: "normal", value: date };
}

export function mergeTemporalDateFields(date: ISODate, fields: TemporalDateFields): TemporalDateFields {
    return {
        year: fields.year ?? date.year,
        month: fields.month === null && fields.monthCode === null ? date.month : fields.month,
        monthCode: fields.monthCode,
        day: fields.day ?? date.day,
    };
}
