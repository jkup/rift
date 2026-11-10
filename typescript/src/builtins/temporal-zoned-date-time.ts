import type { Realm } from "../realm.js";
import { registerTemporalZonedRound } from "./temporal-zoned-round.js";
import { registerTemporalZonedArithmetic } from "./temporal-zoned-arithmetic.js";
import { registerTemporalZonedConversion } from "./temporal-zoned-conversion.js";
import { registerTemporalZonedDateTimeFields } from "./temporal-zoned-date-time-fields.js";
import { registerTemporalZonedDateTimeParts } from "./temporal-zoned-date-time-parts.js";
import { registerTemporalZonedDateTimeString } from "./temporal-zoned-date-time-string.js";
import { createTemporalZonedDateTime, temporalZonedDateTimeObject } from "../temporal-zoned-date-time-object.js";
import { parseTemporalTimeZoneIdentifier } from "../temporal-time-zone-parse.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { toBigInt } from "../numeric.js";
import { isValidEpochNanoseconds } from "../iso-calendar.js";
import { wellKnownToStringTag } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalZonedDateTime(realm: Realm, namespace: GuestObject): void {
    const prototype = realm.temporalZonedDateTimePrototype;
    const constructor = realm.createBuiltinConstructor("ZonedDateTime", 2,
        (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Temporal.ZonedDateTime requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const epoch = toBigInt(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (epoch.type === "throw") return epoch;
            if (!isValidEpochNanoseconds(epoch.value)) return languageFailure(context.realm, "RangeError", "instant outside the supported range", loc);
            const suppliedZone = args.length < 2 ? UNDEFINED : args[1];
            if (suppliedZone.kind !== "string") return languageFailure(context.realm, "TypeError", "timeZone must be a string", loc);
            for (let index = 0; index < suppliedZone.value.length; index++) {
                const work = context.tick(loc);
                if (work.type === "throw") return work;
            }
            const zone = parseTemporalTimeZoneIdentifier(suppliedZone.value);
            if (zone === null) return languageFailure(context.realm, "RangeError", "invalid or unsupported time zone identifier", loc);
            const calendar = args.length < 3 ? UNDEFINED : args[2];
            if (calendar.kind !== "undefined") {
                if (calendar.kind !== "string") return languageFailure(context.realm, "TypeError", "calendar must be a string", loc);
                if (calendar.value.length !== 7 || calendar.value.toLowerCase() !== "iso8601") return languageFailure(context.realm, "RangeError", "unsupported calendar", loc);
            }
            const proto = getPrototypeFromConstructor(newTarget, "Temporal.ZonedDateTime", context, loc);
            return proto.type === "throw" ? proto : createTemporalZonedDateTime(epoch.value, zone, proto.value, context, loc);
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: prototype }, writable: false, enumerable: false, configurable: false });
    prototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    prototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal.ZonedDateTime" }, writable: false, enumerable: false, configurable: true });
    for (const name of ["epochNanoseconds", "epochMilliseconds", "timeZoneId", "calendarId"]) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const object = temporalZonedDateTimeObject(receiver, context, loc);
            if (object.type === "throw") return object;
            const value = object.value;
            if (name === "calendarId") return normal({ kind: "string", value: "iso8601" });
            if (name === "timeZoneId") return normal({ kind: "string", value: value.timeZone.identifier });
            if (name === "epochNanoseconds") return normal({ kind: "bigint", value: value.epochNanoseconds });
            const epoch = value.epochNanoseconds;
            return normal({ kind: "number", value: Number(epoch / 1000000n - (epoch < 0n && epoch % 1000000n !== 0n ? 1n : 0n)) });
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    realm.registerBuiltin(prototype, "valueOf", 0, (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Temporal.ZonedDateTime cannot be converted to a primitive number", loc));
    registerTemporalZonedDateTimeFields(realm);
    registerTemporalZonedDateTimeParts(realm);
    registerTemporalZonedDateTimeString(realm);
    registerTemporalZonedConversion(realm, constructor);
    registerTemporalZonedArithmetic(realm);
    registerTemporalZonedRound(realm);
    namespace.bootstrapDefine("ZonedDateTime", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
