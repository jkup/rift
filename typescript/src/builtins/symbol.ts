import type { Realm } from "../realm.js";
import { GuestSymbolObject } from "../primitive-objects.js";
import { languageFailure, normal, UNDEFINED, type ThrowCompletion, type Value } from "../runtime.js";
import {
    GuestSymbol, symbolFor, keyForSymbol, symbolDescriptiveString,
    wellKnownAsyncDispose, wellKnownAsyncIterator, wellKnownDispose,
    wellKnownHasInstance, wellKnownIsConcatSpreadable, wellKnownIterator,
    wellKnownMatch, wellKnownMatchAll, wellKnownReplace, wellKnownSearch,
    wellKnownSpecies, wellKnownSplit, wellKnownToPrimitive, wellKnownToStringTag,
    wellKnownUnscopables,
} from "../symbols.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString } from "../conversion.js";
import type { Location } from "../syntax.js";

export type SymbolCompletion = { type: "normal"; value: GuestSymbol } | ThrowCompletion;

export function registerSymbol(realm: Realm): void {
    const factory = realm.createBuiltinConstructor("Symbol", 0, (_receiver, args, context, loc) => {
        const input = args.length === 0 ? UNDEFINED : args[0];
        let description: string | undefined;
        if (input.kind !== "undefined") {
            const primitive = toPrimitive(input, "string", context, loc);
            if (primitive.type === "throw") return primitive;
            const converted = toString(primitive.value, loc, context.realm);
            if (converted.type === "throw") return converted;
            description = converted.value;
        }
        const allocation = context.tick(loc);
        if (allocation.type === "throw") return allocation;
        return normal({ kind: "symbol", value: new GuestSymbol(description) });
    }, (_callee, _args, context, loc) => languageFailure(context.realm, "TypeError", "Symbol cannot be constructed", loc));
    factory.bootstrapDefine("prototype", { value: { kind: "object", object: realm.symbolPrototype }, writable: false, enumerable: false, configurable: false });
    realm.registerBuiltin(factory, "for", 1, (_receiver, args, context, loc) => {
        const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "string", context, loc);
        if (primitive.type === "throw") return primitive;
        const key = toString(primitive.value, loc, context.realm);
        if (key.type === "throw") return key;
        const budget = context.tick(loc);
        if (budget.type === "throw") return budget;
        return normal({ kind: "symbol", value: symbolFor(key.value) });
    });
    realm.registerBuiltin(factory, "keyFor", 1, (_receiver, args, context, loc) => {
        const symbol = args.length === 0 ? UNDEFINED : args[0];
        if (symbol.kind !== "symbol") return languageFailure(context.realm, "TypeError", "Symbol.keyFor requires a symbol", loc);
        const budget = context.tick(loc);
        if (budget.type === "throw") return budget;
        const key = keyForSymbol(symbol.value);
        return normal(key === undefined ? UNDEFINED : { kind: "string", value: key });
    });
    for (const entry of [
        { name: "asyncDispose", symbol: wellKnownAsyncDispose },
        { name: "asyncIterator", symbol: wellKnownAsyncIterator },
        { name: "dispose", symbol: wellKnownDispose },
        { name: "hasInstance", symbol: wellKnownHasInstance },
        { name: "isConcatSpreadable", symbol: wellKnownIsConcatSpreadable },
        { name: "iterator", symbol: wellKnownIterator },
        { name: "match", symbol: wellKnownMatch },
        { name: "matchAll", symbol: wellKnownMatchAll },
        { name: "replace", symbol: wellKnownReplace },
        { name: "search", symbol: wellKnownSearch },
        { name: "species", symbol: wellKnownSpecies },
        { name: "split", symbol: wellKnownSplit },
        { name: "toPrimitive", symbol: wellKnownToPrimitive },
        { name: "toStringTag", symbol: wellKnownToStringTag },
        { name: "unscopables", symbol: wellKnownUnscopables },
    ]) {
        factory.bootstrapDefine(entry.name, { value: { kind: "symbol", value: entry.symbol }, writable: false, enumerable: false, configurable: false });
    }
    realm.symbolPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: factory }, writable: true, enumerable: false, configurable: true });
    const getter = realm.createBuiltin("get description", 0, (receiver, _args, context, loc) => {
        const result = thisSymbolValue(receiver, loc, context.realm);
        if (result.type === "throw") return result;
        const description = result.value.description;
        return normal(description === undefined ? UNDEFINED : { kind: "string", value: description });
    });
    realm.symbolPrototype.bootstrapDefine("description", { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    realm.defineScriptGlobal("Symbol", { value: { kind: "object", object: factory }, writable: true, enumerable: false, configurable: true });
}

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
