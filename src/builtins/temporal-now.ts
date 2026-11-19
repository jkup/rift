import { timeZoneLocalDateTime } from "../temporal-time-zone-operations.js";
import type { Realm } from "../realm.js";
import { currentDateMilliseconds } from "../date-clock.js";
import { createTemporalInstant } from "../temporal-instant-object.js";
import { createTemporalZonedDateTime } from "../temporal-zoned-date-time-object.js";
import { toTemporalTimeZone } from "../temporal-time-zone.js";
import { createTemporalPlainDateTime } from "../temporal-plain-date-time-object.js";
import { createTemporalPlainDate } from "../temporal-plain-date-object.js";
import { createTemporalPlainTime } from "../temporal-plain-time-object.js";
import { wellKnownToStringTag } from "../symbols.js";
import { normal, UNDEFINED, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalNow(realm: Realm, namespace: GuestObject): void {
    const now = realm.createObject();
    now.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal.Now" }, writable: false, enumerable: false, configurable: true });
    realm.registerBuiltin(now, "timeZoneId", 0, (_receiver, _args, _context, _loc): ValueCompletion => normal({ kind: "string", value: "UTC" }));
    realm.registerBuiltin(now, "instant", 0, (_receiver, _args, context, loc): ValueCompletion => {
        const nanoseconds = BigInt(currentDateMilliseconds(context.realm)) * 1000000n;
        return createTemporalInstant(nanoseconds, context.realm.temporalInstantPrototype, context, loc);
    });
    for (const name of ["plainDateTimeISO", "plainDateISO", "plainTimeISO"]) {
        realm.registerBuiltin(now, name, 0, (_receiver, args, context, loc): ValueCompletion => {
            const supplied = args.length === 0 ? UNDEFINED : args[0];
            const zone = toTemporalTimeZone(supplied.kind === "undefined" ? { kind: "string", value: "UTC" } : supplied, context, loc);
            if (zone.type === "throw") return zone;
            const epoch = BigInt(currentDateMilliseconds(context.realm)) * 1000000n;
            const value = timeZoneLocalDateTime(zone.value, epoch);
            if (value === null) throw new Error("Now timezone projection invariant");
            if (name === "plainDateISO") return createTemporalPlainDate(value.date, context.realm.temporalPlainDatePrototype, context, loc);
            if (name === "plainTimeISO") return createTemporalPlainTime(value, context.realm.temporalPlainTimePrototype, context, loc);
            return createTemporalPlainDateTime(value, context.realm.temporalPlainDateTimePrototype, context, loc);
        });
    }
    realm.registerBuiltin(now, "zonedDateTimeISO", 0, (_receiver, args, context, loc): ValueCompletion => {
        const supplied = args.length === 0 ? UNDEFINED : args[0];
        const zone = toTemporalTimeZone(supplied.kind === "undefined" ? { kind: "string", value: "UTC" } : supplied, context, loc);
        if (zone.type === "throw") return zone;
        const epoch = BigInt(currentDateMilliseconds(context.realm)) * 1000000n;
        return createTemporalZonedDateTime(epoch, zone.value, context.realm.temporalZonedDateTimePrototype, context, loc);
    });
    namespace.bootstrapDefine("Now", { value: { kind: "object", object: now }, writable: true, enumerable: false, configurable: true });
}
