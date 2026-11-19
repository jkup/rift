import type { Realm } from "../realm.js";
import { GuestStringIterator } from "../string-iterator.js";
import { languageFailure, normal } from "../runtime.js";
import { wellKnownIterator, wellKnownToStringTag } from "../symbols.js";
import { stringReceiver } from "./string.js";

export function registerStringIterator(realm: Realm): void {
    const factory = realm.createBuiltin("[Symbol.iterator]", 0, (receiver, _args, context, loc) => {
        const text = stringReceiver(receiver, context, loc);
        if (text.type === "throw") {
            return text;
        }
        const allocation = context.tick(loc);
        if (allocation.type === "throw") {
            return allocation;
        }
        return normal({
            kind: "object",
            object: new GuestStringIterator(
                text.value,
                context.realm,
                context.realm.stringIteratorPrototype,
            ),
        });
    });
    realm.stringPrototype.bootstrapDefine(wellKnownIterator, {
        value: { kind: "object", object: factory },
        writable: true,
        enumerable: false,
        configurable: true,
    });
    realm.registerBuiltin(
        realm.stringIteratorPrototype,
        "next",
        0,
        (receiver, _args, context, loc) => {
            if (receiver.kind !== "object" || !(receiver.object instanceof GuestStringIterator)) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "receiver is not a String iterator",
                    loc,
                );
            }
            return receiver.object.next(context, loc);
        },
    );
    realm.stringIteratorPrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "String Iterator" },
        writable: false,
        enumerable: false,
        configurable: true,
    });
}
