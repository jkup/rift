import { epochDayToISODate, isoDateToEpochDay, isoDaysInMonth, isISOLeapYear } from "./iso-calendar.js";

export const enum TimeZoneRuleKind { Julian, Ordinal, MonthWeekday }

export class TimeZoneRule {
    readonly kind: TimeZoneRuleKind;
    readonly month: number;
    readonly week: number;
    readonly day: number;
    readonly seconds: number;

    constructor(kind: TimeZoneRuleKind, month: number, week: number, day: number, seconds: number) {
        this.kind = kind; this.month = month; this.week = week;
        this.day = day; this.seconds = seconds;
    }
}

export class TimeZoneRecurrence {
    readonly standard: number;
    readonly daylight: number;
    readonly start: TimeZoneRule | null;
    readonly end: TimeZoneRule | null;

    constructor(standard: number, daylight: number, start: TimeZoneRule | null, end: TimeZoneRule | null) {
        this.standard = standard; this.daylight = daylight;
        this.start = start; this.end = end;
    }
}

function transitionDay(year: number, rule: TimeZoneRule): number {
    const first = isoDateToEpochDay({ year, month: rule.kind === TimeZoneRuleKind.MonthWeekday ? rule.month : 1, day: 1 });
    if (first === null) throw new Error("recurrence calendar invariant");
    if (rule.kind === TimeZoneRuleKind.Julian)
        return first + rule.day - 1 + (isISOLeapYear(year) && rule.day >= 60 ? 1 : 0);
    if (rule.kind === TimeZoneRuleKind.Ordinal) return first + rule.day;
    const weekday = ((first + 4) % 7 + 7) % 7;
    let day = 1 + (rule.day - weekday + 7) % 7 + (rule.week - 1) * 7;
    if (day > isoDaysInMonth(year, rule.month)) day -= 7;
    return first + day - 1;
}

function recurrenceCycle(seconds: number): { year: number; seconds: number; shift: number } {
    // Gregorian recurrence repeats every 400 years, including weekdays. Keep
    // neighboring-year calculations away from Temporal's calendar range guards.
    const day = Math.floor(seconds / 86400);
    const cycleDay = ((day - 10957) % 146097 + 146097) % 146097 + 10957;
    const date = epochDayToISODate(cycleDay);
    if (date === null) throw new Error("recurrence cycle invariant");
    return { year: date.year, seconds: cycleDay * 86400 + (seconds - day * 86400), shift: (day - cycleDay) * 86400 };
}

function transitionSeconds(year: number, rule: TimeZoneRule, offset: number): number {
    return transitionDay(year, rule) * 86400 + rule.seconds - offset;
}

export function recurrenceOffsetSeconds(recurrence: TimeZoneRecurrence, seconds: number): number | null {
    if (!Number.isSafeInteger(seconds) || Math.abs(seconds) > 8640000000000) return null;
    return recurrenceOffsetSecondsForLocalTime(recurrence, seconds);
}

export function recurrenceOffsetSecondsForLocalTime(recurrence: TimeZoneRecurrence, seconds: number): number | null {
    if (!Number.isSafeInteger(seconds) || Math.abs(seconds) > 8640000172800) return null;
    const start = recurrence.start, end = recurrence.end;
    if (start === null || end === null) return recurrence.standard;
    const cycle = recurrenceCycle(seconds);
    let latest = -Infinity, offset = recurrence.standard;
    for (let year = cycle.year - 1; year <= cycle.year + 1; year++) {
        const begin = transitionSeconds(year, start, recurrence.standard);
        const finish = transitionSeconds(year, end, recurrence.daylight);
        if (begin <= cycle.seconds && begin >= latest) { latest = begin; offset = recurrence.daylight; }
        if (finish <= cycle.seconds && finish >= latest) { latest = finish; offset = recurrence.standard; }
    }
    return offset;
}

export function recurrenceTransitionCandidates(recurrence: TimeZoneRecurrence, seconds: number): number[] {
    if (!Number.isSafeInteger(seconds) || Math.abs(seconds) > 8640000000000) return [];
    const start = recurrence.start, end = recurrence.end;
    if (start === null || end === null || recurrence.standard === recurrence.daylight) return [];
    const cycle = recurrenceCycle(seconds), candidates: number[] = [];
    for (let year = cycle.year - 1; year <= cycle.year + 1; year++) {
        candidates.push(transitionSeconds(year, start, recurrence.standard) + cycle.shift);
        candidates.push(transitionSeconds(year, end, recurrence.daylight) + cycle.shift);
    }
    return candidates;
}
