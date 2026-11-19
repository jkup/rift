import type { Realm } from "../../realm.js";
import { temporalPlainTimeValue } from "../../temporal/temporal-plain-time-object.js";
import { toTimeFields } from "./temporal-plain-time-conversion.js";
import { timeToNanoseconds } from "../../temporal/temporal-time.js";
import { createTemporalDuration } from "../../temporal/temporal-duration-object.js";
import { timeDifferenceSettings } from "../../temporal/temporal-difference-options.js";
import { balanceDurationTime } from "../../temporal/temporal-duration-balance.js";
import { roundTemporalInteger } from "../../temporal/temporal-rounding.js";
import { UNDEFINED, type ValueCompletion } from "../../runtime.js";

export function registerTemporalPlainTimeDifference(realm: Realm): void {
    for (const name of ["until", "since"]) {
        realm.registerBuiltin(
            realm.temporalPlainTimePrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                const left = temporalPlainTimeValue(receiver, context, loc);
                if (left.type === "throw") {
                    return left;
                }
                const right = toTimeFields(
                    args.length === 0 ? UNDEFINED : args[0],
                    UNDEFINED,
                    context,
                    loc,
                );
                if (right.type === "throw") {
                    return right;
                }
                const settings = timeDifferenceSettings(
                    args.length < 2 ? UNDEFINED : args[1],
                    "hour",
                    context,
                    loc,
                );
                if (settings.type === "throw") {
                    return settings;
                }
                const start = timeToNanoseconds(left.value),
                    end = timeToNanoseconds(right.value);
                if (start === null || end === null) {
                    throw new Error("PlainTime field invariant");
                }
                const difference = name === "until" ? end - start : start - end;
                const rounded = roundTemporalInteger(
                    difference,
                    settings.value.quantum,
                    settings.value.mode,
                );
                const balanced = balanceDurationTime(
                    rounded,
                    {
                        years: 0,
                        months: 0,
                        weeks: 0,
                        days: 0,
                        hours: 0,
                        minutes: 0,
                        seconds: 0,
                        milliseconds: 0,
                        microseconds: 0,
                        nanoseconds: 0,
                    },
                    settings.value.largest,
                );
                if (balanced === null) {
                    throw new Error("within-day duration range invariant");
                }
                return createTemporalDuration(
                    balanced,
                    context.realm.temporalDurationPrototype,
                    context,
                    loc,
                );
            },
        );
    }
}
