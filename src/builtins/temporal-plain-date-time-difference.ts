import type { Realm } from "../realm.js";
import { temporalPlainDateTimeValue } from "../temporal-plain-date-time-object.js";
import { toDateTimeFields } from "./temporal-plain-date-time-conversion.js";
import { createTemporalDuration } from "../temporal-duration-object.js";
import { dateTimeDifferenceSettings } from "../temporal-date-time-difference-options.js";
import { roundDateTimeDifference } from "../temporal-relative-date-time-round.js";
import { dateDuration } from "../temporal-calendar-round.js";
import { balanceDurationTime } from "../temporal-duration-balance.js";
import { negateTemporalRoundingMode } from "../temporal-rounding.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainDateTimeDifference(realm: Realm): void {
    for (const name of ["until", "since"]) {
        realm.registerBuiltin(
            realm.temporalPlainDateTimePrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                const left = temporalPlainDateTimeValue(receiver, context, loc);
                if (left.type === "throw") {
                    return left;
                }
                const right = toDateTimeFields(
                    args.length === 0 ? UNDEFINED : args[0],
                    UNDEFINED,
                    context,
                    loc,
                );
                if (right.type === "throw") {
                    return right;
                }
                const settings = dateTimeDifferenceSettings(
                    args.length < 2 ? UNDEFINED : args[1],
                    context,
                    loc,
                );
                if (settings.type === "throw") {
                    return settings;
                }
                const options = settings.value;
                const mode =
                    name === "since" ? negateTemporalRoundingMode(options.mode) : options.mode;
                const rounded = roundDateTimeDifference(
                    left.value,
                    right.value,
                    options.largest,
                    options.smallest,
                    options.increment,
                    mode,
                );
                if (rounded === null) {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "date-time difference rounding exceeds range",
                        loc,
                    );
                }
                const date =
                    name === "since"
                        ? dateDuration(
                              -rounded.date.years,
                              -rounded.date.months,
                              -rounded.date.weeks,
                              -rounded.date.days,
                          )
                        : rounded.date;
                const result = balanceDurationTime(
                    name === "since" ? -rounded.time : rounded.time,
                    date,
                    options.largest,
                );
                return result === null
                    ? languageFailure(
                          context.realm,
                          "RangeError",
                          "date-time difference exceeds duration range",
                          loc,
                      )
                    : createTemporalDuration(
                          result,
                          context.realm.temporalDurationPrototype,
                          context,
                          loc,
                      );
            },
        );
    }
}
