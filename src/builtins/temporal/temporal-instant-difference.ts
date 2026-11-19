import type { Realm } from "../../realm.js";
import { temporalInstantValue } from "../../temporal/temporal-instant-object.js";
import { toInstantNanoseconds } from "./temporal-instant-conversion.js";
import { createTemporalDuration } from "../../temporal/temporal-duration-object.js";
import { timeDifferenceSettings } from "../../temporal/temporal-difference-options.js";
import { balanceDurationTime } from "../../temporal/temporal-duration-balance.js";
import { roundTemporalInteger } from "../../temporal/temporal-rounding.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../../runtime.js";

export function registerTemporalInstantDifference(realm: Realm): void {
    for (const name of ["until", "since"]) {
        realm.registerBuiltin(
            realm.temporalInstantPrototype,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                const left = temporalInstantValue(receiver, context, loc);
                if (left.type === "throw") {
                    return left;
                }
                const right = toInstantNanoseconds(
                    args.length === 0 ? UNDEFINED : args[0],
                    context,
                    loc,
                );
                if (right.type === "throw") {
                    return right;
                }
                const settings = timeDifferenceSettings(
                    args.length < 2 ? UNDEFINED : args[1],
                    "second",
                    context,
                    loc,
                );
                if (settings.type === "throw") {
                    return settings;
                }
                const difference =
                    name === "until" ? right.value - left.value : left.value - right.value;
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
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "Instant difference exceeds duration range",
                        loc,
                    );
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
