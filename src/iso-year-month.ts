import { isValidISODate, type ISODate } from "./iso-calendar.js";

export function isoYearMonthWithinLimits(date: ISODate): boolean {
    return isValidISODate(date) && date.year >= -271821 && date.year <= 275760 &&
        (date.year !== -271821 || date.month >= 4) && (date.year !== 275760 || date.month <= 9);
}
