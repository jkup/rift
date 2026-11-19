import { totalRelativeDuration } from "../src/temporal/temporal-relative-duration-total.js";
import type { DurationFields } from "../src/temporal/temporal-duration.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const zero: DurationFields = {
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
};
const january = { year: 2020, month: 1, day: 31 },
    march = { year: 2020, month: 3, day: 31 };
check(totalRelativeDuration({ ...zero, months: 1 }, january, "month") === 1, "constrained month");
check(totalRelativeDuration({ ...zero, months: 1 }, january, "day") === 29, "leap month days");
check(totalRelativeDuration({ ...zero, months: -1 }, march, "day") === -31, "negative month days");
check(
    totalRelativeDuration({ ...zero, days: 14, hours: 12 }, january, "month") === 0.5,
    "half leap month",
);
check(
    totalRelativeDuration({ ...zero, days: -15, hours: -12 }, march, "month") === -0.5,
    "negative half month",
);
check(
    totalRelativeDuration({ ...zero, months: 1, days: 15, hours: 12 }, january, "month") === 1.5,
    "fraction after constrained month",
);
check(
    totalRelativeDuration({ ...zero, weeks: 1, days: 3, hours: 12 }, january, "week") === 1.5,
    "fractional week",
);
check(
    totalRelativeDuration({ ...zero, weeks: -1, days: -3, hours: -12 }, january, "week") === -1.5,
    "negative fractional week",
);
check(
    totalRelativeDuration({ ...zero, days: 183 }, { year: 2020, month: 1, day: 1 }, "year") === 0.5,
    "half leap year",
);
check(
    totalRelativeDuration(
        { ...zero, days: -182, hours: -12 },
        { year: 2020, month: 1, day: 1 },
        "year",
    ) === -0.5,
    "half preceding year",
);
const units = ["day", "hour", "minute", "second", "millisecond", "microsecond", "nanosecond"];
const values = [1.5, 36, 2160, 129600, 129600000, 129600000000, 129600000000000];
for (let i = 0; i < units.length; i++) {
    for (const sign of [1, -1]) {
        check(
            totalRelativeDuration({ ...zero, days: sign, hours: sign * 12 }, january, units[i]) ===
                sign * values[i],
            "time total " + units[i],
        );
    }
}
check(
    totalRelativeDuration({ ...zero, nanoseconds: -1 }, january, "nanosecond") === -1,
    "negative midnight borrow",
);
const minimum = { year: -271821, month: 4, day: 19 },
    maximum = { year: 275760, month: 9, day: 13 };
for (const unit of ["year", "month", "week", ...units]) {
    check(totalRelativeDuration(zero, minimum, unit) === 0, "equal target shortcut " + unit);
}
check(
    totalRelativeDuration({ ...zero, nanoseconds: 1 }, minimum, "nanosecond") === null,
    "minimum midnight is outside DateTime bounds",
);
check(
    totalRelativeDuration({ ...zero, days: 1 }, maximum, "day") === null,
    "target date exceeds bounds",
);
check(
    totalRelativeDuration({ ...zero, hours: 1 }, maximum, "hour") === 1,
    "maximum date time within bounds",
);
check(
    totalRelativeDuration({ ...zero, hours: 1 }, maximum, "month") === null,
    "calendar rounding endpoint beyond bounds",
);
check(
    totalRelativeDuration({ ...zero, days: 104249991374 }, january, "day") === null,
    "relative date addition limits large days",
);
console.log("temporal relative duration total passed");
