import type { Realm } from "../realm.js";
import { GuestStringObject } from "../primitive-objects.js";
import { failure, normal, type ThrowCompletion, type Value } from "../runtime.js";
import type { GuestString } from "../strings.js";
import type { Location } from "../syntax.js";

export type StringCompletion = { type: "normal"; value: GuestString } | ThrowCompletion;

export function thisStringValue(input: Value, loc: Location): StringCompletion {
    if (input.kind === "string") return { type: "normal", value: input.value };
    // Genuine slots survive relinking; the String prototype itself has one.
    if (input.kind === "object" && input.object instanceof GuestStringObject) {
        return { type: "normal", value: input.object.stringData };
    }
    return failure("TypeError", "receiver is not a string", loc);
}

export function registerStringConversions(realm: Realm): void {
    realm.registerBuiltin(realm.stringPrototype, "toString", 0, (receiver, _args, _context, loc) => {
        const result = thisStringValue(receiver, loc);
        if (result.type === "throw") return result;
        return normal({ kind: "string", value: result.value });
    });
    realm.registerBuiltin(realm.stringPrototype, "valueOf", 0, (receiver, _args, _context, loc) => {
        const result = thisStringValue(receiver, loc);
        if (result.type === "throw") return result;
        return normal({ kind: "string", value: result.value });
    });
}
