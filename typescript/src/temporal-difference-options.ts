import type { Location } from "./syntax.js";
import { durationUnit, type DurationUnit } from "./temporal-duration-balance.js";
import type { TemporalRoundingMode } from "./temporal-rounding.js";
import { temporalUnitOption, temporalRoundingIncrement, temporalRoundingMode, temporalUnitNanoseconds } from "./temporal-options.js";
import { GuestObject, languageFailure, type Value, type OperationContext, type ThrowCompletion } from "./runtime.js";

export interface TimeDifferenceSettings {
    readonly largest: DurationUnit;
    readonly quantum: bigint;
    readonly mode: TemporalRoundingMode;
}

export { durationUnit } from "./temporal-duration-balance.js";

export interface DifferenceOptions {
    readonly largest: string;
    readonly smallest: string;
    readonly increment: number;
    readonly mode: TemporalRoundingMode;
}

export function temporalDifferenceOptions(supplied: Value, context: OperationContext, loc: Location): { type: "normal"; value: DifferenceOptions } | ThrowCompletion {
    let options: GuestObject;
    if (supplied.kind === "undefined") options = new GuestObject(null);
    else if (supplied.kind === "object") options = supplied.object;
    else return languageFailure(context.realm, "TypeError", "difference options must be an object", loc);
    const largestRead = temporalUnitOption(options, "largestUnit", context, loc);
    if (largestRead.type === "throw") return largestRead;
    const increment = temporalRoundingIncrement(options, context, loc);
    if (increment.type === "throw") return increment;
    const mode = temporalRoundingMode(options, context, loc, "trunc");
    if (mode.type === "throw") return mode;
    const smallestRead = temporalUnitOption(options, "smallestUnit", context, loc);
    if (smallestRead.type === "throw") return smallestRead;
    return { type: "normal", value: { largest: largestRead.value, smallest: smallestRead.value, increment: increment.value, mode: mode.value } };
}

export function timeDifferenceSettings(supplied: Value, fallbackLargest: "hour" | "second", context: OperationContext, loc: Location): { type: "normal"; value: TimeDifferenceSettings } | ThrowCompletion {
    const read = temporalDifferenceOptions(supplied, context, loc);
    if (read.type === "throw") return read;
    const settings = read.value;
    const smallest = settings.smallest === "" ? "nanosecond" : settings.smallest;
    const smallLength = temporalUnitNanoseconds(smallest);
    if (smallLength === null) return languageFailure(context.realm, "RangeError", "difference requires time units", loc);
    let largest = settings.largest;
    if (largest === "" || largest === "auto") {
        const fallbackLength = temporalUnitNanoseconds(fallbackLargest);
        if (fallbackLength === null) throw new Error("default difference unit invariant");
        largest = smallLength > fallbackLength ? smallest : fallbackLargest;
    }
    const largeLength = temporalUnitNanoseconds(largest);
    if (largeLength === null || largeLength < smallLength)
        return languageFailure(context.realm, "RangeError", "largestUnit must be a time unit at least as large as smallestUnit", loc);
    const maximum = smallest === "hour" ? 24 : smallest === "minute" || smallest === "second" ? 60 : 1000;
    if (settings.increment >= maximum || maximum % settings.increment !== 0)
        return languageFailure(context.realm, "RangeError", "difference increment must properly divide the next unit", loc);
    return { type: "normal", value: { largest: durationUnit(largest), quantum: BigInt(settings.increment) * smallLength, mode: settings.mode } };
}
