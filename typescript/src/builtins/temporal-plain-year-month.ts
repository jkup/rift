import type { Realm } from "../realm.js";
import { temporalInteger } from "../temporal-integer.js";
import { createTemporalPlainYearMonth, temporalPlainYearMonthValue } from "../temporal-plain-year-month-object.js";
import { temporalCalendarField } from "./temporal-calendar-fields.js";
import { isoYearMonthWithinLimits } from "../iso-year-month.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { wellKnownToStringTag } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalPlainYearMonth(realm: Realm, namespace: GuestObject): void {
    const prototype = realm.temporalPlainYearMonthPrototype;
    const constructor = realm.createBuiltinConstructor("PlainYearMonth", 2,
        (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Temporal.PlainYearMonth requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const year = temporalInteger(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (year.type === "throw") return year;
            const month = temporalInteger(args.length < 2 ? UNDEFINED : args[1], context, loc);
            if (month.type === "throw") return month;
            const calendar = args.length < 3 ? UNDEFINED : args[2];
            if (calendar.kind !== "undefined") {
                if (calendar.kind !== "string") return languageFailure(context.realm, "TypeError", "calendar must be a string", loc);
                if (calendar.value.length !== 7 || calendar.value.toLowerCase() !== "iso8601")
                    return languageFailure(context.realm, "RangeError", "unsupported calendar", loc);
            }
            const reference = args.length < 4 ? UNDEFINED : args[3];
            const day = temporalInteger(reference.kind === "undefined" ? { kind: "number", value: 1 } : reference, context, loc);
            if (day.type === "throw") return day;
            const date = { year: year.value, month: month.value, day: day.value };
            if (!isoYearMonthWithinLimits(date)) return languageFailure(context.realm, "RangeError", "year-month is invalid or outside its range", loc);
            const proto = getPrototypeFromConstructor(newTarget, "Temporal.PlainYearMonth", context, loc);
            return proto.type === "throw" ? proto : createTemporalPlainYearMonth(date, proto.value, context, loc);
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: prototype }, writable: false, enumerable: false, configurable: false });
    prototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    prototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal.PlainYearMonth" }, writable: false, enumerable: false, configurable: true });
    for (const name of ["calendarId", "era", "eraYear", "year", "month", "monthCode", "daysInYear", "daysInMonth", "monthsInYear", "inLeapYear"]) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const date = temporalPlainYearMonthValue(receiver, context, loc);
            return date.type === "throw" ? date : normal(temporalCalendarField(date.value, name));
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    realm.registerBuiltin(prototype, "valueOf", 0, (_receiver, _args, context, loc): ValueCompletion =>
        languageFailure(context.realm, "TypeError", "Temporal.PlainYearMonth cannot be converted to a primitive number", loc));
    namespace.bootstrapDefine("PlainYearMonth", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
