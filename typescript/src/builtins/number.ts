import { GuestNumber } from "../primitive-objects.js";
import { registerNumericParsing } from "./number-parse.js";
import { numberToString, toIntegerOrInfinity, toNumber, type NumberCompletion } from "../conversion.js";
import { toPrimitive } from "../primitive-conversion.js";
import { numberToStringRadix } from "../number-radix.js";
import type { Location } from "../syntax.js";
import type { Realm } from "../realm.js";
import { GuestObject, languageFailure, normal, UNDEFINED, type Builtin, type Value, type ValueCompletion, type OperationContext } from "../runtime.js";


export function registerNumber(realm: Realm): void {
    const namespace = realm.profile === "script" ? createNumberConstructor(realm) : realm.createObject();
    namespace.bootstrapDefine("NaN", { value: { kind: "number", value: NaN }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("POSITIVE_INFINITY", { value: { kind: "number", value: Infinity }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("NEGATIVE_INFINITY", { value: { kind: "number", value: -Infinity }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("MAX_VALUE", { value: { kind: "number", value: Number.MAX_VALUE }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("MIN_VALUE", { value: { kind: "number", value: Number.MIN_VALUE }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("EPSILON", { value: { kind: "number", value: Number.EPSILON }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("MAX_SAFE_INTEGER", { value: { kind: "number", value: Number.MAX_SAFE_INTEGER }, writable: false, enumerable: false, configurable: false });
    namespace.bootstrapDefine("MIN_SAFE_INTEGER", { value: { kind: "number", value: Number.MIN_SAFE_INTEGER }, writable: false, enumerable: false, configurable: false });
    registerPredicate(realm, namespace, "isNaN", (_receiver, args, context, _loc) => {
        const value = args.length === 0 ? UNDEFINED : args[0];
        return normal({ kind: "boolean", value: value.kind === "number" && Number.isNaN(value.value) });
    });
    registerPredicate(realm, namespace, "isFinite", (_receiver, args, context, _loc) => {
        const value = args.length === 0 ? UNDEFINED : args[0];
        return normal({ kind: "boolean", value: value.kind === "number" && Number.isFinite(value.value) });
    });
    if (realm.profile === "script") {
        registerPredicate(realm, namespace, "isInteger", (_receiver, args, _context, _loc): ValueCompletion => {
            const value = args.length === 0 ? UNDEFINED : args[0];
            return normal({ kind: "boolean", value: value.kind === "number" && Number.isInteger(value.value) });
        });
        registerPredicate(realm, namespace, "isSafeInteger", (_receiver, args, _context, _loc): ValueCompletion => {
            const value = args.length === 0 ? UNDEFINED : args[0];
            return normal({ kind: "boolean", value: value.kind === "number" && Number.isInteger(value.value) && Math.abs(value.value) <= 9007199254740991 });
        });
    }
    realm.installGlobal("Number", { kind: "object", object: namespace }, true);
    if (realm.profile === "script") registerNumericParsing(realm, namespace);
}

function numberArgument(args: Value[], context: OperationContext, loc: Location): NumberCompletion {
    if (args.length === 0) return { type: "normal", value: 0 };
    const primitive = toPrimitive(args[0], "number", context, loc);
    if (primitive.type === "throw") return primitive;
    return toNumber(primitive.value, loc, context.realm);
}

function createNumberConstructor(realm: Realm): GuestObject {
    const constructor = realm.createBuiltinConstructor("Number", 1,
        (_receiver, args, context, loc): ValueCompletion => {
            const converted = numberArgument(args, context, loc);
            return converted.type === "throw" ? converted : normal({ kind: "number", value: converted.value });
        },
        (callee, args, context, loc): ValueCompletion => {
            const converted = numberArgument(args, context, loc);
            if (converted.type === "throw") return converted;
            const prototype = callee.internalGet("prototype", { kind: "object", object: callee }, context, loc);
            if (prototype.type === "throw") return prototype;
            const proto = prototype.value.kind === "object" ? prototype.value.object : context.realm.numberPrototype;
            const allocation = context.tick(loc);
            if (allocation.type === "throw") return allocation;
            return normal({ kind: "object", object: new GuestNumber(converted.value, proto) });
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.numberPrototype }, writable: false, enumerable: false, configurable: false });
    realm.numberPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    return constructor;
}

function registerPredicate(realm: Realm, namespace: GuestObject, name: string, invoke: Builtin): void {
    realm.registerBuiltin(namespace, name, 1, invoke);
}

export function registerGlobalNumericPredicates(realm: Realm): void {
    for (const name of ["isNaN", "isFinite"]) {
        realm.registerBuiltin(realm.globalObject, name, 1, (_receiver, args, context, loc) => {
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "number", context, loc);
            if (primitive.type === "throw") return primitive;
            const number = toNumber(primitive.value, loc, context.realm);
            if (number.type === "throw") return number;
            return normal({kind: "boolean", value: name === "isNaN" ? Number.isNaN(number.value) : Number.isFinite(number.value)});
        });
    }
}

// Slots survive prototype relinking; Number.prototype itself holds genuine +0.
export function thisNumberValue(input: Value, loc: Location, realm: Realm | null): NumberCompletion {
    if (input.kind === "number") return { type: "normal", value: input.value };
    if (input.kind === "object" && input.object instanceof GuestNumber) {
        return { type: "normal", value: input.object.numberData };
    }
    return languageFailure(realm, "TypeError", "receiver is not a number", loc);
}

export function registerNumberConversions(realm: Realm): void {
    realm.registerBuiltin(realm.numberPrototype, "toString", 1, (receiver, args, context, loc) => {
        const extracted = thisNumberValue(receiver, loc, context.realm);
        if (extracted.type === "throw") return extracted;
        let radix = 10;
        if (args.length !== 0 && args[0].kind !== "undefined") {
            const primitive = toPrimitive(args[0], "number", context, loc);
            if (primitive.type === "throw") return primitive;
            const integer = toIntegerOrInfinity(primitive.value, loc, context.realm);
            if (integer.type === "throw") return integer;
            radix = integer.value;
        }
        // Radix effects and validation precede even zero/NaN/infinity formatting.
        if (radix < 2 || radix > 36) return languageFailure(context.realm, "RangeError", "radix must be between 2 and 36", loc);
        const value = extracted.value;
        if (radix === 10 || !Number.isFinite(value) || value === 0) {
            return normal({ kind: "string", value: numberToString(value) });
        }
        const magnitude = value < 0 ? -value : value;
        const digits = numberToStringRadix(magnitude, radix);
        return normal({ kind: "string", value: value < 0 ? "-" + digits : digits });
    });
    realm.registerBuiltin(realm.numberPrototype, "valueOf", 0, (receiver, _args, context, loc) => {
        const result = thisNumberValue(receiver, loc, context.realm);
        if (result.type === "throw") return result;
        return normal({ kind: "number", value: result.value });
    });
}
