import { isISOLeapYear, isoDayOfWeek, isoDaysInMonth, type ISODate } from "../iso-calendar.js";
import { isoDayOfYear, isoWeekOfYear } from "../iso-calendar-fields.js";
import { UNDEFINED, type Value } from "../runtime.js";

export const temporalCalendarFields = ["calendarId", "era", "eraYear", "year", "month", "monthCode", "day", "dayOfWeek", "dayOfYear", "weekOfYear", "yearOfWeek", "daysInWeek", "daysInMonth", "daysInYear", "monthsInYear", "inLeapYear"];

export function temporalCalendarField(value: ISODate, name: string): Value {
    switch (name) {
        case "calendarId": return { kind: "string", value: "iso8601" };
        case "era": case "eraYear": return UNDEFINED;
        case "year": return { kind: "number", value: value.year };
        case "month": return { kind: "number", value: value.month };
        case "day": return { kind: "number", value: value.day };
        case "monthCode": return { kind: "string", value: "M" + String(value.month).padStart(2, "0") };
        case "daysInWeek": return { kind: "number", value: 7 };
        case "monthsInYear": return { kind: "number", value: 12 };
        case "daysInMonth": return { kind: "number", value: isoDaysInMonth(value.year, value.month) };
        case "daysInYear": return { kind: "number", value: isISOLeapYear(value.year) ? 366 : 365 };
        case "inLeapYear": return { kind: "boolean", value: isISOLeapYear(value.year) };
        case "dayOfWeek": case "dayOfYear": {
            const day = name === "dayOfWeek" ? isoDayOfWeek(value) : isoDayOfYear(value);
            if (day === null) throw new Error("calendar field invariant");
            return { kind: "number", value: day };
        }
        case "weekOfYear": case "yearOfWeek": {
            const week = isoWeekOfYear(value);
            if (week === null) throw new Error("calendar week invariant");
            return { kind: "number", value: name === "weekOfYear" ? week.week : week.year };
        }
        default: throw new Error("calendar field name invariant");
    }
}
