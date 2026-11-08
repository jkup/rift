import type { Realm } from "../realm.js";
import { languageFailure, normal, UNDEFINED, type GuestObject, type PropertyDescriptorUpdate, type ValueCompletion } from "../runtime.js";

export function registerObjectIntegrity(realm: Realm, constructor: GuestObject): void {
    for (const name of ["preventExtensions", "seal", "freeze"]) {
        realm.registerBuiltin(constructor, name, 1, (_receiver, args, context, loc): ValueCompletion => {
            const input = args.length === 0 ? UNDEFINED : args[0];
            if (input.kind !== "object") return normal(input);
            const tick = context.tick(loc);
            if (tick.type === "throw") return tick;
            const object = input.object;
            if (!object.preventExtensions().value) return languageFailure(context.realm, "TypeError", "cannot prevent object extensions", loc);
            if (name === "preventExtensions") return normal(input);
            for (const key of object.ownPropertyKeys()) {
                const step = context.tick(loc);
                if (step.type === "throw") return step;
                const descriptor: PropertyDescriptorUpdate = { configurable: false };
                if (name === "freeze") {
                    const current = object.getOwnProperty(key);
                    if (current === undefined) continue;
                    if (current.kind === "data") descriptor.writable = false;
                }
                const defined = object.defineOwnProperty(key, descriptor, context, loc);
                if (defined.type === "throw") return defined;
                if (!defined.value) return languageFailure(context.realm, "TypeError", "cannot change object integrity", loc);
            }
            return normal(input);
        });
    }
    for (const name of ["isExtensible", "isSealed", "isFrozen"]) {
        realm.registerBuiltin(constructor, name, 1, (_receiver, args, context, loc): ValueCompletion => {
            const input = args.length === 0 ? UNDEFINED : args[0];
            if (input.kind !== "object") return normal({ kind: "boolean", value: name !== "isExtensible" });
            const extensible = input.object.isExtensible();
            if (name === "isExtensible") return normal({ kind: "boolean", value: extensible });
            if (extensible) return normal({ kind: "boolean", value: false });
            for (const key of input.object.ownPropertyKeys()) {
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
                const descriptor = input.object.getOwnProperty(key);
                if (descriptor !== undefined && (descriptor.configurable ||
                    (name === "isFrozen" && descriptor.kind === "data" && descriptor.writable))) return normal({ kind: "boolean", value: false });
            }
            return normal({ kind: "boolean", value: true });
        });
    }
}
