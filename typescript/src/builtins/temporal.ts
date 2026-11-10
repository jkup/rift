import { registerTemporalInstantMethods } from "./temporal-instant-methods.js";
import type { Realm } from "../realm.js";
import { createTemporalInstant, temporalInstantValue } from "../temporal-instant-object.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { toBigInt } from "../numeric.js";
import { toNumber } from "../conversion.js";
import { toPrimitive } from "../primitive-conversion.js";
import { isValidEpochNanoseconds } from "../iso-calendar.js";
import { wellKnownToStringTag } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type ValueCompletion } from "../runtime.js";


export function registerTemporal(realm: Realm): void {
    const namespace = realm.createObject(), prototype = realm.temporalInstantPrototype;
    namespace.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal" }, writable: false, enumerable: false, configurable: true });
    const constructor = realm.createBuiltinConstructor("Instant", 1,
        (_receiver, _args, context, loc): ValueCompletion => languageFailure(context.realm, "TypeError", "Temporal.Instant requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const value = toBigInt(args.length === 0 ? UNDEFINED : args[0], context, loc);
            if (value.type === "throw") return value;
            if (!isValidEpochNanoseconds(value.value)) return languageFailure(context.realm, "RangeError", "instant outside the supported range", loc);
            const proto = getPrototypeFromConstructor(newTarget, "Temporal.Instant", context, loc);
            return proto.type === "throw" ? proto : createTemporalInstant(value.value, proto.value, context, loc);
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: prototype }, writable: false, enumerable: false, configurable: false });
    prototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    prototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Temporal.Instant" }, writable: false, enumerable: false, configurable: true });
    realm.registerBuiltin(constructor, "fromEpochNanoseconds", 1, (_receiver, args, context, loc): ValueCompletion => {
        const value = toBigInt(args.length === 0 ? UNDEFINED : args[0], context, loc);
        if (value.type === "throw") return value;
        if (!isValidEpochNanoseconds(value.value)) return languageFailure(context.realm, "RangeError", "instant outside the supported range", loc);
        return createTemporalInstant(value.value, context.realm.temporalInstantPrototype, context, loc);
    });
    realm.registerBuiltin(constructor, "fromEpochMilliseconds", 1, (_receiver, args, context, loc): ValueCompletion => {
        const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const value = toNumber(primitive.value, loc, context.realm);
        if (value.type === "throw") return value;
        if (!Number.isInteger(value.value) || Math.abs(value.value) > 8640000000000000)
            return languageFailure(context.realm, "RangeError", "invalid epoch milliseconds", loc);
        return createTemporalInstant(BigInt(value.value) * 1000000n, context.realm.temporalInstantPrototype, context, loc);
    });
    for (const name of ["epochMilliseconds", "epochNanoseconds"]) {
        const getter = realm.createBuiltin("get " + name, 0, (receiver, _args, context, loc): ValueCompletion => {
            const received = temporalInstantValue(receiver, context, loc);
            if (received.type === "throw") return received;
            const value = received.value;
            if (name === "epochNanoseconds") return normal({ kind: "bigint", value });
            const milliseconds = value / 1000000n - (value < 0n && value % 1000000n !== 0n ? 1n : 0n);
            return normal({ kind: "number", value: Number(milliseconds) });
        });
        prototype.bootstrapDefine(name, { get: { kind: "object", object: getter }, set: UNDEFINED, enumerable: false, configurable: true });
    }
    realm.registerBuiltin(prototype, "valueOf", 0, (_receiver, _args, context, loc): ValueCompletion =>
        languageFailure(context.realm, "TypeError", "Temporal.Instant cannot be converted to a primitive number", loc));
    registerTemporalInstantMethods(realm);
    namespace.bootstrapDefine("Instant", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    realm.defineScriptGlobal("Temporal", { value: { kind: "object", object: namespace }, writable: true, enumerable: false, configurable: true });
}
