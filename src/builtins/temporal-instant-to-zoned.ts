import type { Realm } from "../realm.js";
import { temporalInstantValue } from "../temporal-instant-object.js";
import { createTemporalZonedDateTime } from "../temporal-zoned-date-time-object.js";
import { toTemporalTimeZone } from "../temporal-time-zone.js";
import { UNDEFINED, type ValueCompletion } from "../runtime.js";

export function registerTemporalInstantToZoned(realm: Realm): void {
    realm.registerBuiltin(
        realm.temporalInstantPrototype,
        "toZonedDateTimeISO",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const epoch = temporalInstantValue(receiver, context, loc);
            if (epoch.type === "throw") {
                return epoch;
            }
            const zone = toTemporalTimeZone(args.length === 0 ? UNDEFINED : args[0], context, loc);
            return zone.type === "throw"
                ? zone
                : createTemporalZonedDateTime(
                      epoch.value,
                      zone.value,
                      context.realm.temporalZonedDateTimePrototype,
                      context,
                      loc,
                  );
        },
    );
}
