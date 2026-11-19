import type { Realm } from "../realm.js";
import { GuestSymbolObject } from "../primitive-objects.js";
import { languageFailure, normal, type ThrowCompletion, type Value } from "../runtime.js";
import { symbolDescriptiveString, wellKnownToPrimitive, wellKnownToStringTag, type GuestSymbol } from "../symbols.js";
import type { Location } from "../syntax.js";

export type SymbolCompletion = { type: "normal"; value: GuestSymbol } | ThrowCompletion;

export function thisSymbolValue(input: Value, loc: Location, realm: Realm | null): SymbolCompletion {
    if (input.kind === "symbol") return { type: "normal", value: input.value };
    // Slot membership survives prototype changes and cross-Realm borrowing.
    if (input.kind === "object" && input.object instanceof GuestSymbolObject) {
        return { type: "normal", value: input.object.symbolData };
    }
    return languageFailure(realm, "TypeError", "receiver is not a symbol", loc);
}

export function registerSymbolConversions(realm: Realm): void {
    realm.registerBuiltin(realm.symbolPrototype, "toString", 0, (receiver, _args, context, loc) => {
        const result = thisSymbolValue(receiver, loc, context.realm);
        if (result.type === "throw") return result;
        return normal({ kind: "string", value: symbolDescriptiveString(result.value) });
    });
    realm.registerBuiltin(realm.symbolPrototype, "valueOf", 0, (receiver, _args, context, loc) => {
        const result = thisSymbolValue(receiver, loc, context.realm);
        if (result.type === "throw") return result;
        return normal({ kind: "symbol", value: result.value });
    });
    const toPrimitive = realm.createBuiltin("[Symbol.toPrimitive]", 1, (receiver, _args, context, loc) => {
        const result = thisSymbolValue(receiver, loc, context.realm);
        if (result.type === "throw") return result;
        return normal({ kind: "symbol", value: result.value });
    });
    realm.symbolPrototype.bootstrapDefine(wellKnownToPrimitive, {
        value: { kind: "object", object: toPrimitive },
        writable: false, enumerable: false, configurable: true,
    });
    realm.symbolPrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "Symbol" },
        writable: false, enumerable: false, configurable: true,
    });
}
