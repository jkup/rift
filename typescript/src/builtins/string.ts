import type { Realm } from "../realm.js";
import { GuestStringObject } from "../primitive-objects.js";
import { languageFailure, normal, UNDEFINED, type ThrowCompletion, type Value } from "../runtime.js";
import { stringLength, stringUnit, stringCodeUnit, stringSlice, type GuestString } from "../strings.js";
import type { Location } from "../syntax.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString, toIntegerOrInfinity, type NumberCompletion } from "../conversion.js";
import { symbolDescriptiveString } from "../symbols.js";
import type { GuestObject, OperationContext, ValueCompletion } from "../runtime.js";

function stringArgument(args: Value[], context: OperationContext, loc: Location): StringCompletion {
    if (args.length === 0) return { type: "normal", value: "" };
    const primitive = toPrimitive(args[0], "string", context, loc);
    if (primitive.type === "throw") return primitive;
    return toString(primitive.value, loc, context.realm);
}

function constructString(callee: GuestObject, args: Value[], context: OperationContext, loc: Location): ValueCompletion {
    const converted = stringArgument(args, context, loc);
    if (converted.type === "throw") return converted;
    // Conversion completes before prototype lookup or any allocation charge.
    const prototype = callee.internalGet("prototype", { kind: "object", object: callee }, context, loc);
    if (prototype.type === "throw") return prototype;
    const proto = prototype.value.kind === "object" ? prototype.value.object : context.realm.stringPrototype;
    const allocation = context.tick(loc);
    if (allocation.type === "throw") return allocation;
    return normal({ kind: "object", object: new GuestStringObject(converted.value, proto) });
}

export function registerString(realm: Realm): void {
    const constructor = realm.createBuiltinConstructor("String", 1, (_receiver, args, context, loc) => {
        // Only the original primitive Symbol has the String-call exception.
        if (args.length !== 0 && args[0].kind === "symbol")
            return normal({ kind: "string", value: symbolDescriptiveString(args[0].value) });
        const converted = stringArgument(args, context, loc);
        if (converted.type === "throw") return converted;
        return normal({ kind: "string", value: converted.value });
    }, (callee, args, context, loc) => constructString(callee, args, context, loc));
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.stringPrototype }, writable: false, enumerable: false, configurable: false });
    realm.stringPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    realm.defineScriptGlobal("String", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}

export type StringCompletion = { type: "normal"; value: GuestString } | ThrowCompletion;

export function thisStringValue(input: Value, loc: Location, realm: Realm | null): StringCompletion {
    if (input.kind === "string") return { type: "normal", value: input.value };
    // Genuine slots survive relinking; the String prototype itself has one.
    if (input.kind === "object" && input.object instanceof GuestStringObject) {
        return { type: "normal", value: input.object.stringData };
    }
    return languageFailure(realm, "TypeError", "receiver is not a string", loc);
}

export function registerStringConversions(realm: Realm): void {
    realm.registerBuiltin(realm.stringPrototype, "toString", 0, (receiver, _args, context, loc) => {
        const result = thisStringValue(receiver, loc, context.realm);
        if (result.type === "throw") return result;
        return normal({ kind: "string", value: result.value });
    });
    realm.registerBuiltin(realm.stringPrototype, "valueOf", 0, (receiver, _args, context, loc) => {
        const result = thisStringValue(receiver, loc, context.realm);
        if (result.type === "throw") return result;
        return normal({ kind: "string", value: result.value });
    });
}

function stringReceiver(receiver: Value, context: OperationContext, loc: Location): StringCompletion {
    if (receiver.kind === "null" || receiver.kind === "undefined") {
        return languageFailure(context.realm, "TypeError", "cannot convert null or undefined to object", loc);
    }
    const tick = context.tick(loc);
    if (tick.type === "throw") return tick;
    const primitive = toPrimitive(receiver, "string", context, loc);
    if (primitive.type === "throw") return primitive;
    return toString(primitive.value, loc, context.realm);
}

function integerArgument(value: Value, context: OperationContext, loc: Location): NumberCompletion {
    const primitive = toPrimitive(value, "number", context, loc);
    if (primitive.type === "throw") return primitive;
    return toIntegerOrInfinity(primitive.value, loc, context.realm);
}

function sliceIndex(index: number, length: number): number {
    return Math.min(Math.max(index < 0 ? length + index : index, 0), length);
}

export function registerStringMethods(realm: Realm): void {
    realm.registerBuiltin(realm.stringPrototype, "charAt", 1, (receiver, args, context, loc) => {
        const text = stringReceiver(receiver, context, loc);
        if (text.type === "throw") return text;
        const position = integerArgument(args.length > 0 ? args[0] : UNDEFINED, context, loc);
        if (position.type === "throw") return position;
        const value = position.value < 0 || position.value >= stringLength(text.value)
            ? "" : stringUnit(text.value, position.value);
        return normal({ kind: "string", value });
    });
    realm.registerBuiltin(realm.stringPrototype, "charCodeAt", 1, (receiver, args, context, loc) => {
        const text = stringReceiver(receiver, context, loc);
        if (text.type === "throw") return text;
        const position = integerArgument(args.length > 0 ? args[0] : UNDEFINED, context, loc);
        if (position.type === "throw") return position;
        const value = position.value < 0 || position.value >= stringLength(text.value)
            ? NaN : stringCodeUnit(text.value, position.value);
        return normal({ kind: "number", value });
    });
    realm.registerBuiltin(realm.stringPrototype, "slice", 2, (receiver, args, context, loc) => {
        const text = stringReceiver(receiver, context, loc);
        if (text.type === "throw") return text;
        const length = stringLength(text.value);
        const start = integerArgument(args.length > 0 ? args[0] : UNDEFINED, context, loc);
        if (start.type === "throw") return start;
        const end: NumberCompletion = args.length < 2 || args[1].kind === "undefined"
            ? { type: "normal", value: length } : integerArgument(args[1], context, loc);
        if (end.type === "throw") return end;
        return normal({ kind: "string", value: stringSlice(text.value, sliceIndex(start.value, length), sliceIndex(end.value, length)) });
    });
}
