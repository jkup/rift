import type { Realm } from "../realm.js";
import { GuestBigInt } from "../primitive-objects.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toIntegerOrInfinity } from "../conversion.js";
import { stringToBigInt, bigintToString } from "../bigint-conversion.js";
import { wellKnownToStringTag } from "../symbols.js";
import { languageFailure, normal, UNDEFINED, type OperationContext, type Value, type ValueCompletion } from "../runtime.js";
import type { BigIntResult } from "../bigint-arithmetic.js";
import type { Location } from "../syntax.js";

function thisBigIntValue(value: Value, context: OperationContext, loc: Location): BigIntResult {
    if (value.kind === "bigint") return { type: "normal", value: value.value };
    if (value.kind === "object" && value.object instanceof GuestBigInt) return { type: "normal", value: value.object.bigintData };
    return languageFailure(context.realm, "TypeError", "BigInt method requires a BigInt receiver", loc);
}

export function registerBigInt(realm: Realm): void {
    const constructor = realm.createBuiltin("BigInt", 1, (_receiver, args, context, loc): ValueCompletion => {
        const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "number", context, loc);
        if (primitive.type === "throw") return primitive;
        const value = primitive.value;
        if (value.kind === "bigint") return normal(value);
        if (value.kind === "boolean") return normal({ kind: "bigint", value: value.value ? 1n : 0n });
        if (value.kind === "number") {
            if (!Number.isInteger(value.value)) return languageFailure(context.realm, "RangeError", "BigInt requires an integral number", loc);
            return normal({ kind: "bigint", value: BigInt(value.value) });
        }
        if (value.kind === "string") {
            const parsed = stringToBigInt(value.value, context, loc);
            if (parsed.type === "throw") return parsed;
            if (parsed.value === null) return languageFailure(context.realm, "SyntaxError", "invalid BigInt string", loc);
            return normal({ kind: "bigint", value: parsed.value });
        }
        return languageFailure(context.realm, "TypeError", "value cannot be converted to BigInt", loc);
    });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.bigintPrototype }, writable: false, enumerable: false, configurable: false });
    realm.bigintPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    realm.bigintPrototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "BigInt" }, writable: false, enumerable: false, configurable: true });
    realm.registerBuiltin(realm.bigintPrototype, "valueOf", 0, (receiver, _args, context, loc): ValueCompletion => {
        const value = thisBigIntValue(receiver, context, loc);
        return value.type === "throw" ? value : normal({ kind: "bigint", value: value.value });
    });
    realm.registerBuiltin(realm.bigintPrototype, "toString", 1, (receiver, args, context, loc): ValueCompletion => {
        const value = thisBigIntValue(receiver, context, loc);
        if (value.type === "throw") return value;
        let radix = 10;
        if (args.length !== 0 && args[0].kind !== "undefined") {
            const primitive = toPrimitive(args[0], "number", context, loc);
            if (primitive.type === "throw") return primitive;
            const integer = toIntegerOrInfinity(primitive.value, loc, context.realm);
            if (integer.type === "throw") return integer;
            radix = integer.value;
        }
        if (radix < 2 || radix > 36) return languageFailure(context.realm, "RangeError", "BigInt radix must be between 2 and 36", loc);
        return normal({ kind: "string", value: bigintToString(value.value, radix) });
    });
    realm.defineScriptGlobal("BigInt", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}
