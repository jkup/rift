import {
    differenceISODate,
    type DateDifferenceUnit,
} from "../src/temporal/iso-calendar-difference.js";
import { addTemporalDate } from "../src/temporal/temporal-date-arithmetic.js";
import { isoDaysInMonth, isoDateToEpochDay, type ISODate } from "../src/temporal/iso-calendar.js";
import { isValidDuration } from "../src/temporal/temporal-duration.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function expect(start: ISODate, end: ISODate, unit: DateDifferenceUnit, expected: number[]): void {
    const result = differenceISODate(start, end, unit);
    check(
        result !== null &&
            result.years === expected[0] &&
            result.months === expected[1] &&
            result.weeks === expected[2] &&
            result.days === expected[3],
        "expected " + unit + " difference",
    );
}
expect(
    { year: 2020, month: 2, day: 29 },
    { year: 2021, month: 2, day: 28 },
    "year",
    [0, 11, 0, 30],
);
expect(
    { year: 2021, month: 2, day: 28 },
    { year: 2020, month: 2, day: 29 },
    "year",
    [0, -11, 0, -28],
);
expect(
    { year: 2023, month: 1, day: 31 },
    { year: 2023, month: 2, day: 28 },
    "month",
    [0, 0, 0, 28],
);
expect(
    { year: 2023, month: 2, day: 28 },
    { year: 2023, month: 1, day: 31 },
    "month",
    [0, 0, 0, -28],
);
expect(
    { year: 2023, month: 1, day: 31 },
    { year: 2023, month: 3, day: 30 },
    "month",
    [0, 1, 0, 30],
);
expect(
    { year: 2023, month: 3, day: 30 },
    { year: 2023, month: 1, day: 31 },
    "month",
    [0, -1, 0, -28],
);
expect({ year: 0, month: 1, day: 1 }, { year: -1, month: 12, day: 31 }, "year", [0, 0, 0, -1]);
expect({ year: 2024, month: 1, day: 1 }, { year: 2024, month: 1, day: 17 }, "week", [0, 0, 2, 2]);
expect({ year: 2024, month: 1, day: 17 }, { year: 2024, month: 1, day: 1 }, "week", [0, 0, -2, -2]);
expect({ year: 2024, month: 1, day: 1 }, { year: 2024, month: 1, day: 1 }, "year", [0, 0, 0, 0]);
const minimum = { year: -271821, month: 4, day: 19 },
    maximum = { year: 275760, month: 9, day: 13 };
expect(minimum, maximum, "day", [0, 0, 0, 200000001]);
expect(maximum, minimum, "day", [0, 0, 0, -200000001]);

function roundTrip(start: ISODate, end: ISODate, unit: DateDifferenceUnit): void {
    const difference = differenceISODate(start, end, unit);
    if (difference === null) {
        throw new Error("valid difference");
    }
    check(isValidDuration(difference), "common sign and bounds");
    const restored = addTemporalDate(start, difference, false, false);
    check(
        restored !== null &&
            restored.year === end.year &&
            restored.month === end.month &&
            restored.day === end.day,
        "date reconstruction",
    );
    if (unit === "year" || unit === "month") {
        const first = isoDateToEpochDay(start),
            last = isoDateToEpochDay(end);
        if (first === null || last === null) {
            throw new Error("test epoch");
        }
        const sign = last < first ? -1 : 1;
        const nextMonths =
            start.year * 12 + start.month - 1 + difference.years * 12 + difference.months + sign;
        const nextYear = Math.floor(nextMonths / 12),
            nextMonth = (((nextMonths % 12) + 12) % 12) + 1;
        let comparison: number;
        if (nextYear !== end.year) {
            comparison = nextYear - end.year;
        } else if (nextMonth !== end.month) {
            comparison = nextMonth - end.month;
        } else {
            comparison = start.day - end.day;
        }
        check(sign * comparison > 0, "maximal whole calendar months before clamping");
        if (unit === "year") {
            check(Math.abs(difference.months) < 12, "residual months");
        }
    }
}
for (const unit of ["year", "month", "week", "day"] as const) {
    roundTrip(minimum, maximum, unit);
    roundTrip(maximum, minimum, unit);
    for (let year = 2000; year < 2400; year++) {
        for (let month = 1; month <= 12; month++) {
            const start = { year, month, day: isoDaysInMonth(year, month) };
            const end = { year: year + 1, month: month === 12 ? 1 : month + 1, day: 1 };
            roundTrip(start, end, unit);
            roundTrip(end, start, unit);
        }
    }
}
check(
    differenceISODate({ year: 2023, month: 2, day: 29 }, maximum, "day") === null,
    "invalid start",
);
check(
    differenceISODate(minimum, { year: 275760, month: 9, day: 14 }, "day") === null,
    "invalid end",
);
console.log("iso calendar difference passed");
