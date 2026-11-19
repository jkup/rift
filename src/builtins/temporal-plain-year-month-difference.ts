import { differenceISODate } from "../iso-calendar-difference.js";
import { isoDateWithinLimits } from "../iso-calendar-fields.js";
import type { Realm } from "../realm.js";
import { temporalPlainYearMonthValue } from "../temporal-plain-year-month-object.js";
import { toYearMonthFields } from "./temporal-plain-year-month-conversion.js";
import { createTemporalDuration } from "../temporal-duration-object.js";
import { yearMonthDifferenceSettings } from "../temporal-year-month-difference-options.js";
import { roundDateDifference } from "../temporal-date-round.js";
import { dateDuration } from "../temporal-calendar-round.js";
import { negateTemporalRoundingMode } from "../temporal-rounding.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainYearMonthDifference(realm: Realm): void {
    for (const name of ["until", "since"]) {
        realm.registerBuiltin(
            realm.temporalPlainYearMonthPrototype,
            name,
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
                if (right.type === "throw") {
                    return right;
                }
                const settings = yearMonthDifferenceSettings(
                    args.length < 2 ? UNDEFINED : args[1],
                    context,
                    loc,
                );
                if (settings.type === "throw") {
                    return settings;
                }
                const options = settings.value;
                if (
                    left.value.year === right.value.year &&
                    left.value.month === right.value.month &&
                    left.value.day === right.value.day
                ) {
                    return createTemporalDuration(
                        dateDuration(0, 0, 0, 0),
                        context.realm.temporalDurationPrototype,
                        context,
                        loc,
                    );
                }
                const first = { year: left.value.year, month: left.value.month, day: 1 };
                const last = { year: right.value.year, month: right.value.month, day: 1 };
                if (!isoDateWithinLimits(first) || !isoDateWithinLimits(last)) {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "year-month first day is outside date range",
                        loc,
                    );
                }
                const mode =
                    name === "since" ? negateTemporalRoundingMode(options.mode) : options.mode;
                const rounded =
                    options.smallest === "month" && options.increment === 1
                        ? differenceISODate(first, last, options.largest)
                        : roundDateDifference(
                              first,
                              last,
                              options.largest,
                              options.smallest,
                              options.increment,
                              mode,
                          );
                if (rounded === null) {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "date difference rounding exceeds date range",
                        loc,
                    );
                }
                const result =
                    name === "since"
                        ? dateDuration(
                              -rounded.years,
                              -rounded.months,
                              -rounded.weeks,
                              -rounded.days,
                          )
                        : rounded;
                return createTemporalDuration(
                    result,
                    context.realm.temporalDurationPrototype,
                    context,
                    loc,
                );
            },
        );
    }
}
