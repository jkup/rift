import type { Realm } from "../realm.js";
import { temporalDurationValue, createTemporalDuration } from "../temporal-duration-object.js";
import { toTemporalDurationFields } from "../temporal-duration-fields.js";
import { durationTimeNanoseconds } from "../temporal-duration.js";
import { balanceDurationTime, largestDurationUnit, largerDurationUnit } from "../temporal-duration-balance.js";
import { NANOSECONDS_PER_DAY } from "../temporal-time.js";
import { languageFailure, UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalDurationArithmetic(realm: Realm): void {
    for (const name of ["add", "subtract"]) {
        realm.registerBuiltin(realm.temporalDurationPrototype, name, 1, (receiver, args, context, loc): ValueCompletion => {
            const duration = temporalDurationValue(receiver, context, loc);
            if (duration.type === "throw") return duration;
            const other = toTemporalDurationFields(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (other.type === "throw") return other;
            const left = duration.value, right = other.value;
            const largest = largerDurationUnit(largestDurationUnit(left), largestDurationUnit(right));
            if (largest === "years" || largest === "months" || largest === "weeks")
                return languageFailure(context.realm, "RangeError", "Duration arithmetic cannot use calendar units", loc);
            const leftTime = durationTimeNanoseconds(left) + BigInt(left.days) * NANOSECONDS_PER_DAY;
            const rightTime = durationTimeNanoseconds(right) + BigInt(right.days) * NANOSECONDS_PER_DAY;
            const total = name === "add" ? leftTime + rightTime : leftTime - rightTime;
            const balanced = balanceDurationTime(total, { years:0, months:0, weeks:0, days:0, hours:0, minutes:0,
                seconds:0, milliseconds:0, microseconds:0, nanoseconds:0 }, largest);
            if (balanced === null) return languageFailure(context.realm, "RangeError", "duration arithmetic exceeds its range", loc);
            return createTemporalDuration(balanced, context.realm.temporalDurationPrototype, context, loc);
        });
    }
}
