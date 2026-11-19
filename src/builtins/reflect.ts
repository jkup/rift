import type { Realm } from "../realm.js";
import { createListFromArrayLike } from "../array-like.js";
import { toPropertyKey } from "../conversion.js";
import { arrayFromList } from "../array-create.js";
import { descriptorObject, toDescriptor } from "./object-descriptors.js";
import { languageFailure, normal, UNDEFINED, type Value, type ValueCompletion } from "../runtime.js";
import { wellKnownToStringTag } from "../symbols.js";

export function registerReflect(realm: Realm): void {
    const reflect = realm.createObject();
    realm.registerBuiltin(reflect, "apply", 3, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object" || target.object.callable === null)
            return languageFailure(context.realm, "TypeError", "Reflect.apply target is not callable", loc);
        const list = args.length < 3 ? UNDEFINED : args[2];
        if (list.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.apply arguments are not an object", loc);
        const values = createListFromArrayLike(list.object, context, loc);
        if (values.type === "throw") return values;
        return context.call(target, args.length < 2 ? UNDEFINED : args[1], values.values, loc);
    });
    realm.registerBuiltin(reflect, "get", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.get requires an object", loc);
        const key = toPropertyKey(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (key.type === "throw") return key;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        return target.object.internalGet(key.value, args.length < 3 ? target : args[2], context, loc);
    });
    realm.registerBuiltin(reflect, "set", 3, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.set requires an object", loc);
        const key = toPropertyKey(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (key.type === "throw") return key;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const written = target.object.internalSet(key.value, args.length < 3 ? UNDEFINED : args[2], args.length < 4 ? target : args[3], context, loc);
        return written.type === "throw" ? written : normal({ kind: "boolean", value: written.value });
    });
    realm.registerBuiltin(reflect, "has", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.has requires an object", loc);
        const key = toPropertyKey(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (key.type === "throw") return key;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const present = target.object.internalHasProperty(key.value, loc);
        return present.type === "throw" ? present : normal({ kind: "boolean", value: present.value });
    });
    realm.registerBuiltin(reflect, "defineProperty", 3, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.defineProperty requires an object", loc);
        const key = toPropertyKey(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (key.type === "throw") return key;
        const descriptor = toDescriptor(args.length < 3 ? UNDEFINED : args[2], context, loc);
        if (descriptor.type === "throw") return descriptor;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const defined = target.object.defineOwnProperty(key.value, descriptor.value, context, loc);
        return defined.type === "throw" ? defined : normal({ kind: "boolean", value: defined.value });
    });
    realm.registerBuiltin(reflect, "deleteProperty", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.deleteProperty requires an object", loc);
        const key = toPropertyKey(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (key.type === "throw") return key;
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const deleted = target.object.internalDelete(key.value);
        return deleted.type === "throw" ? deleted : normal({ kind: "boolean", value: deleted.value });
    });
    realm.registerBuiltin(reflect, "preventExtensions", 1, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.preventExtensions requires an object", loc);
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        return normal({ kind: "boolean", value: target.object.preventExtensions().value });
    });
    realm.registerBuiltin(reflect, "setPrototypeOf", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Reflect.setPrototypeOf requires an object", loc);
        const prototype = args.length < 2 ? UNDEFINED : args[1];
        if (prototype.kind !== "object" && prototype.kind !== "null") return languageFailure(context.realm, "TypeError", "prototype must be an object or null", loc);
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const changed = target.object.internalSetPrototypeOf(prototype.kind === "object" ? prototype.object : null, context, loc);
        return changed.type === "throw" ? changed : normal({ kind: "boolean", value: changed.value });
    });
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
        const values = createListFromArrayLike(list.object, context, loc);
        if (values.type === "throw") return values;
        const construct = context.construct;
        if (construct === undefined) throw new Error("Script construction unavailable");
        return construct(target, values.values, newTarget, loc);
    });
    reflect.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Reflect" }, configurable: true });
    realm.defineScriptGlobal("Reflect", { value: { kind: "object", object: reflect }, writable: true, configurable: true });
}
