import {
    readTemporalDateField,
    resolveTemporalDateFields,
    type TemporalDateFields,
} from "./temporal-date-fields.js";
import { regulateTemporalTimeFields } from "./temporal-time-fields.js";
import { temporalInteger } from "./temporal-integer.js";
import { combineISODateTime, isoDateTimeWithinLimits } from "./iso-date-time.js";
import type { ISODateTime } from "./iso-calendar.js";
import type { TimeFields } from "./temporal-time.js";
import type { Location } from "../syntax.js";
import {
    languageFailure,
    type GuestObject,
    type OperationContext,
    type ThrowCompletion,
} from "../runtime.js";

export interface TemporalDateTimeFields {
    date: TemporalDateFields;
    time: TimeFields;
}

export function readTemporalDateTimeFields(
    object: GuestObject,
    context: OperationContext,
    loc: Location,
    defaults: TimeFields | null = null,
): { type: "normal"; value: TemporalDateTimeFields; present: boolean } | ThrowCompletion {
    const date: TemporalDateFields = { year: null, month: null, monthCode: null, day: null };
    const time: number[] = [];
    let present = false;
    const names: (keyof TemporalDateFields | keyof TimeFields)[] = [
        "day",
        "hour",
        "microsecond",
        "millisecond",
        "minute",
        "month",
        "monthCode",
        "nanosecond",
        "second",
        "year",
    ];
    for (const name of names) {
        if (name === "day" || name === "month" || name === "monthCode" || name === "year") {
            const result = readTemporalDateField(object, name, date, context, loc);
            if (result.type === "throw") {
                return result;
            }
        } else {
            const read = object.internalGet(name, { kind: "object", object }, context, loc);
            if (read.type === "throw") {
                return read;
            }
            if (read.value.kind === "undefined") {
                time.push(defaults === null ? 0 : defaults[name]);
                continue;
            }
            const converted = temporalInteger(read.value, context, loc);
            if (converted.type === "throw") {
                return converted;
            }
            time.push(converted.value);
            present = true;
        }
    }
    return {
        type: "normal",
        present:
            present ||
            date.year !== null ||
            date.month !== null ||
            date.monthCode !== null ||
            date.day !== null,
        value: {
            date,
            time: {
                hour: time[0],
                microsecond: time[1],
                millisecond: time[2],
                minute: time[3],
                nanosecond: time[4],
                second: time[5],
            },
        },
    };
}

export function resolveTemporalDateTimeFields(
    fields: TemporalDateTimeFields,
    reject: boolean,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: ISODateTime } | ThrowCompletion {
    const date = resolveTemporalDateFields(fields.date, reject, context, loc);
    if (date.type === "throw") {
        return date;
    }
    const time = regulateTemporalTimeFields(fields.time, reject, context, loc);
    if (time.type === "throw") {
        return time;
    }
    const value = combineISODateTime(date.value, time.value);
    return isoDateTimeWithinLimits(value)
        ? { type: "normal", value }
        : languageFailure(context.realm, "RangeError", "date-time is outside its range", loc);
}
