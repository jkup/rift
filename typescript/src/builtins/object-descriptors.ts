import type {Realm} from "../realm.js";
import {toObject} from "../object-conversion.js";
import {toPropertyKey} from "../conversion.js";
import {normal, languageFailure, truthy, UNDEFINED, type GuestObject, type OperationContext,
    type PropertyDescriptor, type PropertyDescriptorUpdate, type ThrowCompletion, type Value, type ValueCompletion} from "../runtime.js";
import type {Location} from "../syntax.js";

type DescriptorCompletion = {type: "normal"; value: PropertyDescriptorUpdate} | ThrowCompletion;

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
}
