import type { Realm } from "../realm.js";
import { lengthOfArrayLike } from "../array-like.js";
import { numberToString, toPropertyKey } from "../conversion.js";
import { arrayFromList } from "../array-create.js";
import { descriptorObject } from "./object-descriptors.js";
import { languageFailure, normal, UNDEFINED, type Value, type ValueCompletion } from "../runtime.js";
import { wellKnownToStringTag } from "../symbols.js";

export function registerReflect(realm: Realm): void {
    const reflect = realm.createObject();
    realm.registerBuiltin(reflect, "ownKeys", 1, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.ownKeys requires an object", loc);
        const values: Value[] = [];
        for (const key of target.object.ownPropertyKeys()) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            values.push(typeof key === "string" ? { kind: "string", value: key } : { kind: "symbol", value: key });
        }
        return arrayFromList(values, context, loc);
    });
    realm.registerBuiltin(reflect, "getOwnPropertyDescriptor", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.getOwnPropertyDescriptor requires an object", loc);
        const key = toPropertyKey(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (key.type === "throw") return key;
        return descriptorObject(target.object.getOwnProperty(key.value), context, loc);
    });
    realm.registerBuiltin(reflect, "getPrototypeOf", 1, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.getPrototypeOf requires an object", loc);
        const prototype = target.object.getPrototypeOf();
        return normal(prototype === null ? { kind: "null" } : { kind: "object", object: prototype });
    });
    realm.registerBuiltin(reflect, "isExtensible", 1, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.isExtensible requires an object", loc);
        return normal({ kind: "boolean", value: target.object.isExtensible() });
    });
    realm.registerBuiltin(reflect, "construct", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object" || target.object.constructorSlot === null)
            return languageFailure(context.realm, "TypeError", "target is not a constructor", loc);
        const newTarget = args.length < 3 ? target : args[2];
        if (newTarget.kind !== "object" || newTarget.object.constructorSlot === null)
            return languageFailure(context.realm, "TypeError", "newTarget is not a constructor", loc);
        const list = args.length < 2 ? UNDEFINED : args[1];
        if (list.kind !== "object") return languageFailure(context.realm, "TypeError", "constructor arguments are not an object", loc);
        const length = lengthOfArrayLike(list.object, context, loc);
        if (length.type === "throw") return length;
        const values: Value[] = [];
        for (let i = 0; i < length.value; i++) {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            const value = list.object.internalGet(numberToString(i), list, context, loc);
            if (value.type === "throw") return value;
            values.push(value.value);
        }
        const construct = context.construct;
        if (construct === undefined) throw new Error("Script construction unavailable");
        return construct(target, values, newTarget, loc);
    });
    reflect.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Reflect" }, configurable: true });
    realm.defineScriptGlobal("Reflect", { value: { kind: "object", object: reflect }, writable: true, configurable: true });
}
