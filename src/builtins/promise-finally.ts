import type { Realm } from "../realm.js";
import { isCallable, promiseResolve, promiseSpecies } from "../promise.js";
import {
    UNDEFINED,
    normal,
    languageFailure,
    type GuestObject,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import type { Location } from "../syntax.js";

function invokeThen(
    promise: Value,
    args: Value[],
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    if (promise.kind !== "object") {
        throw new Error("Promise capability must return an object");
    }
    const then = promise.object.internalGet("then", promise, context, loc);
    return then.type === "throw" ? then : context.call(then.value, promise, args, loc);
}

function cleanupHandler(
    realm: Realm,
    constructor: Value,
    onFinally: Value,
    rejected: boolean,
): Value {
    const handler = realm.createBuiltin("", 1, (_receiver, args, context, loc): ValueCompletion => {
        const value = args.length === 0 ? UNDEFINED : args[0];
        const result = context.call(onFinally, UNDEFINED, [], loc);
        if (result.type === "throw") {
            return result;
        }
        const promise = promiseResolve(constructor, result.value, context, loc);
        if (promise.type === "throw") {
            return promise;
        }
        const thunk = context.realm.createBuiltin(
            "",
            0,
            (_receiver, _args, _context, callLoc): ValueCompletion => {
                if (!rejected) {
                    return normal(value);
                }
                return {
                    type: "throw",
                    origin: { kind: "guest" },
                    value,
                    diagnostic: {
                        phase: "runtime",
                        name: "Uncaught",
                        message: "guest throw",
                        loc: callLoc,
                    },
                };
            },
        );
        return invokeThen(promise.value, [{ kind: "object", object: thunk }], context, loc);
    });
    return { kind: "object", object: handler };
}

export function registerPromiseFinally(realm: Realm, constructor: GuestObject): void {
    realm.registerBuiltin(
        realm.promisePrototype,
        "finally",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            if (receiver.kind !== "object") {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "finally receiver is not an object",
                    loc,
                );
            }
            const species = promiseSpecies(receiver, constructor, context, loc);
            if (species.type === "throw") {
                return species;
            }
            const onFinally = args.length === 0 ? UNDEFINED : args[0];
            const fulfilled = isCallable(onFinally)
                ? cleanupHandler(context.realm, species.value, onFinally, false)
                : onFinally;
            const rejected = isCallable(onFinally)
                ? cleanupHandler(context.realm, species.value, onFinally, true)
                : onFinally;
            return invokeThen(receiver, [fulfilled, rejected], context, loc);
        },
    );
}
