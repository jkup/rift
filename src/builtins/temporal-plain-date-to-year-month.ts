import type { Realm } from "../realm.js";
import { temporalPlainDateValue } from "../temporal-plain-date-object.js";
import { createTemporalPlainYearMonth } from "../temporal-plain-year-month-object.js";
import type { ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateToYearMonth(realm: Realm): void {
    realm.registerBuiltin(realm.temporalPlainDatePrototype, "toPlainYearMonth", 0, (receiver, _args, context, loc): ValueCompletion => {
        const date = temporalPlainDateValue(receiver, context, loc);
        if (date.type === "throw") return date;
        const result = { year: date.value.year, month: date.value.month, day: 1 };
        return createTemporalPlainYearMonth(result, context.realm.temporalPlainYearMonthPrototype, context, loc);
    });
}
