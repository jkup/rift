import type { Realm } from "../realm.js";
import { toTemporalDurationFields } from "../temporal-duration-fields.js";
import { durationTimeNanoseconds, type DurationFields } from "../temporal-duration.js";
import { temporalDateDurationDays } from "../temporal-date-duration-days.js";
import { temporalRelativeToOption } from "../temporal-relative-to-option.js";
import { NANOSECONDS_PER_DAY } from "../temporal-time.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

function equalDuration(one: DurationFields, two: DurationFields): boolean {
    for (const name of ["years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds", "microseconds", "nanoseconds"] as const)
        if (one[name] !== two[name]) return false;
    return true;
}

export function registerTemporalDurationCompare(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "compare", 2, (_receiver, args, context, loc): ValueCompletion => {
        const one = toTemporalDurationFields(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (one.type === "throw") return one;
        const two = toTemporalDurationFields(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (two.type === "throw") return two;
        const relative = temporalRelativeToOption(args.length < 3 ? UNDEFINED : args[2], context, loc);
        if (relative.type === "throw") return relative;
        const left = one.value, right = two.value;
        if (equalDuration(left, right)) return normal({ kind: "number", value: 0 });
        const calendar = left.years !== 0 || left.months !== 0 || left.weeks !== 0 ||
            right.years !== 0 || right.months !== 0 || right.weeks !== 0;
        if (calendar && relative.value === null)
            return languageFailure(context.realm, "RangeError", "calendar duration comparison requires relativeTo", loc);
        const leftDays = calendar && relative.value !== null ? temporalDateDurationDays(left, relative.value) : BigInt(left.days);
        if (leftDays === null) return languageFailure(context.realm, "RangeError", "relative duration date overflows", loc);
        const rightDays = calendar && relative.value !== null ? temporalDateDurationDays(right, relative.value) : BigInt(right.days);
        if (rightDays === null) return languageFailure(context.realm, "RangeError", "relative duration date overflows", loc);
        const leftTime = durationTimeNanoseconds(left) + leftDays * NANOSECONDS_PER_DAY;
        const rightTime = durationTimeNanoseconds(right) + rightDays * NANOSECONDS_PER_DAY;
        const limit = 9007199254740992000000000n;
        if (leftTime <= -limit || leftTime >= limit || rightTime <= -limit || rightTime >= limit)
            return languageFailure(context.realm, "RangeError", "relative duration time exceeds its range", loc);
        return normal({ kind: "number", value: leftTime < rightTime ? -1 : leftTime > rightTime ? 1 : 0 });
    });
}
