import { roundCalendarDateDifference } from "../src/temporal/temporal-calendar-round.js";
import {
    differenceISODate,
    type DateDifferenceUnit,
} from "../src/temporal/iso-calendar-difference.js";
import { isoDateToEpochDay, type ISODate } from "../src/temporal/iso-calendar.js";
import { addTemporalDate } from "../src/temporal/temporal-date-arithmetic.js";
import type { TemporalRoundingMode } from "../src/temporal/temporal-rounding.js";

function expect(
    origin: ISODate,
    end: ISODate,
    unit: "year" | "month" | "week",
    mode: TemporalRoundingMode,
    expected: number[],
    increment = 1,
    largest: DateDifferenceUnit = unit,
): void {
    const difference = differenceISODate(origin, end, largest);
    if (difference === null) {
        throw new Error("test difference");
    }
    const rounded = roundCalendarDateDifference(origin, end, difference, unit, increment, mode);
    if (rounded === null) {
        throw new Error("unexpected rounding range failure");
    }
    const value = rounded.duration;
    if (
        value.years !== expected[0] ||
        value.months !== expected[1] ||
        value.weeks !== expected[2] ||
        value.days !== 0
    ) {
        throw new Error(
            unit + " " + mode + ": " + value.years + "," + value.months + "," + value.weeks,
        );
    }
    const restored = addTemporalDate(origin, value, false, false);
    if (restored === null || isoDateToEpochDay(restored) !== rounded.epochDay) {
        throw new Error("rounded endpoint");
    }
}
const april = { year: 2023, month: 4, day: 1 },
    halfway = { year: 2023, month: 4, day: 16 };
const may = { year: 2023, month: 5, day: 1 };
const tieDifference = differenceISODate(april, halfway, "month");
if (tieDifference === null) {
    throw new Error("tie difference");
}
const expanded = roundCalendarDateDifference(april, halfway, tieDifference, "month", 1, "ceil");
const contracted = roundCalendarDateDifference(april, halfway, tieDifference, "month", 1, "trunc");
if (expanded === null || contracted === null || !expanded.expanded || contracted.expanded) {
    throw new Error("carry signal");
}
for (const mode of ["ceil", "expand", "halfCeil", "halfExpand"] as const) {
    expect(april, halfway, "month", mode, [0, 1, 0]);
}
for (const mode of ["floor", "trunc", "halfFloor", "halfTrunc", "halfEven"] as const) {
    expect(april, halfway, "month", mode, [0, 0, 0]);
}
for (const mode of ["floor", "expand", "halfFloor", "halfExpand"] as const) {
    expect(may, halfway, "month", mode, [0, -1, 0]);
}
for (const mode of ["ceil", "trunc", "halfCeil", "halfTrunc", "halfEven"] as const) {
    expect(may, halfway, "month", mode, [0, 0, 0]);
}
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2023, month: 2, day: 15 },
    "month",
    "halfEven",
    [0, 2, 0],
);
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2023, month: 1, day: 16 },
    "month",
    "halfExpand",
    [0, 0, 0],
);
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2023, month: 1, day: 17 },
    "month",
    "halfExpand",
    [0, 1, 0],
);
expect(
    { year: 2024, month: 2, day: 1 },
    { year: 2024, month: 2, day: 15 },
    "month",
    "halfExpand",
    [0, 0, 0],
);
expect(
    { year: 2024, month: 2, day: 1 },
    { year: 2024, month: 2, day: 16 },
    "month",
    "halfExpand",
    [0, 1, 0],
);
expect(
    { year: 2023, month: 1, day: 31 },
    { year: 2023, month: 2, day: 28 },
    "month",
    "trunc",
    [0, 1, 0],
);
expect(
    { year: 2023, month: 3, day: 31 },
    { year: 2023, month: 2, day: 28 },
    "month",
    "trunc",
    [0, -1, 0],
);
expect(
    { year: 2024, month: 1, day: 1 },
    { year: 2024, month: 7, day: 2 },
    "year",
    "halfEven",
    [0, 0, 0],
);
expect(
    { year: 2024, month: 1, day: 1 },
    { year: 2024, month: 7, day: 3 },
    "year",
    "halfEven",
    [1, 0, 0],
);
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2023, month: 1, day: 11 },
    "week",
    "halfExpand",
    [0, 0, 1],
);
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2023, month: 1, day: 12 },
    "week",
    "halfExpand",
    [0, 0, 2],
);
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2023, month: 1, day: 15 },
    "week",
    "trunc",
    [0, 0, 2],
);
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2023, month: 4, day: 1 },
    "month",
    "trunc",
    [0, 0, 0],
    6,
);
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2023, month: 4, day: 1 },
    "month",
    "ceil",
    [0, 6, 0],
    6,
);
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2024, month: 2, day: 20 },
    "month",
    "ceil",
    [1, 2, 0],
    1,
    "year",
);
expect(
    { year: 2023, month: 1, day: 1 },
    { year: 2024, month: 2, day: 20 },
    "week",
    "trunc",
    [1, 1, 2],
    1,
    "year",
);
const origin = { year: 275760, month: 9, day: 1 },
    end = { year: 275760, month: 9, day: 13 };
const difference = differenceISODate(origin, end, "month");
if (
    difference === null ||
    roundCalendarDateDifference(origin, end, difference, "month", 1, "trunc") !== null
) {
    throw new Error("outer boundary must be representable");
}
console.log("temporal calendar round passed");
