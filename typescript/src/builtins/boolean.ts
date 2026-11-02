import type { Realm } from "../realm.js";
import { GuestBoolean } from "../primitive-objects.js";
import { failure, normal, type ThrowCompletion, type Value } from "../runtime.js";
import type { Location } from "../syntax.js";

export type BooleanCompletion = { type: "normal"; value: boolean } | ThrowCompletion;

export function thisBooleanValue(input: Value, loc: Location): BooleanCompletion {
    if (input.kind === "boolean") return { type: "normal", value: input.value };
    // Genuine slots survive relinking; the Boolean prototype itself has one.
    if (input.kind === "object" && input.object instanceof GuestBoolean) {
        return { type: "normal", value: input.object.booleanData };
    }
    return failure("TypeError", "receiver is not a boolean", loc);
}

export function registerBooleanConversions(realm: Realm): void {
    realm.registerBuiltin(realm.booleanPrototype, "toString", 0, (receiver, _args, _context, loc) => {
        const result = thisBooleanValue(receiver, loc);
        if (result.type === "throw") return result;
        return normal({ kind: "string", value: result.value ? "true" : "false" });
    });
    realm.registerBuiltin(realm.booleanPrototype, "valueOf", 0, (receiver, _args, _context, loc) => {
        const result = thisBooleanValue(receiver, loc);
        if (result.type === "throw") return result;
        return normal({ kind: "boolean", value: result.value });
    });
}
