import type { Location } from "./syntax.js";
import { isValidDuration, type DurationFields } from "./temporal-duration.js";
import { GuestTemporalDuration } from "./temporal-duration-object.js";
import { parseTemporalDuration } from "./temporal-duration-parse.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toNumber, type NumberCompletion } from "./conversion.js";
import {
    languageFailure,
    type GuestObject,
    type Value,
    type OperationContext,
    type ThrowCompletion,
} from "./runtime.js";

export function temporalDurationInteger(
    value: Value,
    context: OperationContext,
    loc: Location,
): NumberCompletion {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    const converted = toNumber(primitive.value, loc, context.realm);
    if (converted.type === "throw") {
        return converted;
    }
    if (!Number.isInteger(converted.value)) {
        return languageFailure(
            context.realm,
            "RangeError",
            "duration fields must be finite integers",
            loc,
        );
    }
    return { type: "normal", value: converted.value === 0 ? 0 : converted.value };
}

export function readTemporalDurationFields(
    object: GuestObject,
    defaults: DurationFields,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: DurationFields } | ThrowCompletion {
    const names: (keyof DurationFields)[] = [
        "days",
        "hours",
        "microseconds",
        "milliseconds",
        "minutes",
        "months",
        "nanoseconds",
        "seconds",
        "weeks",
        "years",
    ];
    const fields: number[] = [];
    let present = false;
    for (const name of names) {
        const read = object.internalGet(name, { kind: "object", object }, context, loc);
        if (read.type === "throw") {
            return read;
        }
        if (read.value.kind === "undefined") {
            fields.push(defaults[name]);
        } else {
            const converted = temporalDurationInteger(read.value, context, loc);
            if (converted.type === "throw") {
                return converted;
            }
            fields.push(converted.value);
            present = true;
        }
    }
    if (!present) {
        return languageFailure(
            context.realm,
            "TypeError",
            "at least one duration field is required",
            loc,
        );
    }
    const value: DurationFields = {
        years: fields[9],
        months: fields[5],
        weeks: fields[8],
        days: fields[0],
        hours: fields[1],
        minutes: fields[4],
        seconds: fields[7],
        milliseconds: fields[3],
        microseconds: fields[2],
        nanoseconds: fields[6],
    };
    return isValidDuration(value)
        ? { type: "normal", value }
        : languageFailure(
              context.realm,
              "RangeError",
              "duration has mixed signs or exceeds its range",
              loc,
          );
}

export function toTemporalDurationFields(
    value: Value,
    context: OperationContext,
    loc: Location,
): { type: "normal"; value: DurationFields } | ThrowCompletion {
    if (value.kind === "object") {
        if (value.object instanceof GuestTemporalDuration) {
            return { type: "normal", value: value.object.duration };
        }
        return readTemporalDurationFields(
            value.object,
            {
                years: 0,
                months: 0,
                weeks: 0,
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                milliseconds: 0,
                microseconds: 0,
                nanoseconds: 0,
            },
            context,
            loc,
        );
    }
    if (value.kind !== "string") {
        return languageFailure(
            context.realm,
            "TypeError",
            "Duration requires a string or duration object",
            loc,
        );
    }
    for (let i = 0; i < value.value.length; i++) {
        const work = context.tick(loc);
        if (work.type === "throw") {
            return work;
        }
    }
    const parsed = parseTemporalDuration(value.value);
    return parsed === null
        ? languageFailure(context.realm, "RangeError", "invalid Duration string", loc)
        : { type: "normal", value: parsed };
}
