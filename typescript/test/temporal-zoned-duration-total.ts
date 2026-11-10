import { totalZonedRelativeDuration } from "../src/temporal-zoned-duration-total.js";
import { dateDuration } from "../src/temporal-calendar-round.js";
import { parseTemporalInstant } from "../src/temporal-instant-parse.js";
import { parseTemporalTimeZoneIdentifier } from "../src/temporal-time-zone-parse.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
const first = parseTemporalInstant("2020-01-31T12:00Z"), zone = parseTemporalTimeZoneIdentifier("+05:30");
if (first === null || zone === null) throw new Error("input");
check(totalZonedRelativeDuration(dateDuration(0, 1, 0), first, zone, "day") === 29, "leap month in days");
check(totalZonedRelativeDuration(dateDuration(0, 1, 0), first, zone, "hour") === 696, "leap month in hours");
check(totalZonedRelativeDuration(dateDuration(0, 0, 0, 14), first, zone, "week") === 2, "whole weeks");
check(totalZonedRelativeDuration(dateDuration(0, 0, 0, -14), first, zone, "week") === -2, "negative weeks");
const half = { years: 0, months: 0, weeks: 0, days: 0, hours: 12, minutes: 0, seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 };
check(totalZonedRelativeDuration(half, first, zone, "day") === 0.5, "fractional day");
check(totalZonedRelativeDuration(dateDuration(0, 0, 0, 1), first, zone, "month") === 1 / 29, "exact calendar ratio");
const zero = dateDuration(0, 0, 0), max = 8640000000000000000000n;
check(totalZonedRelativeDuration(zero, max, zone, "hour") === 0, "zero time total at endpoint");
check(totalZonedRelativeDuration(zero, max, zone, "day") === null, "zero calendar total still checks window");
check(totalZonedRelativeDuration(dateDuration(0, 0, 0, 1), max, zone, "hour") === null, "duration target overflow");
check(totalZonedRelativeDuration(zero, first, zone, "invalid") === null, "invalid unit");
console.log("temporal zoned duration total passed");
