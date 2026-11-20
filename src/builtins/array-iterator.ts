import type { Realm } from "../realm.js";
import { registerIterator } from "./iterator.js";
import { GuestArrayIterator, type ArrayIterationKind } from "../array-iterator.js";
import { toObject } from "../object-conversion.js";
import { languageFailure, normal, UNDEFINED, type Value } from "../runtime.js";
import { wellKnownIterator, wellKnownToStringTag } from "../symbols.js";

export function registerArrayIterators(realm: Realm): Value {
    let values: Value = UNDEFINED;
    registerIterator(realm);
    realm.registerBuiltin(
        realm.arrayIteratorPrototype,
        "next",
        0,
        (receiver, _args, context, loc) => {
            if (receiver.kind !== "object" || !(receiver.object instanceof GuestArrayIterator)) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "receiver is not an Array iterator",
                    loc,
                );
            }
            return receiver.object.next(context, loc);
        },
    );
    realm.arrayIteratorPrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "Array Iterator" },
        writable: false,
        enumerable: false,
        configurable: true,
    });
    const methods: { name: string; kind: ArrayIterationKind }[] = [
        { name: "keys", kind: "key" },
        { name: "values", kind: "value" },
        { name: "entries", kind: "key+value" },
    ];
    for (const method of methods) {
        const value = realm.registerBuiltin(
            realm.arrayPrototype,
            method.name,
            0,
            (receiver, _args, context, loc) => {
                const array = toObject(receiver, context, loc);
                if (array.type === "throw") {
                    return array;
                }
                const allocation = context.tick(loc);
                if (allocation.type === "throw") {
                    return allocation;
                }
                return normal({
                    kind: "object",
                    object: new GuestArrayIterator(
                        array.value,
                        method.kind,
                        context.realm.arrayIteratorPrototype,
                    ),
                });
            },
        );
        if (method.kind === "value") {
            values = value;
            realm.arrayPrototype.bootstrapDefine(wellKnownIterator, {
                value,
                writable: true,
                enumerable: false,
                configurable: true,
            });
        }
    }
    return values;
}
