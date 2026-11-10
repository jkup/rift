import type { Realm } from "../realm.js";
import { createTemporalPlainDate, temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { mergeTemporalDateFields, readTemporalDateFields, resolveTemporalDateFields } from "../temporal-date-fields.js";
import { temporalPartialObject } from "../temporal-partial.js";
import { temporalOverflowReject } from "../temporal-options.js";
import { toTemporalCalendar } from "../temporal-calendar.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateWith(realm: Realm): void {
    realm.registerBuiltin(realm.temporalPlainDatePrototype, "with", 1, (receiver, args, context, loc): ValueCompletion => {
        const date = temporalPlainDateValue(receiver, context, loc);
        if (date.type === "throw") return date;
        const partial = temporalPartialObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (partial.type === "throw") return partial;
        const read = readTemporalDateFields(partial.value, context, loc);
        if (read.type === "throw") return read;
        const fields = read.value;
        if (fields.year === null && fields.month === null && fields.monthCode === null && fields.day === null)
            return languageFailure(context.realm, "TypeError", "at least one date field is required", loc);
        const merged = mergeTemporalDateFields(date.value, fields);
        const overflow = temporalOverflowReject(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (overflow.type === "throw") return overflow;
        const result = resolveTemporalDateFields(merged, overflow.value, context, loc);
        return result.type === "throw" ? result : createTemporalPlainDate(result.value, context.realm.temporalPlainDatePrototype, context, loc);
    });
    realm.registerBuiltin(realm.temporalPlainDatePrototype, "withCalendar", 1, (receiver, args, context, loc): ValueCompletion => {
        const date = temporalPlainDateValue(receiver, context, loc);
        if (date.type === "throw") return date;
        const calendar = toTemporalCalendar(args.length === 0 ? UNDEFINED : args[0], context, loc);
        return calendar.type === "throw" ? calendar : createTemporalPlainDate(date.value, context.realm.temporalPlainDatePrototype, context, loc);
    });
}
