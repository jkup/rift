import { temporalDateDurationDays } from "../src/temporal/temporal-date-duration-days.js";
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
check(temporalDateDurationDays({ ...zero, months: 1 }, january) === 29n, "constrain leap month");
check(
    temporalDateDurationDays({ ...zero, months: -1 }, march) === -31n,
    "negative month is not reversed positive month",
);
check(
    temporalDateDurationDays({ ...zero, years: 1 }, { year: 2020, month: 2, day: 29 }) === 365n,
    "leap year constrain",
);
check(
    temporalDateDurationDays({ ...zero, years: -1 }, { year: 2020, month: 2, day: 29 }) === -366n,
    "negative leap year constrain",
);
check(
    temporalDateDurationDays({ ...zero, months: 1, weeks: 2, days: 3, hours: 25 }, january) === 46n,
    "calendar then original days; time ignored",
);
check(
    temporalDateDurationDays({ ...zero, months: -1, weeks: -2, days: -3, hours: -25 }, march) ===
        -48n,
    "negative calendar and days",
);
const maximum = { year: 275760, month: 9, day: 13 },
    minimum = { year: -271821, month: 4, day: 19 };
check(
    temporalDateDurationDays({ ...zero, days: 104249991374 }, maximum) === 104249991374n,
    "day count is not a date addition",
);
check(
    temporalDateDurationDays({ ...zero, days: -104249991374 }, minimum) === -104249991374n,
    "negative day count is not a date addition",
);
check(
    temporalDateDurationDays({ ...zero, weeks: 1 }, maximum) === null,
    "calendar end above maximum",
);
check(
    temporalDateDurationDays({ ...zero, weeks: -1 }, minimum) === null,
    "calendar end below minimum",
);
check(
    temporalDateDurationDays(
        { ...zero, weeks: 1, days: 100 },
        { year: 275760, month: 9, day: 6 },
    ) === 107n,
    "days added after calendar endpoint validation",
);
check(temporalDateDurationDays(zero, minimum) === 0n, "minimum zero");
console.log("temporal date duration days passed");
