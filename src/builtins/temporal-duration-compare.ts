import { compareBigInts } from "../numeric.js";
import type { Realm } from "../realm.js";
import { toTemporalDurationFields } from "../temporal-duration-fields.js";
import { durationTimeNanoseconds, type DurationFields } from "../temporal-duration.js";
import { temporalDateDurationDays } from "../temporal-date-duration-days.js";
import { temporalRelativeToOption } from "../temporal-relative-to-option.js";
import { addTemporalZonedDateTime } from "../temporal-zoned-arithmetic.js";
import { NANOSECONDS_PER_DAY } from "../temporal-time.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type GuestObject,
    type ValueCompletion,
} from "../runtime.js";

function equalDuration(one: DurationFields, two: DurationFields): boolean {
    for (const name of [
        "years",
        "months",
        "weeks",
        "days",
        "hours",
        "minutes",
        "seconds",
        "milliseconds",
        "microseconds",
        "nanoseconds",
    ] as const) {
        if (one[name] !== two[name]) {
            return false;
        }
    }
    return true;
}

export function registerTemporalDurationCompare(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(
        constructor,
        "compare",
        2,
        (_receiver, args, context, loc): ValueCompletion => {
            const one = toTemporalDurationFields(
                args.length === 0 ? UNDEFINED : args[0],
                context,
                loc,
            );
            if (one.type === "throw") {
                return one;
            }
            const two = toTemporalDurationFields(
                args.length < 2 ? UNDEFINED : args[1],
                context,
                loc,
            );
            if (two.type === "throw") {
                return two;
            }
            const relative = temporalRelativeToOption(
                args.length < 3 ? UNDEFINED : args[2],
                context,
                loc,
            );
            if (relative.type === "throw") {
                return relative;
            }
            const left = one.value,
                right = two.value;
            if (equalDuration(left, right)) {
                return normal({ kind: "number", value: 0 });
            }
            const calendar =
                left.years !== 0 ||
                left.months !== 0 ||
                left.weeks !== 0 ||
                right.years !== 0 ||
                right.months !== 0 ||
                right.weeks !== 0;
            if (calendar && relative.value === null) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "calendar duration comparison requires relativeTo",
                    loc,
                );
            }
            if (
                relative.value !== null &&
                relative.value.kind === "zoned" &&
                (calendar || left.days !== 0 || right.days !== 0)
            ) {
                const first = addTemporalZonedDateTime(
                    relative.value.epoch,
                    relative.value.timeZone,
                    left,
                    false,
                    false,
                );
                if (first === null) {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "relative duration target overflows",
                        loc,
                    );
                }
                const last = addTemporalZonedDateTime(
                    relative.value.epoch,
                    relative.value.timeZone,
                    right,
                    false,
                    false,
                );
                return last === null
                    ? languageFailure(
                          context.realm,
                          "RangeError",
                          "relative duration target overflows",
                          loc,
                      )
                    : normal({ kind: "number", value: compareBigInts(first, last) });
            }
            const plain =
                relative.value !== null && relative.value.kind === "plain"
                    ? relative.value.date
                    : null;
            const leftDays =
                calendar && plain !== null
                    ? temporalDateDurationDays(left, plain)
                    : BigInt(left.days);
            if (leftDays === null) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "relative duration date overflows",
                    loc,
                );
            }
            const rightDays =
                calendar && plain !== null
                    ? temporalDateDurationDays(right, plain)
                    : BigInt(right.days);
            if (rightDays === null) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "relative duration date overflows",
                    loc,
                );
            }
            const leftTime = durationTimeNanoseconds(left) + leftDays * NANOSECONDS_PER_DAY;
            const rightTime = durationTimeNanoseconds(right) + rightDays * NANOSECONDS_PER_DAY;
            const limit = 9007199254740992000000000n;
            if (
                leftTime <= -limit ||
                leftTime >= limit ||
                rightTime <= -limit ||
                rightTime >= limit
            ) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "relative duration time exceeds its range",
                    loc,
                );
            }
            return normal({
                kind: "number",
                value: compareBigInts(leftTime, rightTime),
            });
        },
    );
}
