import type { Realm } from "../../realm.js";
import { temporalPlainDateValue } from "../../temporal/temporal-plain-date-object.js";
import { createTemporalPlainMonthDay } from "../../temporal/temporal-plain-month-day-object.js";
import type { ValueCompletion } from "../../runtime.js";

export function registerTemporalPlainDateToMonthDay(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalPlainDatePrototype,
        "toPlainMonthDay",
        0,
        (receiver, _args, context, loc): ValueCompletion => {
            const date = temporalPlainDateValue(receiver, context, loc);
            if (date.type === "throw") {
                return date;
            }
            const result = { year: 1972, month: date.value.month, day: date.value.day };
            return createTemporalPlainMonthDay(
                result,
                context.realm.temporalPlainMonthDayPrototype,
                context,
                loc,
            );
        },
    );
}
