import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import type { Realm } from "../realm.js";
import { GuestMap } from "../map-object.js";
import { addEntriesFromIterable } from "../iterable-entries.js";
import { languageFailure, normal, UNDEFINED, type OperationContext, type ThrowCompletion, type Value, type ValueCompletion } from "../runtime.js";
import { wellKnownSpecies, wellKnownToStringTag } from "../symbols.js";
import type { Location } from "../syntax.js";
import { registerGroupBy } from "./group-by.js";

function mapReceiver(receiver: Value, context: OperationContext, loc: Location): { type: "normal"; value: GuestMap } | ThrowCompletion {
    if (receiver.kind !== "object" || !(receiver.object instanceof GuestMap))
        return languageFailure(context.realm, "TypeError", "receiver is not a Map", loc);
    return { type: "normal", value: receiver.object };
}

export function registerMap(realm: Realm): void {
    const constructor = realm.createBuiltinConstructor("Map", 0,
        (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Map requires new", loc),
        (callee, args, context, loc): ValueCompletion => {
            const prototype = getPrototypeFromConstructor(callee, "Map", context, loc);
            if (prototype.type === "throw") return prototype;
            const allocation = context.tick(loc);
            if (allocation.type === "throw") return allocation;
            const map = new GuestMap(prototype.value);
            const receiver: Value = { kind: "object", object: map };
            const input = args.length === 0 ? UNDEFINED : args[0];
            if (input.kind === "undefined" || input.kind === "null") return normal(receiver);
            const adder = map.internalGet("set", receiver, context, loc);
            if (adder.type === "throw") return adder;
            if (adder.value.kind !== "object" || adder.value.object.callable === null)
                return languageFailure(context.realm, "TypeError", "Map set is not callable", loc);
            const result = addEntriesFromIterable(input, (key, value, adderContext, adderLoc) =>
                adderContext.call(adder.value, receiver, [key, value], adderLoc), context, loc);
            return result.type === "throw" ? result : normal(receiver);
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.mapPrototype }, writable: false, enumerable: false, configurable: false });
    realm.mapPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    const species = realm.createBuiltin("get [Symbol.species]", 0, (receiver, _args, _context, _loc) => normal(receiver));
    constructor.bootstrapDefine(wellKnownSpecies, { get: { kind: "object", object: species }, set: UNDEFINED, enumerable: false, configurable: true });
    registerGroupBy(realm, constructor, "collection");

    for (const name of ["get", "set", "has", "delete", "clear"] as const) {
        realm.registerBuiltin(realm.mapPrototype, name, name === "set" ? 2 : name === "clear" ? 0 : 1,
            (receiver, args, context, loc): ValueCompletion => {
                const map = mapReceiver(receiver, context, loc);
                if (map.type === "throw") return map;
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
                const key = args.length === 0 ? UNDEFINED : args[0];
                switch (name) {
                    case "get": return normal(map.value.data.get(key) ?? UNDEFINED);
                    case "has": return normal({ kind: "boolean", value: map.value.data.has(key) });
                    case "delete": return normal({ kind: "boolean", value: map.value.data.delete(key) });
                    case "clear": return map.value.data.clear(context, loc);
                    case "set":
                        map.value.data.set(key, args.length < 2 ? UNDEFINED : args[1]);
                        return normal(receiver);
                }
            });
    }
    const size = realm.createBuiltin("get size", 0, (receiver, _args, context, loc): ValueCompletion => {
        const map = mapReceiver(receiver, context, loc);
        return map.type === "throw" ? map : normal({ kind: "number", value: map.value.data.size });
    });
    realm.mapPrototype.bootstrapDefine("size", { get: { kind: "object", object: size }, set: UNDEFINED, enumerable: false, configurable: true });
    realm.mapPrototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Map" }, writable: false, enumerable: false, configurable: true });
    realm.registerBuiltin(realm.mapPrototype, "forEach", 1, (receiver, args, context, loc): ValueCompletion => {
        const map = mapReceiver(receiver, context, loc);
        if (map.type === "throw") return map;
        const callback = args.length === 0 ? UNDEFINED : args[0];
        if (callback.kind !== "object" || callback.object.callable === null)
            return languageFailure(context.realm, "TypeError", "Map callback is not callable", loc);
        const thisArg = args.length < 2 ? UNDEFINED : args[1];
        const cursor = map.value.data.cursor();
        while (true) {
            const next = cursor.next(context, loc);
            if (next.type === "throw") return next;
            if (next.entry === null) return normal();
            const called = context.call(callback, thisArg, [next.entry.value, next.entry.key, receiver], loc);
            if (called.type === "throw") return called;
        }
    });
    for (const name of ["getOrInsert", "getOrInsertComputed"] as const) {
        realm.registerBuiltin(realm.mapPrototype, name, 2, (receiver, args, context, loc): ValueCompletion => {
            const map = mapReceiver(receiver, context, loc);
            if (map.type === "throw") return map;
            let key = args.length === 0 ? UNDEFINED : args[0];
            const supplied = args.length < 2 ? UNDEFINED : args[1];
            if (name === "getOrInsertComputed" && (supplied.kind !== "object" || supplied.object.callable === null))
                return languageFailure(context.realm, "TypeError", "Map callback is not callable", loc);
            if (key.kind === "number" && key.value === 0) key = {kind: "number", value: 0};
            const lookup = context.tick(loc);
            if (lookup.type === "throw") return lookup;
            const existing = map.value.data.get(key);
            if (existing !== undefined) return normal(existing);
            let value = supplied;
            if (name === "getOrInsertComputed") {
                const called = context.call(supplied, UNDEFINED, [key], loc);
                if (called.type === "throw") return called;
                value = called.value;
            }
            const insertion = context.tick(loc);
            if (insertion.type === "throw") return insertion;
            // set looks up the key again: the callback may have changed the Map.
            map.value.data.set(key, value);
            return normal(value);
        });
    }
    realm.defineScriptGlobal("Map", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
