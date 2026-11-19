import type { Realm } from "../realm.js";
import { createTemporalPlainMonthDay, temporalPlainMonthDayValue } from "../temporal-plain-month-day-object.js";
import { mergeTemporalDateFields, readTemporalDateFields, readTemporalDateField, resolveTemporalDateFields, type TemporalDateFields } from "../temporal-date-fields.js";
import { resolveTemporalMonthDayFields } from "../temporal-month-day-fields.js";
import { createTemporalPlainDate } from "../temporal-plain-date-object.js";
import { temporalPartialObject } from "../temporal-partial.js";
import { temporalOverflowReject } from "../temporal-options.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainMonthDayFields(realm: Realm): void {
    realm.registerBuiltin(realm.temporalPlainMonthDayPrototype, "with", 1, (receiver, args, context, loc): ValueCompletion => {
        const date = temporalPlainMonthDayValue(receiver, context, loc);
        if (date.type === "throw") return date;
        const partial = temporalPartialObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (partial.type === "throw") return partial;
        const read = readTemporalDateFields(partial.value, context, loc);
        if (read.type === "throw") return read;
        const fields = read.value;
        if (fields.year === null && fields.month === null && fields.monthCode === null && fields.day === null)
            return languageFailure(context.realm, "TypeError", "at least one month-day field is required", loc);
        const merged = mergeTemporalDateFields(date.value, fields);
        merged.year = fields.year;
        const overflow = temporalOverflowReject(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (overflow.type === "throw") return overflow;
        const result = resolveTemporalMonthDayFields(merged, overflow.value, context, loc);
        return result.type === "throw" ? result : createTemporalPlainMonthDay(result.value, context.realm.temporalPlainMonthDayPrototype, context, loc);
    });
    realm.registerBuiltin(realm.temporalPlainMonthDayPrototype, "toPlainDate", 1, (receiver, args, context, loc): ValueCompletion => {
        const date = temporalPlainMonthDayValue(receiver, context, loc);
        if (date.type === "throw") return date;
        const supplied = args.length === 0 ? UNDEFINED : args[0];
        if (supplied.kind !== "object") return languageFailure(context.realm, "TypeError", "date conversion requires a year object", loc);
        const fields: TemporalDateFields = { year: null, month: date.value.month, monthCode: null, day: date.value.day };
        const read = readTemporalDateField(supplied.object, "year", fields, context, loc);
        if (read.type === "throw") return read;
        const result = resolveTemporalDateFields(fields, false, context, loc);
        return result.type === "throw" ? result : createTemporalPlainDate(result.value, context.realm.temporalPlainDatePrototype, context, loc);
    });
}
