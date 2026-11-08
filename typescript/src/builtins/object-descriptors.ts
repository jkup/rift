import type {Realm} from "../realm.js";
import {toObject} from "../object-conversion.js";
import {toPropertyKey} from "../conversion.js";
import {normal, languageFailure, truthy, UNDEFINED, GuestObject, type OperationContext,
    type PropertyKey, type PropertyDescriptor, type PropertyDescriptorUpdate, type ThrowCompletion, type Value, type ValueCompletion} from "../runtime.js";
import type {Location} from "../syntax.js";

type DescriptorCompletion = {type: "normal"; value: PropertyDescriptorUpdate} | ThrowCompletion;

function defineProperties(target: GuestObject, properties: Value, context: OperationContext, loc: Location): ValueCompletion {
    const converted = toObject(properties, context, loc);
    if (converted.type === "throw") return converted;
    const source = converted.value;
    const receiver: Value = {kind: "object", object: source};
    const descriptors: {key: PropertyKey; descriptor: PropertyDescriptorUpdate}[] = [];
    for (const key of source.ownPropertyKeys()) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const own = source.getOwnProperty(key);
        if (own === undefined || !own.enumerable) continue;
        const read = source.internalGet(key, receiver, context, loc);
        if (read.type === "throw") return read;
        const convertedDescriptor = toDescriptor(read.value, context, loc);
        if (convertedDescriptor.type === "throw") return convertedDescriptor;
        descriptors.push({key, descriptor: convertedDescriptor.value});
    }
    // Conversion is complete before the first definition; application failures
    // retain any earlier definitions, including exotic array-length effects.
    for (const entry of descriptors) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const defined = target.defineOwnProperty(entry.key, entry.descriptor, context, loc);
        if (defined.type === "throw") return defined;
        if (!defined.value) return languageFailure(context.realm, "TypeError", "cannot define property", loc);
    }
    return normal({kind: "object", object: target});
}

function toDescriptor(input: Value, context: OperationContext, loc: Location): DescriptorCompletion {
    if (input.kind !== "object") return languageFailure(context.realm, "TypeError", "property descriptor must be an object", loc);
    const descriptor: PropertyDescriptorUpdate = {};
    for (const field of ["enumerable", "configurable", "value", "writable", "get", "set"]) {
        const step = context.tick(loc);
        if (step.type === "throw") return step;
        const present = input.object.internalHasProperty(field, loc);
        if (present.type === "throw") return present;
        if (!present.value) continue;
        const read = input.object.internalGet(field, input, context, loc);
        if (read.type === "throw") return read;
        const value = read.value;
        switch (field) {
            case "enumerable": descriptor.enumerable = truthy(value); break;
            case "configurable": descriptor.configurable = truthy(value); break;
            case "value": descriptor.value = value; break;
            case "writable": descriptor.writable = truthy(value); break;
            case "get": case "set":
                if (value.kind !== "undefined" && (value.kind !== "object" || value.object.callable === null))
                    return languageFailure(context.realm, "TypeError", "descriptor " + field + " must be callable or undefined", loc);
                if (field === "get") descriptor.get = value;
                else descriptor.set = value;
                break;
        }
    }
    if ((descriptor.get !== undefined || descriptor.set !== undefined) &&
        (descriptor.value !== undefined || descriptor.writable !== undefined))
        return languageFailure(context.realm, "TypeError", "property descriptor mixes data and accessor fields", loc);
    return {type: "normal", value: descriptor};
}

function descriptorObject(descriptor: PropertyDescriptor | undefined, context: OperationContext, loc: Location): ValueCompletion {
    if (descriptor === undefined) return normal();
    const allocation = context.tick(loc);
    if (allocation.type === "throw") return allocation;
    const object = context.realm.createObject();
    if (descriptor.kind === "data") {
        object.bootstrapDefine("value", {value: descriptor.value, writable: true, enumerable: true, configurable: true});
        object.bootstrapDefine("writable", {value: {kind: "boolean", value: descriptor.writable}, writable: true, enumerable: true, configurable: true});
    } else {
        object.bootstrapDefine("get", {value: descriptor.get, writable: true, enumerable: true, configurable: true});
        object.bootstrapDefine("set", {value: descriptor.set, writable: true, enumerable: true, configurable: true});
    }
    object.bootstrapDefine("enumerable", {value: {kind: "boolean", value: descriptor.enumerable}, writable: true, enumerable: true, configurable: true});
    object.bootstrapDefine("configurable", {value: {kind: "boolean", value: descriptor.configurable}, writable: true, enumerable: true, configurable: true});
    return normal({kind: "object", object});
}

export function registerObjectDescriptors(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(constructor, "defineProperty", 3, (_receiver, args, context, loc) => {
        const object = args.length === 0 ? UNDEFINED : args[0];
        if (object.kind !== "object") return languageFailure(context.realm, "TypeError", "Object.defineProperty requires an object", loc);
        const key = toPropertyKey(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (key.type === "throw") return key;
        const descriptor = toDescriptor(args.length < 3 ? UNDEFINED : args[2], context, loc);
        if (descriptor.type === "throw") return descriptor;
        const defined = object.object.defineOwnProperty(key.value, descriptor.value, context, loc);
        if (defined.type === "throw") return defined;
        if (!defined.value) return languageFailure(context.realm, "TypeError", "cannot define property", loc);
        return normal(object);
    });
    realm.registerBuiltin(constructor, "getOwnPropertyDescriptor", 2, (_receiver, args, context, loc) => {
        const object = toObject(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (object.type === "throw") return object;
        const key = toPropertyKey(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (key.type === "throw") return key;
        return descriptorObject(object.value.getOwnProperty(key.value), context, loc);
    });
    realm.registerBuiltin(constructor, "defineProperties", 2, (_receiver, args, context, loc): ValueCompletion => {
        const target = args.length === 0 ? UNDEFINED : args[0];
        if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "Object.defineProperties requires an object", loc);
        return defineProperties(target.object, args.length < 2 ? UNDEFINED : args[1], context, loc);
    });
    realm.registerBuiltin(constructor, "create", 2, (_receiver, args, context, loc): ValueCompletion => {
        const prototype = args.length === 0 ? UNDEFINED : args[0];
        if (prototype.kind !== "object" && prototype.kind !== "null") return languageFailure(context.realm, "TypeError", "Object.create requires an object or null prototype", loc);
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const object = new GuestObject(prototype.kind === "object" ? prototype.object : null);
        const properties = args.length < 2 ? UNDEFINED : args[1];
        return properties.kind === "undefined" ? normal({kind: "object", object}) : defineProperties(object, properties, context, loc);
    });
}
