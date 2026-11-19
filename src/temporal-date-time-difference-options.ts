import { temporalDifferenceOptions, durationUnit } from "./temporal-difference-options.js";
import type { DurationUnit } from "./temporal-duration-balance.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";
import type { Location } from "./syntax.js";
import {
    languageFailure,
    type Value,
    type OperationContext,
    type ThrowCompletion,
} from "./runtime.js";

export interface DateTimeDifferenceSettings {
    readonly largest: DurationUnit;
    readonly smallest: DurationUnit;
    readonly increment: number;
    readonly mode: TemporalRoundingMode;
}

const units = [
    "year",
    "month",
    "week",
    "day",
    "hour",
    "minute",
    "second",
    "millisecond",
    "microsecond",
    "nanosecond",
];

export function dateTimeDifferenceSettings(
    supplied: Value,
    context: OperationContext,
    loc: Location,
    fallbackLargest: "day" | "hour" = "day",
): { type: "normal"; value: DateTimeDifferenceSettings } | ThrowCompletion {
    const read = temporalDifferenceOptions(supplied, context, loc);
    if (read.type === "throw") {
        return read;
    }
    const options = read.value;
    const smallest = options.smallest === "" ? "nanosecond" : options.smallest;
    const smallIndex = units.indexOf(smallest);
    if (smallIndex < 0) {
        return languageFailure(
            context.realm,
            "RangeError",
            "invalid smallestUnit for date-time difference",
            loc,
        );
    }
    const largeIndex =
        options.largest === "" || options.largest === "auto"
            ? Math.min(fallbackLargest === "day" ? 3 : 4, smallIndex)
            : units.indexOf(options.largest);
    if (largeIndex < 0 || largeIndex > smallIndex) {
        return languageFailure(
            context.realm,
            "RangeError",
            "largestUnit must be at least as large as smallestUnit",
            loc,
        );
    }
    if (smallIndex > 3) {
        const maximum =
            smallest === "hour" ? 24 : smallest === "minute" || smallest === "second" ? 60 : 1000;
        if (options.increment >= maximum || maximum % options.increment !== 0) {
            return languageFailure(
                context.realm,
                "RangeError",
                "difference increment must properly divide the next unit",
                loc,
            );
        }
    }
    return {
        type: "normal",
        value: {
            largest: durationUnit(units[largeIndex]),
            smallest: durationUnit(smallest),
            increment: options.increment,
            mode: options.mode,
        },
    };
}
