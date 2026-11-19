import type { Realm } from "../realm.js";
import { GuestMap } from "../map-object.js";
import { GuestMapIterator, type MapIterationKind } from "../map-iterator.js";
import { languageFailure, normal } from "../runtime.js";
import { wellKnownIterator, wellKnownToStringTag } from "../symbols.js";

export function registerMapIterators(realm: Realm): void {
    const methods: { name: string; kind: MapIterationKind }[] = [
        { name: "keys", kind: "key" },
        { name: "values", kind: "value" },
        { name: "entries", kind: "key+value" },
    ];
    for (const method of methods) {
        const value = realm.registerBuiltin(realm.mapPrototype, method.name, 0, (receiver, _args, context, loc) => {
            if (receiver.kind !== "object" || !(receiver.object instanceof GuestMap))
                return languageFailure(context.realm, "TypeError", "receiver is not a Map", loc);
            const allocation = context.tick(loc);
            if (allocation.type === "throw") return allocation;
            return normal({ kind: "object", object: new GuestMapIterator(receiver.object, method.kind, context.realm, context.realm.mapIteratorPrototype) });
        });
        if (method.kind === "key+value") realm.mapPrototype.bootstrapDefine(wellKnownIterator, {
            value, writable: true, enumerable: false, configurable: true,
        });
    }
    realm.registerBuiltin(realm.mapIteratorPrototype, "next", 0, (receiver, _args, context, loc) => {
        if (receiver.kind !== "object" || !(receiver.object instanceof GuestMapIterator))
            return languageFailure(context.realm, "TypeError", "receiver is not a Map iterator", loc);
        return receiver.object.next(context, loc);
    });
    realm.mapIteratorPrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "Map Iterator" }, writable: false, enumerable: false, configurable: true,
    });
}
