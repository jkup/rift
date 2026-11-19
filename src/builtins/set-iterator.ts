import type { Realm } from "../realm.js";
import { GuestSet } from "../set-object.js";
import { GuestSetIterator, type SetIterationKind } from "../set-iterator.js";
import { languageFailure, normal } from "../runtime.js";
import { wellKnownIterator, wellKnownToStringTag } from "../symbols.js";

export function registerSetIterators(realm: Realm): void {
    const methods: { name: string; kind: SetIterationKind }[] = [
        { name: "values", kind: "value" },
        { name: "entries", kind: "key+value" },
    ];
    for (const method of methods) {
        const value = realm.registerBuiltin(
            realm.setPrototype,
            method.name,
            0,
            (receiver, _args, context, loc) => {
                if (receiver.kind !== "object" || !(receiver.object instanceof GuestSet)) {
                    return languageFailure(
                        context.realm,
                        "TypeError",
                        "receiver is not a Set",
                        loc,
                    );
                }
                const allocation = context.tick(loc);
                if (allocation.type === "throw") {
                    return allocation;
                }
                return normal({
                    kind: "object",
                    object: new GuestSetIterator(
                        receiver.object,
                        method.kind,
                        context.realm,
                        context.realm.setIteratorPrototype,
                    ),
                });
            },
        );
        if (method.kind === "value") {
            realm.setPrototype.bootstrapDefine("keys", {
                value,
                writable: true,
                enumerable: false,
                configurable: true,
            });
            realm.setPrototype.bootstrapDefine(wellKnownIterator, {
                value,
                writable: true,
                enumerable: false,
                configurable: true,
            });
        }
    }
    realm.registerBuiltin(
        realm.setIteratorPrototype,
        "next",
        0,
        (receiver, _args, context, loc) => {
            if (receiver.kind !== "object" || !(receiver.object instanceof GuestSetIterator)) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "receiver is not a Set iterator",
                    loc,
                );
            }
            return receiver.object.next(context, loc);
        },
    );
    realm.setIteratorPrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "Set Iterator" },
        writable: false,
        enumerable: false,
        configurable: true,
    });
}
