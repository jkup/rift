import type { GuestString } from "./strings.js";

// The reference is the identity; descriptions are diagnostic text only.
export class GuestSymbol {
    constructor(readonly description: GuestString | undefined) {}
}

// This runtime module represents one agent. Its registry shares primitives,
// never guest objects, across Realms just like the well-known identities below.
const symbolRegistry = new Map<GuestString, GuestSymbol>();

export function symbolFor(key: GuestString): GuestSymbol {
    const existing = symbolRegistry.get(key);
    if (existing !== undefined) {
        return existing;
    }
    const symbol = new GuestSymbol(key);
    symbolRegistry.set(key, symbol);
    return symbol;
}

export function keyForSymbol(symbol: GuestSymbol): GuestString | undefined {
    const key = symbol.description;
    return key !== undefined && symbolRegistry.get(key) === symbol ? key : undefined;
}

// Shared semantic identity across every Realm in this runtime module instance.
export const wellKnownAsyncDispose = new GuestSymbol("Symbol.asyncDispose");
export const wellKnownAsyncIterator = new GuestSymbol("Symbol.asyncIterator");
export const wellKnownDispose = new GuestSymbol("Symbol.dispose");
export const wellKnownHasInstance = new GuestSymbol("Symbol.hasInstance");
export const wellKnownIsConcatSpreadable = new GuestSymbol("Symbol.isConcatSpreadable");
export const wellKnownIterator = new GuestSymbol("Symbol.iterator");
export const wellKnownMatch = new GuestSymbol("Symbol.match");
export const wellKnownMatchAll = new GuestSymbol("Symbol.matchAll");
export const wellKnownReplace = new GuestSymbol("Symbol.replace");
export const wellKnownSearch = new GuestSymbol("Symbol.search");
export const wellKnownSplit = new GuestSymbol("Symbol.split");
export const wellKnownSpecies = new GuestSymbol("Symbol.species");
export const wellKnownToPrimitive = new GuestSymbol("Symbol.toPrimitive");
export const wellKnownToStringTag = new GuestSymbol("Symbol.toStringTag");
export const wellKnownUnscopables = new GuestSymbol("Symbol.unscopables");

export function symbolDescriptiveString(symbol: GuestSymbol): GuestString {
    return "Symbol(" + (symbol.description === undefined ? "" : symbol.description) + ")";
}

export function formatPropertyKey(key: GuestString | GuestSymbol): GuestString {
    return typeof key === "string" ? key : symbolDescriptiveString(key);
}
