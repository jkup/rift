import { roundDayTimeDifference } from "../src/temporal-day-time-round.js";
import { dateDuration } from "../src/temporal-calendar-round.js";
import { NANOSECONDS_PER_DAY } from "../src/temporal-time.js";
import { MAX_EPOCH_NANOSECONDS } from "../src/iso-calendar.js";
import type { TemporalRoundingMode } from "../src/temporal-rounding.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
const hour = 3600000000000n;
const modes: TemporalRoundingMode[] = [
    "ceil",
    "floor",
    "expand",
    "trunc",
    "halfCeil",
    "halfFloor",
    "halfExpand",
    "halfTrunc",
    "halfEven",
];
const positive = [2, 1, 2, 1, 2, 1, 2, 1, 2],
    negative = [-1, -2, -2, -1, -1, -2, -2, -1, -2];
for (let i = 0; i < modes.length; i++) {
    const forward = roundDayTimeDifference(
        { date: dateDuration(0, 0, 0, 1), time: 12n * hour },
        5n * NANOSECONDS_PER_DAY,
        "days",
        "days",
        1,
        modes[i],
    );
    const backward = roundDayTimeDifference(
        { date: dateDuration(0, 0, 0, -1), time: -12n * hour },
        -5n * NANOSECONDS_PER_DAY,
        "days",
        "days",
        1,
        modes[i],
    );
    check(
        forward !== null &&
            forward.duration.date.days === positive[i] &&
            forward.duration.time === 0n,
        "positive day tie " + modes[i],
    );
    check(
        backward !== null &&
            backward.duration.date.days === negative[i] &&
            backward.duration.time === 0n,
        "negative day tie " + modes[i],
    );
}
let result = roundDayTimeDifference(
    { date: dateDuration(1, 2, 0, 2), time: NANOSECONDS_PER_DAY - 500000000n },
    0n,
    "years",
    "seconds",
    1,
    "halfExpand",
);
check(
    result !== null &&
        result.duration.date.years === 1 &&
        result.duration.date.months === 2 &&
        result.duration.date.days === 3 &&
        result.duration.time === 0n &&
        result.expanded &&
        result.epochNanoseconds === 500000000n,
    "calendar-preserving day carry",
);
result = roundDayTimeDifference(
    { date: dateDuration(-1, -2, 0, -2), time: -NANOSECONDS_PER_DAY + 500000000n },
    0n,
    "years",
    "seconds",
    1,
    "halfExpand",
);
check(
    result !== null &&
        result.duration.date.years === -1 &&
        result.duration.date.months === -2 &&
        result.duration.date.days === -3 &&
        result.duration.time === 0n &&
        result.expanded &&
        result.epochNanoseconds === -500000000n,
    "negative day carry",
);
result = roundDayTimeDifference(
    { date: dateDuration(0, 0, 0, 2), time: hour },
    0n,
    "hours",
    "hours",
    1,
    "trunc",
);
check(
    result !== null &&
        result.duration.date.days === 0 &&
        result.duration.time === 49n * hour &&
        !result.expanded &&
        result.epochNanoseconds === 0n,
    "time-only largest unit folds days",
);
result = roundDayTimeDifference(
    { date: dateDuration(0, 1, 0), time: 0n },
    123n,
    "months",
    "hours",
    1,
    "trunc",
);
check(
    result !== null &&
        result.duration.date.months === 1 &&
        result.duration.time === 0n &&
        result.expanded &&
        result.epochNanoseconds === 123n,
    "zero day expansion signal",
);
result = roundDayTimeDifference(
    { date: dateDuration(0, 0, 0), time: 1n },
    1n,
    "days",
    "nanoseconds",
    1,
    "trunc",
);
check(result !== null && result.duration.time === 1n && !result.expanded, "exact nonzero time");
const limit = MAX_EPOCH_NANOSECONDS + NANOSECONDS_PER_DAY;
result = roundDayTimeDifference(
    { date: dateDuration(0, 0, 0), time: 999999999n },
    limit - 1n,
    "seconds",
    "seconds",
    1,
    "ceil",
);
check(
    result !== null && result.epochNanoseconds === limit && result.duration.time === 1000000000n,
    "internal upper endpoint",
);
result = roundDayTimeDifference(
    { date: dateDuration(0, 0, 0), time: -999999999n },
    -limit + 1n,
    "seconds",
    "seconds",
    1,
    "floor",
);
check(
    result !== null && result.epochNanoseconds === -limit && result.duration.time === -1000000000n,
    "internal lower endpoint",
);
result = roundDayTimeDifference(
    { date: dateDuration(0, 0, 0, 1), time: 0n },
    NANOSECONDS_PER_DAY,
    "days",
    "days",
    1000000000,
    "ceil",
);
check(
    result !== null &&
        result.duration.date.days === 1000000000 &&
        result.epochNanoseconds === 1000000000n * NANOSECONDS_PER_DAY &&
        result.expanded,
    "large calendar increment",
);
for (const increment of [0, -1, 1.5, 1000000001]) {
    check(
        roundDayTimeDifference(
            { date: dateDuration(0, 0, 0), time: 1n },
            0n,
            "days",
            "days",
            increment,
            "trunc",
        ) === null,
        "invalid increment",
    );
}
check(
    roundDayTimeDifference(
        { date: dateDuration(0, 0, 0), time: 1n },
        0n,
        "months",
        "months",
        1,
        "trunc",
    ) === null,
    "calendar unit has separate nudging",
);
console.log("temporal day time round passed");
