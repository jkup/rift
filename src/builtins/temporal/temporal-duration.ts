import { registerTemporalDurationRound } from "./temporal-duration-round.js";
import { registerTemporalDurationTotal } from "./temporal-duration-total.js";
import { registerTemporalDurationCompare } from "./temporal-duration-compare.js";
import { temporalDurationInteger } from "../../temporal/temporal-duration-fields.js";
import { registerTemporalDurationConversion } from "./temporal-duration-conversion.js";
import { registerTemporalDurationString } from "./temporal-duration-string.js";
import { registerTemporalDurationArithmetic } from "./temporal-duration-arithmetic.js";
import type { Realm } from "../../realm.js";
import { formatTemporalDuration } from "../../temporal/temporal-duration-format.js";
import {
    createTemporalDuration,
    temporalDurationValue,
} from "../../temporal/temporal-duration-object.js";
import {
    durationSign,
    isValidDuration,
    type DurationFields,
} from "../../temporal/temporal-duration.js";
import { getPrototypeFromConstructor } from "../../constructor-prototype.js";
import { wellKnownToStringTag } from "../../symbols.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type GuestObject,
    type ValueCompletion,
} from "../../runtime.js";

function signedField(value: number, sign: number): number {
    return value === 0 ? 0 : value * sign;
}

export function registerTemporalDuration(realm: Realm, namespace: GuestObject): void {
    const prototype = realm.temporalDurationPrototype;
    const constructor = realm.createBuiltinConstructor(
        "Duration",
        0,
        (_receiver, _args, context, loc): ValueCompletion =>
            languageFailure(context.realm, "TypeError", "Temporal.Duration requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const fields: number[] = [];
            for (let i = 0; i < 10; i++) {
                const value = i < args.length ? args[i] : UNDEFINED;
                if (value.kind === "undefined") {
                    fields.push(0);
                    continue;
                }
                const converted = temporalDurationInteger(value, context, loc);
                if (converted.type === "throw") {
                    return converted;
                }
                fields.push(converted.value);
            }
            const duration: DurationFields = {
                years: fields[0],
                months: fields[1],
                weeks: fields[2],
                days: fields[3],
                hours: fields[4],
                minutes: fields[5],
                seconds: fields[6],
                milliseconds: fields[7],
                microseconds: fields[8],
                nanoseconds: fields[9],
            };
            if (!isValidDuration(duration)) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "duration has mixed signs or exceeds its range",
                    loc,
                );
            }
            const proto = getPrototypeFromConstructor(newTarget, "Temporal.Duration", context, loc);
            return proto.type === "throw"
                ? proto
                : createTemporalDuration(duration, proto.value, context, loc);
        },
    );
    constructor.bootstrapDefine("prototype", {
        value: { kind: "object", object: prototype },
        writable: false,
        enumerable: false,
        configurable: false,
    });
    prototype.bootstrapDefine("constructor", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    prototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "Temporal.Duration" },
        writable: false,
        enumerable: false,
        configurable: true,
    });
    const names: (keyof DurationFields)[] = [
        "years",
        "months",
        "weeks",
        "days",
        "hours",
        "minutes",
        "seconds",
        "milliseconds",
        "microseconds",
        "nanoseconds",
    ];
    for (const name of names) {
        const getter = realm.createBuiltin(
            "get " + name,
            0,
            (receiver, _args, context, loc): ValueCompletion => {
                const duration = temporalDurationValue(receiver, context, loc);
                return duration.type === "throw"
                    ? duration
                    : normal({ kind: "number", value: duration.value[name] });
            },
        );
        prototype.bootstrapDefine(name, {
            get: { kind: "object", object: getter },
            set: UNDEFINED,
            enumerable: false,
            configurable: true,
        });
    }
    for (const name of ["sign", "blank"]) {
        const getter = realm.createBuiltin(
            "get " + name,
            0,
            (receiver, _args, context, loc): ValueCompletion => {
                const duration = temporalDurationValue(receiver, context, loc);
                if (duration.type === "throw") {
                    return duration;
                }
                const sign = durationSign(duration.value);
                return name === "sign"
                    ? normal({ kind: "number", value: sign })
                    : normal({ kind: "boolean", value: sign === 0 });
            },
        );
        prototype.bootstrapDefine(name, {
            get: { kind: "object", object: getter },
            set: UNDEFINED,
            enumerable: false,
            configurable: true,
        });
    }
    realm.registerBuiltin(
        prototype,
        "valueOf",
        0,
        (_receiver, _args, context, loc): ValueCompletion =>
            languageFailure(
                context.realm,
                "TypeError",
                "Temporal.Duration cannot be converted to a primitive number",
                loc,
            ),
    );
    for (const name of ["negated", "abs"]) {
        realm.registerBuiltin(
            prototype,
            name,
            0,
            (receiver, _args, context, loc): ValueCompletion => {
                const duration = temporalDurationValue(receiver, context, loc);
                if (duration.type === "throw") {
                    return duration;
                }
                const value = duration.value,
                    sign = name === "negated" || durationSign(value) < 0 ? -1 : 1;
                return createTemporalDuration(
                    {
                        years: signedField(value.years, sign),
                        months: signedField(value.months, sign),
                        weeks: signedField(value.weeks, sign),
                        days: signedField(value.days, sign),
                        hours: signedField(value.hours, sign),
                        minutes: signedField(value.minutes, sign),
                        seconds: signedField(value.seconds, sign),
                        milliseconds: signedField(value.milliseconds, sign),
                        microseconds: signedField(value.microseconds, sign),
                        nanoseconds: signedField(value.nanoseconds, sign),
                    },
                    context.realm.temporalDurationPrototype,
                    context,
                    loc,
                );
            },
        );
    }
    for (const name of ["toJSON", "toLocaleString"]) {
        realm.registerBuiltin(
            prototype,
            name,
            0,
            (receiver, _args, context, loc): ValueCompletion => {
                const duration = temporalDurationValue(receiver, context, loc);
                if (duration.type === "throw") {
                    return duration;
                }
                const formatted = formatTemporalDuration(duration.value);
                if (formatted === null) {
                    throw new Error("duration formatting invariant");
                }
                return normal({ kind: "string", value: formatted });
            },
        );
    }
    registerTemporalDurationConversion(realm, constructor);
    registerTemporalDurationCompare(realm, constructor);
    registerTemporalDurationTotal(realm);
    registerTemporalDurationRound(realm);
    registerTemporalDurationString(realm);
    registerTemporalDurationArithmetic(realm);
    namespace.bootstrapDefine("Duration", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
}
