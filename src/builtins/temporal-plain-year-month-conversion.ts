import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import type { ISODate } from "../iso-calendar.js";
import { isoYearMonthWithinLimits } from "../iso-year-month.js";
import {
    GuestTemporalPlainYearMonth,
    createTemporalPlainYearMonth,
    temporalPlainYearMonthValue,
} from "../temporal-plain-year-month-object.js";
import {
    readTemporalYearMonthFields,
    resolveTemporalYearMonthFields,
} from "../temporal-year-month-fields.js";
import { parseTemporalPlainYearMonth } from "../temporal-plain-year-month-parse.js";
import { temporalCalendarWithISODefault } from "../temporal-calendar.js";
import { temporalOverflowReject } from "../temporal-options.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type GuestObject,
    type Value,
    type OperationContext,
    type ThrowCompletion,
    type ValueCompletion,
} from "../runtime.js";

export function toYearMonthFields(
    value: Value,
    options: Value,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: ISODate } | ThrowCompletion {
    let date: ISODate;
    if (value.kind === "object") {
        if (value.object instanceof GuestTemporalPlainYearMonth) {
            date = value.object.date;
        } else {
            const calendar = temporalCalendarWithISODefault(value.object, context, loc);
            if (calendar.type === "throw") {
                return calendar;
            }
            const fields = readTemporalYearMonthFields(value.object, context, loc);
            if (fields.type === "throw") {
                return fields;
            }
            const overflow = temporalOverflowReject(options, context, loc);
            return overflow.type === "throw"
                ? overflow
                : resolveTemporalYearMonthFields(fields.value, overflow.value, context, loc);
        }
    } else if (value.kind === "string") {
        for (let i = 0; i < value.value.length; i++) {
            const work = context.tick(loc);
            if (work.type === "throw") {
                return work;
            }
        }
        const parsed = parseTemporalPlainYearMonth(value.value);
        if (parsed === null) {
            return languageFailure(
                context.realm,
                "RangeError",
                "invalid PlainYearMonth string",
                loc,
            );
        }
        date = { year: parsed.year, month: parsed.month, day: 1 };
    } else {
        return languageFailure(
            context.realm,
            "TypeError",
            "PlainYearMonth requires a string or date object",
            loc,
        );
    }
    const overflow = temporalOverflowReject(options, context, loc);
    if (overflow.type === "throw") {
        return overflow;
    }
    if (!isoYearMonthWithinLimits(date)) {
        return languageFailure(context.realm, "RangeError", "date is outside its range", loc);
    }
    return { type: "normal", value: date };
}

function compareDate(left: ISODate, right: ISODate): number {
    for (const name of ["year", "month", "day"] as const) {
        if (left[name] < right[name]) {
            return -1;
        }
        if (left[name] > right[name]) {
            return 1;
        }
    }
    return 0;
}

export function registerTemporalPlainYearMonthConversion(
    realm: Realm,
    constructor: GuestObject,
): void {
    realm.registerBuiltin(
        constructor,
        "from",
        1,
        (_receiver, args, context, loc): ValueCompletion => {
            const result = toYearMonthFields(
                args.length === 0 ? UNDEFINED : args[0],
                args.length < 2 ? UNDEFINED : args[1],
                context,
                loc,
            );
            return result.type === "throw"
                ? result
                : createTemporalPlainYearMonth(
                      result.value,
                      context.realm.temporalPlainYearMonthPrototype,
                      context,
                      loc,
                  );
        },
    );
    realm.registerBuiltin(
        constructor,
        "compare",
        2,
        (_receiver, args, context, loc): ValueCompletion => {
            const left = toYearMonthFields(
                args.length === 0 ? UNDEFINED : args[0],
                UNDEFINED,
                context,
                loc,
            );
            if (left.type === "throw") {
                return left;
            }
            const right = toYearMonthFields(
                args.length < 2 ? UNDEFINED : args[1],
                UNDEFINED,
                context,
                loc,
            );
            return right.type === "throw"
                ? right
                : normal({ kind: "number", value: compareDate(left.value, right.value) });
        },
    );
    realm.registerBuiltin(
        realm.temporalPlainYearMonthPrototype,
        "equals",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const left = temporalPlainYearMonthValue(receiver, context, loc);
            if (left.type === "throw") {
                return left;
            }
            const right = toYearMonthFields(
                args.length === 0 ? UNDEFINED : args[0],
                UNDEFINED,
                context,
                loc,
            );
            return right.type === "throw"
                ? right
                : normal({ kind: "boolean", value: compareDate(left.value, right.value) === 0 });
        },
    );
}
