import type { GuestString } from "./strings.js";

// The reference is the identity; descriptions are diagnostic text only.
export class GuestSymbol {
    constructor(readonly description: GuestString | undefined) {}
}

// Shared semantic identity across every Realm in this runtime module instance.
export const wellKnownHasInstance = new GuestSymbol("Symbol.hasInstance");
export const wellKnownSpecies = new GuestSymbol("Symbol.species");
export const wellKnownToPrimitive = new GuestSymbol("Symbol.toPrimitive");
export const wellKnownToStringTag = new GuestSymbol("Symbol.toStringTag");

export function symbolDescriptiveString(symbol: GuestSymbol): GuestString {
    return "Symbol(" + (symbol.description === undefined ? "" : symbol.description) + ")";
}

export function formatPropertyKey(key: GuestString | GuestSymbol): GuestString {
    return typeof key === "string" ? key : symbolDescriptiveString(key);
}
