import type { Realm } from "../realm.js";
import { currentDateMilliseconds } from "../date-clock.js";
import { createTemporalInstant } from "../temporal-instant-object.js";
import { wellKnownToStringTag } from "../symbols.js";
import { normal, type GuestObject, type ValueCompletion } from "../runtime.js";

export function registerTemporalNow(realm: Realm, namespace: GuestObject): void {
    const now = realm.createObject();
    now.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal.Now" }, writable: false, enumerable: false, configurable: true });
    realm.registerBuiltin(now, "timeZoneId", 0, (_receiver, _args, _context, _loc): ValueCompletion => normal({ kind: "string", value: "UTC" }));
    realm.registerBuiltin(now, "instant", 0, (_receiver, _args, context, loc): ValueCompletion => {
        const nanoseconds = BigInt(currentDateMilliseconds(context.realm)) * 1000000n;
        return createTemporalInstant(nanoseconds, context.realm.temporalInstantPrototype, context, loc);
    });
    namespace.bootstrapDefine("Now", { value: { kind: "object", object: now }, writable: true, enumerable: false, configurable: true });
}
