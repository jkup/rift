import type { Realm } from "../realm.js";
import { createTemporalPlainYearMonth, temporalPlainYearMonthValue } from "../temporal-plain-year-month-object.js";
import { mergeTemporalDateFields, readTemporalDateField, resolveTemporalDateFields, type TemporalDateFields } from "../temporal-date-fields.js";
import { readTemporalYearMonthFields, resolveTemporalYearMonthFields } from "../temporal-year-month-fields.js";
import { createTemporalPlainDate } from "../temporal-plain-date-object.js";
import { temporalPartialObject } from "../temporal-partial.js";
import { temporalOverflowReject } from "../temporal-options.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainYearMonthFields(realm: Realm): void {
    realm.registerBuiltin(realm.temporalPlainYearMonthPrototype, "with", 1, (receiver, args, context, loc): ValueCompletion => {
        const date = temporalPlainYearMonthValue(receiver, context, loc);
        if (date.type === "throw") return date;
        const partial = temporalPartialObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (partial.type === "throw") return partial;
        const read = readTemporalYearMonthFields(partial.value, context, loc);
        if (read.type === "throw") return read;
        const fields = read.value;
        if (fields.year === null && fields.month === null && fields.monthCode === null)
            return languageFailure(context.realm, "TypeError", "at least one year-month field is required", loc);
        const merged = mergeTemporalDateFields(date.value, fields);
        const overflow = temporalOverflowReject(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (overflow.type === "throw") return overflow;
        const result = resolveTemporalYearMonthFields(merged, overflow.value, context, loc);
        return result.type === "throw" ? result : createTemporalPlainYearMonth(result.value, context.realm.temporalPlainYearMonthPrototype, context, loc);
    });
    realm.registerBuiltin(realm.temporalPlainYearMonthPrototype, "toPlainDate", 1, (receiver, args, context, loc): ValueCompletion => {
        const date = temporalPlainYearMonthValue(receiver, context, loc);
        if (date.type === "throw") return date;
        const supplied = args.length === 0 ? UNDEFINED : args[0];
        if (supplied.kind !== "object") return languageFailure(context.realm, "TypeError", "date conversion requires a day object", loc);
        const fields: TemporalDateFields = { year: date.value.year, month: date.value.month, monthCode: null, day: null };
        const read = readTemporalDateField(supplied.object, "day", fields, context, loc);
        if (read.type === "throw") return read;
        const result = resolveTemporalDateFields(fields, false, context, loc);
        return result.type === "throw" ? result : createTemporalPlainDate(result.value, context.realm.temporalPlainDatePrototype, context, loc);
    });
}
