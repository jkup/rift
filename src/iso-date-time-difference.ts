import { isoDateToEpochDay, epochDayToISODate, type ISODateTime } from "./iso-calendar.js";
import { isoDateTimeWithinLimits } from "./iso-date-time.js";
import { differenceISODate, type DateDifferenceUnit } from "./iso-calendar-difference.js";
import { NANOSECONDS_PER_DAY, timeToNanoseconds } from "./temporal-time.js";
import type { DurationFields } from "./temporal-duration.js";
import type { DurationUnit } from "./temporal-duration-balance.js";

export interface ISODateTimeDifference { date: DurationFields; time: bigint }

export function differenceISODateTime(start: ISODateTime, end: ISODateTime, largest: DurationUnit): ISODateTimeDifference | null {
    if (!isoDateTimeWithinLimits(start) || !isoDateTimeWithinLimits(end)) return null;
    const firstDay = isoDateToEpochDay(start.date), lastDay = isoDateToEpochDay(end.date);
    const firstTime = timeToNanoseconds(start), lastTime = timeToNanoseconds(end);
    if (firstDay === null || lastDay === null || firstTime === null || lastTime === null) throw new Error("date-time difference input invariant");
    let time = lastTime - firstTime, adjusted = end.date;
    const timeSign = time < 0n ? -1 : time > 0n ? 1 : 0;
    if (timeSign !== 0 && timeSign === Math.sign(firstDay - lastDay)) {
        const date = epochDayToISODate(lastDay + timeSign);
        if (date === null) throw new Error("adjusted date difference range invariant");
        adjusted = date;
        time -= BigInt(timeSign) * NANOSECONDS_PER_DAY;
    }
    const calendarUnit = largest === "years" || largest === "months" || largest === "weeks" || largest === "days";
    const dateUnit: DateDifferenceUnit = largest === "years" ? "year" : largest === "months" ? "month" : largest === "weeks" ? "week" : "day";
    const date = differenceISODate(start.date, adjusted, dateUnit);
    if (date === null) throw new Error("date-time calendar difference invariant");
    if (!calendarUnit) {
        time += BigInt(date.days) * NANOSECONDS_PER_DAY;
        return { date: { years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0,
            milliseconds: 0, microseconds: 0, nanoseconds: 0 }, time };
    }
    return { date, time };
}
