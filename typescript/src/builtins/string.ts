import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import type { Realm } from "../realm.js";
import { GuestStringObject } from "../primitive-objects.js";
import { languageFailure, normal, UNDEFINED, type ThrowCompletion, type Value } from "../runtime.js";
import { stringLength, stringUnit, stringCodeUnit, stringSlice, stringIndexOf, stringLastIndexOf, stringJoin, isStringWhitespace, stringLowerCase, stringUpperCase, stringRepeat, type GuestString } from "../strings.js";
import type { Location } from "../syntax.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString, toNumber, toIntegerOrInfinity, type NumberCompletion } from "../conversion.js";
import { symbolDescriptiveString } from "../symbols.js";
import { registerStringConstruction } from "./string-construction.js";
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
    const prototype = getPrototypeFromConstructor(callee, "String", context, loc);
    if (prototype.type === "throw") return prototype;
    const proto = prototype.value;
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
    }, (_callee, newTarget, args, context, loc) => constructString(newTarget, args, context, loc));
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.stringPrototype }, writable: false, enumerable: false, configurable: false });
    realm.stringPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    realm.defineScriptGlobal("String", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    registerStringConstruction(realm, constructor);
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

export function stringReceiver(receiver: Value, context: OperationContext, loc: Location): StringCompletion {
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

function registerStringTrim(realm: Realm, name: string, where: "start" | "end" | "both"): void {
    realm.registerBuiltin(realm.stringPrototype, name, 0, (receiver, _args, context, loc): ValueCompletion => {
        const text = stringReceiver(receiver, context, loc);
        if (text.type === "throw") return text;
        let start = 0;
        let end = stringLength(text.value);
        if (where !== "end") {
            while (start < end && isStringWhitespace(stringCodeUnit(text.value, start))) {
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
                start++;
            }
        }
        if (where !== "start") {
            while (end > start && isStringWhitespace(stringCodeUnit(text.value, end - 1))) {
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
                end--;
            }
        }
        return normal({ kind: "string", value: stringSlice(text.value, start, end) });
    });
}

export function registerStringMethods(realm: Realm): void {
    if (realm.profile === "script") {
        realm.registerBuiltin(realm.stringPrototype, "repeat", 1, (receiver, args, context, loc): ValueCompletion => {
            const text = stringReceiver(receiver, context, loc);
            if (text.type === "throw") return text;
            const count = integerArgument(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (count.type === "throw") return count;
            if (count.value < 0 || count.value === Infinity)
                return languageFailure(context.realm, "RangeError", "invalid repeat count", loc);
            if (count.value === 0 || stringLength(text.value) === 0) return normal({ kind: "string", value: "" });
            const units = stringLength(text.value) * count.value;
            for (let i = 0; i < units; i++) {
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
            }
            return normal({ kind: "string", value: stringRepeat(text.value, count.value) });
        });
        realm.registerBuiltin(realm.stringPrototype, "codePointAt", 1, (receiver, args, context, loc): ValueCompletion => {
            const text = stringReceiver(receiver, context, loc);
            if (text.type === "throw") return text;
            const position = integerArgument(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (position.type === "throw") return position;
            const index = position.value;
            const length = stringLength(text.value);
            if (index < 0 || index >= length) return normal(UNDEFINED);
            const first = stringCodeUnit(text.value, index);
            if (first >= 0xd800 && first <= 0xdbff && index + 1 < length) {
                const second = stringCodeUnit(text.value, index + 1);
                if (second >= 0xdc00 && second <= 0xdfff)
                    return normal({ kind: "number", value: 0x10000 + (first - 0xd800) * 0x400 + second - 0xdc00 });
            }
            return normal({ kind: "number", value: first });
        });
        registerStringTrim(realm, "trim", "both");
        registerStringTrim(realm, "trimStart", "start");
        registerStringTrim(realm, "trimEnd", "end");
        realm.registerBuiltin(realm.stringPrototype, "toLowerCase", 0, (receiver, _args, context, loc): ValueCompletion => {
            const text = stringReceiver(receiver, context, loc);
            return text.type === "throw" ? text : normal({ kind: "string", value: stringLowerCase(text.value) });
        });
        realm.registerBuiltin(realm.stringPrototype, "toUpperCase", 0, (receiver, _args, context, loc): ValueCompletion => {
            const text = stringReceiver(receiver, context, loc);
            return text.type === "throw" ? text : normal({ kind: "string", value: stringUpperCase(text.value) });
        });
        realm.registerBuiltin(realm.stringPrototype, "concat", 1, (receiver, args, context, loc): ValueCompletion => {
            const text = stringReceiver(receiver, context, loc);
            if (text.type === "throw") return text;
            const parts: GuestString[] = [text.value];
            for (const argument of args) {
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
                const primitive = toPrimitive(argument, "string", context, loc);
                if (primitive.type === "throw") return primitive;
                const converted = toString(primitive.value, loc, context.realm);
                if (converted.type === "throw") return converted;
                parts.push(converted.value);
            }
            return normal({ kind: "string", value: stringJoin(parts) });
        });
        realm.registerBuiltin(realm.stringPrototype, "lastIndexOf", 1, (receiver, args, context, loc): ValueCompletion => {
            const text = stringReceiver(receiver, context, loc);
            if (text.type === "throw") return text;
            const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "string", context, loc);
            if (primitive.type === "throw") return primitive;
            const search = toString(primitive.value, loc, context.realm);
            if (search.type === "throw") return search;
            const positionPrimitive = toPrimitive(args.length < 2 ? UNDEFINED : args[1], "number", context, loc);
            if (positionPrimitive.type === "throw") return positionPrimitive;
            const numeric = toNumber(positionPrimitive.value, loc, context.realm);
            if (numeric.type === "throw") return numeric;
            const position = toIntegerOrInfinity({ kind: "number", value: Number.isNaN(numeric.value) ? Infinity : numeric.value }, loc, context.realm);
            if (position.type === "throw") return position;
            const start = Math.min(Math.max(position.value, 0), stringLength(text.value));
            return normal({ kind: "number", value: stringLastIndexOf(text.value, search.value, start) });
        });
    }
    realm.registerBuiltin(realm.stringPrototype, "indexOf", 1, (receiver, args, context, loc) => {
        const text = stringReceiver(receiver, context, loc);
        if (text.type === "throw") return text;
        const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "string", context, loc);
        if (primitive.type === "throw") return primitive;
        const search = toString(primitive.value, loc, context.realm);
        if (search.type === "throw") return search;
        const position = integerArgument(args.length < 2 ? UNDEFINED : args[1], context, loc);
        if (position.type === "throw") return position;
        const start = Math.min(Math.max(position.value, 0), stringLength(text.value));
        return normal({ kind: "number", value: stringIndexOf(text.value, search.value, start) });
    });
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
