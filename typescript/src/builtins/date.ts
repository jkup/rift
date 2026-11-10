import { registerDateGetters } from "./date-getters.js";
import { registerDateTimeSetters } from "./date-time-setters.js";
import { registerDateCalendarSetters } from "./date-calendar-setters.js";
import { registerDateJSON } from "./date-json.js";
import type { Realm } from "../realm.js";
import type { Location } from "../syntax.js";
import { GuestDate, dateObject } from "../date-object.js";
import { currentDateMilliseconds } from "../date-clock.js";
import { dateTimeClip, dateMakeTime, dateMakeDate, dateMakeFullYear } from "../date-time.js";
import { dateMakeDay } from "../date-calendar.js";
import { parseDateString } from "../date-string-parse.js";
import { formatDateISO, formatDateString } from "../date-format.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { ordinaryToPrimitive, toPrimitive } from "../primitive-conversion.js";
import { toNumber, toString, type NumberCompletion } from "../conversion.js";
import { wellKnownToPrimitive } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type Value, type OperationContext, type ValueCompletion } from "../runtime.js";

function componentDate(args: Value[], context: OperationContext, loc: Location): NumberCompletion {
    const fields: number[] = [];
    for (let index = 0; index < 7; index++) {
        if (index >= args.length && index !== 0) { fields.push(index === 2 ? 1 : 0); continue; }
        const primitive = toPrimitive(index < args.length ? args[index] : UNDEFINED, "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const converted = toNumber(primitive.value, loc, context.realm);
        if (converted.type === "throw") return converted;
        fields.push(converted.value);
    }
    const day = dateMakeDay(dateMakeFullYear(fields[0]), fields[1], fields[2]);
    const time = dateMakeTime(fields[3], fields[4], fields[5], fields[6]);
    return { type: "normal", value: dateTimeClip(dateMakeDate(day, time)) };
}

export function registerDate(realm: Realm): void {
    const prototype = realm.datePrototype;
    registerDateGetters(realm);
    registerDateTimeSetters(realm);
    registerDateCalendarSetters(realm);
    registerDateJSON(realm);
    const constructor = realm.createBuiltinConstructor("Date", 7,
        (_receiver, _args, context, _loc): ValueCompletion => normal({ kind: "string", value: formatDateString(currentDateMilliseconds(context.realm), "display") }),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            let time: number;
            if (args.length === 0) time = currentDateMilliseconds(context.realm);
            else if (args.length === 1) {
                const value = args[0];
                if (value.kind === "object" && value.object instanceof GuestDate) time = value.object.dateValue;
                else {
                    const primitive = toPrimitive(value, "default", context, loc);
                    if (primitive.type === "throw") return primitive;
                    if (primitive.value.kind === "string") time = parseDateString(primitive.value.value);
                    else {
                        const number = toNumber(primitive.value, loc, context.realm);
                        if (number.type === "throw") return number;
                        time = number.value;
                    }
                }
            } else {
                const result = componentDate(args, context, loc);
                if (result.type === "throw") return result;
                time = result.value;
            }
            const proto = getPrototypeFromConstructor(newTarget, "Date", context, loc);
            if (proto.type === "throw") return proto;
            const budget = context.tick(loc);
            if (budget.type === "throw") return budget;
            return normal({ kind: "object", object: new GuestDate(dateTimeClip(time), proto.value) });
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: prototype }, writable: false, enumerable: false, configurable: false });
    prototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    realm.defineScriptGlobal("Date", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    realm.registerBuiltin(constructor, "now", 0, (_receiver, _args, context, _loc): ValueCompletion => normal({ kind: "number", value: currentDateMilliseconds(context.realm) }));
    realm.registerBuiltin(constructor, "UTC", 7, (_receiver, args, context, loc): ValueCompletion => {
        const result = componentDate(args, context, loc);
        return result.type === "throw" ? result : normal({ kind: "number", value: result.value });
    });
    realm.registerBuiltin(constructor, "parse", 1, (_receiver, args, context, loc): ValueCompletion => {
        const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "string", context, loc);
        if (primitive.type === "throw") return primitive;
        const text = toString(primitive.value, loc, context.realm);
        return text.type === "throw" ? text : normal({ kind: "number", value: parseDateString(text.value) });
    });
    for (const name of ["valueOf", "getTime"]) realm.registerBuiltin(prototype, name, 0, (receiver, _args, context, loc): ValueCompletion => {
        const date = dateObject(receiver, context, loc);
        return date.type === "throw" ? date : normal({ kind: "number", value: date.value.dateValue });
    });
    for (const name of ["toString", "toDateString", "toTimeString", "toUTCString"]) {
        const method = realm.registerBuiltin(prototype, name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const date = dateObject(receiver, context, loc);
            if (date.type === "throw") return date;
            const style = name === "toString" ? "display" : name === "toDateString" ? "date" : name === "toTimeString" ? "time" : "utc";
            return normal({ kind: "string", value: formatDateString(date.value.dateValue, style) });
        });
        if (name === "toUTCString") prototype.bootstrapDefine("toGMTString", { value: method, writable: true, enumerable: false, configurable: true });
    }
    realm.registerBuiltin(prototype, "toISOString", 0, (receiver, _args, context, loc): ValueCompletion => {
        const date = dateObject(receiver, context, loc);
        if (date.type === "throw") return date;
        const text = formatDateISO(date.value.dateValue);
        return text === null ? languageFailure(context.realm, "RangeError", "invalid Date cannot be formatted as ISO", loc) : normal({ kind: "string", value: text });
    });
    const primitive = realm.createBuiltin("[Symbol.toPrimitive]", 1, (receiver, args, context, loc): ValueCompletion => {
        if (receiver.kind !== "object") return languageFailure(context.realm, "TypeError", "Date primitive conversion requires an object", loc);
        const hint = args.length === 0 ? UNDEFINED : args[0];
        if (hint.kind !== "string" || (hint.value !== "default" && hint.value !== "string" && hint.value !== "number"))
            return languageFailure(context.realm, "TypeError", "invalid primitive conversion hint", loc);
        return ordinaryToPrimitive(receiver, hint.value === "number" ? "number" : "string", context, loc);
    });
    prototype.bootstrapDefine(wellKnownToPrimitive, { value: { kind: "object", object: primitive }, writable: false, enumerable: false, configurable: true });
}
