import type { Realm } from "../realm.js";
import { GuestStringObject } from "../primitive-objects.js";
import { languageFailure, normal, type ThrowCompletion, type Value } from "../runtime.js";
import type { GuestString } from "../strings.js";
import type { Location } from "../syntax.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString } from "../conversion.js";
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
