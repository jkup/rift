import type { Realm } from "../realm.js";
import { newPromiseCapability, fatalPromiseCompletion } from "../promise.js";
import {
    UNDEFINED,
    normal,
    languageFailure,
    type GuestObject,
    type ValueCompletion,
} from "../runtime.js";

export function registerPromiseHelpers(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(
        constructor,
        "try",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            if (receiver.kind !== "object") {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "Promise constructor is not an object",
                    loc,
                );
            }
            const capability = newPromiseCapability(receiver, context, loc);
            if (capability.type === "throw") {
                return capability;
            }
            const result = context.call(
                args.length === 0 ? UNDEFINED : args[0],
                UNDEFINED,
                args.slice(1),
                loc,
            );
            if (result.type === "throw" && fatalPromiseCompletion(result)) {
                return result;
            }
            const settled = context.call(
                result.type === "throw" ? capability.value.reject : capability.value.resolve,
                UNDEFINED,
                [result.value],
                loc,
            );
            return settled.type === "throw" ? settled : normal(capability.value.promise);
        },
    );
    realm.registerBuiltin(
        constructor,
        "withResolvers",
        0,
        (receiver, _args, context, loc): ValueCompletion => {
            const capability = newPromiseCapability(receiver, context, loc);
            if (capability.type === "throw") {
                return capability;
            }
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const object = context.realm.createObject();
            object.bootstrapDefine("promise", {
                value: capability.value.promise,
                writable: true,
                enumerable: true,
                configurable: true,
            });
            object.bootstrapDefine("resolve", {
                value: capability.value.resolve,
                writable: true,
                enumerable: true,
                configurable: true,
            });
            object.bootstrapDefine("reject", {
                value: capability.value.reject,
                writable: true,
                enumerable: true,
                configurable: true,
            });
            return normal({ kind: "object", object });
        },
    );
}
