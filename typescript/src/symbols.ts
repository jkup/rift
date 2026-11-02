import type { GuestString } from "./strings.js";

// The reference is the identity; descriptions are diagnostic text only.
export class GuestSymbol {
    constructor(readonly description: GuestString | undefined) {}
}

export function symbolDescriptiveString(symbol: GuestSymbol): GuestString {
    return "Symbol(" + (symbol.description === undefined ? "" : symbol.description) + ")";
}

export function formatPropertyKey(key: GuestString | GuestSymbol): GuestString {
    return typeof key === "string" ? key : symbolDescriptiveString(key);
}
