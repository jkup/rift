import type { Realm } from "../realm.js";
import { GuestBoolean } from "../primitive-objects.js";
import { languageFailure, normal, truthy, UNDEFINED, type ThrowCompletion, type Value } from "../runtime.js";
import type { Location } from "../syntax.js";

export type BooleanCompletion = { type: "normal"; value: boolean } | ThrowCompletion;

export function registerBoolean(realm: Realm): void {
    const constructor = realm.createBuiltinConstructor("Boolean", 1,
        (_receiver, args, _context, _loc) => normal({ kind: "boolean", value: truthy(args.length === 0 ? UNDEFINED : args[0]) }),
        (callee, args, context, loc) => {
            const value = truthy(args.length === 0 ? UNDEFINED : args[0]);
            const prototype = callee.internalGet("prototype", { kind: "object", object: callee }, context, loc);
            if (prototype.type === "throw") return prototype;
            const proto = prototype.value.kind === "object" ? prototype.value.object : context.realm.booleanPrototype;
            const allocation = context.tick(loc);
            if (allocation.type === "throw") return allocation;
            return normal({ kind: "object", object: new GuestBoolean(value, proto) });
        });
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.booleanPrototype }, writable: false, enumerable: false, configurable: false });
    realm.booleanPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
    realm.defineScriptGlobal("Boolean", { value: { kind: "object", object: constructor }, writable: true, enumerable: false, configurable: true });
}

export function thisBooleanValue(input: Value, loc: Location, realm: Realm | null): BooleanCompletion {
    if (input.kind === "boolean") return { type: "normal", value: input.value };
    // Genuine slots survive relinking; the Boolean prototype itself has one.
    if (input.kind === "object" && input.object instanceof GuestBoolean) {
        return { type: "normal", value: input.object.booleanData };
    }
    return languageFailure(realm, "TypeError", "receiver is not a boolean", loc);
}

export function registerBooleanConversions(realm: Realm): void {
    realm.registerBuiltin(realm.booleanPrototype, "toString", 0, (receiver, _args, context, loc) => {
        const result = thisBooleanValue(receiver, loc, context.realm);
        if (result.type === "throw") return result;
        return normal({ kind: "string", value: result.value ? "true" : "false" });
    });
    realm.registerBuiltin(realm.booleanPrototype, "valueOf", 0, (receiver, _args, context, loc) => {
        const result = thisBooleanValue(receiver, loc, context.realm);
        if (result.type === "throw") return result;
        return normal({ kind: "boolean", value: result.value });
    });
}
