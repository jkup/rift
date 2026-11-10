import { temporalDifferenceOptions } from "./temporal-difference-options.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";
import type { Location } from "./syntax.js";
import { languageFailure, type Value, type OperationContext, type ThrowCompletion } from "./runtime.js";

export interface YearMonthDifferenceSettings {
    readonly largest: "year" | "month";
    readonly smallest: "year" | "month";
    readonly increment: number;
    readonly mode: TemporalRoundingMode;
}

export function yearMonthDifferenceSettings(supplied: Value, context: OperationContext, loc: Location): { type: "normal"; value: YearMonthDifferenceSettings } | ThrowCompletion {
    const read = temporalDifferenceOptions(supplied, context, loc);
    if (read.type === "throw") return read;
    const settings = read.value;
    const smallest = settings.smallest === "" ? "month" : settings.smallest;
    const largest = settings.largest === "" || settings.largest === "auto" ? "year" : settings.largest;
    if ((smallest !== "year" && smallest !== "month") || (largest !== "year" && largest !== "month") || (largest === "month" && smallest === "year"))
        return languageFailure(context.realm, "RangeError", "year-month differences require ordered year or month units", loc);
    return { type: "normal", value: { largest, smallest, increment: settings.increment, mode: settings.mode } };
}
