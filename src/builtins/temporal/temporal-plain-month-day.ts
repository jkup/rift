import { registerTemporalPlainMonthDayFields } from "./temporal-plain-month-day-fields.js";
import { registerTemporalPlainMonthDayConversion } from "./temporal-plain-month-day-conversion.js";
import { registerTemporalPlainMonthDayFormat } from "./temporal-plain-month-day-format.js";
import type { Realm } from "../../realm.js";
import { temporalInteger } from "../../temporal/temporal-integer.js";
import {
    createTemporalPlainMonthDay,
    temporalPlainMonthDayValue,
} from "../../temporal/temporal-plain-month-day-object.js";
import { temporalCalendarField } from "./temporal-calendar-fields.js";
import { isoDateWithinLimits } from "../../temporal/iso-calendar-fields.js";
import { getPrototypeFromConstructor } from "../../constructor-prototype.js";
import { wellKnownToStringTag } from "../../symbols.js";
import {
    languageFailure,
    normal,
    UNDEFINED,
    type GuestObject,
    type ValueCompletion,
} from "../../runtime.js";

export function registerTemporalPlainMonthDay(realm: Realm, namespace: GuestObject): void {
    const prototype = realm.temporalPlainMonthDayPrototype;
    const constructor = realm.createBuiltinConstructor(
        "PlainMonthDay",
        2,
        (_receiver, _args, context, loc): ValueCompletion =>
            languageFailure(context.realm, "TypeError", "Temporal.PlainMonthDay requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const month = temporalInteger(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (month.type === "throw") {
                return month;
            }
            const day = temporalInteger(args.length < 2 ? UNDEFINED : args[1], context, loc);
            if (day.type === "throw") {
                return day;
            }
            const calendar = args.length < 3 ? UNDEFINED : args[2];
            if (calendar.kind !== "undefined") {
                if (calendar.kind !== "string") {
                    return languageFailure(
                        context.realm,
                        "TypeError",
                        "calendar must be a string",
                        loc,
                    );
                }
                if (calendar.value.length !== 7 || calendar.value.toLowerCase() !== "iso8601") {
                    return languageFailure(
                        context.realm,
                        "RangeError",
                        "unsupported calendar",
                        loc,
                    );
                }
            }
            const reference = args.length < 4 ? UNDEFINED : args[3];
            const year = temporalInteger(
                reference.kind === "undefined" ? { kind: "number", value: 1972 } : reference,
                context,
                loc,
            );
            if (year.type === "throw") {
                return year;
            }
            const date = { year: year.value, month: month.value, day: day.value };
            if (!isoDateWithinLimits(date)) {
                return languageFailure(
                    context.realm,
                    "RangeError",
                    "month-day is invalid or outside its range",
                    loc,
                );
            }
            const proto = getPrototypeFromConstructor(
                newTarget,
                "Temporal.PlainMonthDay",
                context,
                loc,
            );
            return proto.type === "throw"
                ? proto
                : createTemporalPlainMonthDay(date, proto.value, context, loc);
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
        value: { kind: "string", value: "Temporal.PlainMonthDay" },
        writable: false,
        enumerable: false,
        configurable: true,
    });
    for (const name of ["calendarId", "monthCode", "day"]) {
        const getter = realm.createBuiltin(
            "get " + name,
            0,
            (receiver, _args, context, loc): ValueCompletion => {
                const date = temporalPlainMonthDayValue(receiver, context, loc);
                return date.type === "throw"
                    ? date
                    : normal(temporalCalendarField(date.value, name));
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
                "Temporal.PlainMonthDay cannot be converted to a primitive number",
                loc,
            ),
    );
    registerTemporalPlainMonthDayFormat(realm);
    registerTemporalPlainMonthDayFields(realm);
    registerTemporalPlainMonthDayConversion(realm, constructor);
    namespace.bootstrapDefine("PlainMonthDay", {
        value: { kind: "object", object: constructor },
        writable: true,
        enumerable: false,
        configurable: true,
    });
}
