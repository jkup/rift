import { isoDateToEpochDay, isValidEpochNanoseconds, NANOSECONDS_PER_DAY } from "./iso-calendar.js";
import { parseUTCOffset } from "./utc-offset.js";
import { timeToNanoseconds } from "./temporal-time.js";
import { TemporalISOScanner, temporalISODate, temporalISOTime, temporalISOAnnotations } from "./temporal-iso-parser.js";

export function parseTemporalInstant(text: string): bigint | null {
    const scanner = new TemporalISOScanner(text);
    const date = temporalISODate(scanner);
    if (date === null) return null;
    const epochDay = isoDateToEpochDay(date);
    if (epochDay === null || (!scanner.take("T") && !scanner.take("t") && !scanner.take(" "))) return null;
    const time = temporalISOTime(scanner);
    if (time === null) return null;
    const within = timeToNanoseconds(time);
    if (within === null) throw new Error("parsed time range invariant");
    let offset = 0n;
    if (!scanner.take("Z") && !scanner.take("z")) {
        const end = text.indexOf("[", scanner.index);
        const parsed = parseUTCOffset(text.slice(scanner.index, end < 0 ? text.length : end));
        if (parsed === null) return null;
        offset = parsed;
        scanner.index = end < 0 ? text.length : end;
    }
    if (!temporalISOAnnotations(scanner)) return null;
    const value = BigInt(epochDay) * NANOSECONDS_PER_DAY +
        within - offset;
    return isValidEpochNanoseconds(value) ? value : null;
}
