import { temporalDifferenceOptions } from "./temporal-difference-options.js";
import type { DateDifferenceUnit } from "./iso-calendar-difference.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";
import type { Location } from "./syntax.js";
import {
    languageFailure,
    type Value,
    type OperationContext,
    type ThrowCompletion,
} from "./runtime.js";

export interface DateDifferenceSettings {
    readonly largest: DateDifferenceUnit;
    readonly smallest: DateDifferenceUnit;
    readonly increment: number;
    readonly mode: TemporalRoundingMode;
}

function dateUnit(name: string): DateDifferenceUnit | null {
    return name === "year" || name === "month" || name === "week" || name === "day" ? name : null;
}

const dateUnits: DateDifferenceUnit[] = ["year", "month", "week", "day"];

export function dateDifferenceSettings(
    supplied: Value,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: DateDifferenceSettings } | ThrowCompletion {
    const read = temporalDifferenceOptions(supplied, context, loc);
    if (read.type === "throw") {
        return read;
    }
    const settings = read.value;
    const smallest = dateUnit(settings.smallest === "" ? "day" : settings.smallest);
    if (smallest === null) {
        return languageFailure(
            context.realm,
            "RangeError",
            "date difference requires date units",
            loc,
        );
    }
    const largest =
        settings.largest === "" || settings.largest === "auto"
            ? smallest
            : dateUnit(settings.largest);
    if (largest === null || dateUnits.indexOf(largest) > dateUnits.indexOf(smallest)) {
        return languageFailure(
            context.realm,
            "RangeError",
            "largestUnit must be a date unit at least as large as smallestUnit",
            loc,
        );
    }
    return {
        type: "normal",
        value: { largest, smallest, increment: settings.increment, mode: settings.mode },
    };
}
