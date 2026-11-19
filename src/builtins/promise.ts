import { registerPromiseFinally } from "./promise-finally.js";
import { registerPromiseHelpers } from "./promise-helpers.js";
import { registerPromiseCombinators } from "./promise-combinators.js";
import type { Realm } from "../realm.js";
import { getPrototypeFromConstructor } from "../constructor-prototype.js";
import { toObject } from "../object-conversion.js";
import {
    GuestPromise,
    createResolvingFunctions,
    newPromiseCapability,
    promiseSpecies,
    promiseResolve,
    isCallable,
    fatalPromiseCompletion,
} from "../promise.js";
import {
    normal,
    languageFailure,
    UNDEFINED,
    type GuestObject,
    type Value,
    type ValueCompletion,
} from "../runtime.js";
import { wellKnownSpecies, wellKnownToStringTag } from "../symbols.js";

export function registerPromise(realm: Realm): GuestObject {
    const constructor = realm.createBuiltinConstructor(
        "Promise",
        1,
        (_receiver, _args, context, loc): ValueCompletion =>
            languageFailure(context.realm, "TypeError", "Promise requires new", loc),
        (_callee, newTarget, args, context, loc): ValueCompletion => {
            const executor = args.length === 0 ? UNDEFINED : args[0];
            if (!isCallable(executor)) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "Promise executor is not callable",
                    loc,
                );
            }
            const prototype = getPrototypeFromConstructor(newTarget, "Promise", context, loc);
            if (prototype.type === "throw") {
                return prototype;
            }
            const tick = context.tick(loc);
            if (tick.type === "throw") {
                return tick;
            }
            const promise = new GuestPromise(prototype.value);
            const functions = createResolvingFunctions(promise, context.realm);
            const result = context.call(
                executor,
                UNDEFINED,
                [functions.resolve, functions.reject],
                loc,
            );
            if (result.type === "throw") {
                if (fatalPromiseCompletion(result)) {
                    return result;
                }
                const rejected = context.call(functions.reject, UNDEFINED, [result.value], loc);
                if (rejected.type === "throw") {
                    return rejected;
                }
            }
            return normal({ kind: "object", object: promise });
        },
    );
    constructor.bootstrapDefine("prototype", {
        value: { kind: "object", object: realm.promisePrototype },
    });
    realm.promisePrototype.bootstrapDefine("constructor", {
        value: { kind: "object", object: constructor },
        writable: true,
        configurable: true,
    });
    const species = realm.createBuiltin(
        "get [Symbol.species]",
        0,
        (receiver, _args, _context, _loc): ValueCompletion => normal(receiver),
    );
    constructor.bootstrapDefine(wellKnownSpecies, {
        get: { kind: "object", object: species },
        configurable: true,
    });
    realm.promisePrototype.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "Promise" },
        configurable: true,
    });
    realm.registerBuiltin(
        realm.promisePrototype,
        "then",
        2,
        (receiver, args, context, loc): ValueCompletion => {
            if (receiver.kind !== "object" || !(receiver.object instanceof GuestPromise)) {
                return languageFailure(
                    context.realm,
                    "TypeError",
                    "receiver is not a Promise",
                    loc,
                );
            }
            const speciesConstructor = promiseSpecies(receiver, constructor, context, loc);
            if (speciesConstructor.type === "throw") {
                return speciesConstructor;
            }
            const capability = newPromiseCapability(speciesConstructor.value, context, loc);
            if (capability.type === "throw") {
                return capability;
            }
            return receiver.object.then(
                capability.value,
                args.length === 0 ? UNDEFINED : args[0],
                args.length < 2 ? UNDEFINED : args[1],
                context,
                loc,
            );
        },
    );
    realm.registerBuiltin(
        realm.promisePrototype,
        "catch",
        1,
        (receiver, args, context, loc): ValueCompletion => {
            const object = toObject(receiver, context, loc);
            if (object.type === "throw") {
                return object;
            }
            const then = object.value.internalGet("then", receiver, context, loc);
            if (then.type === "throw") {
                return then;
            }
            return context.call(
                then.value,
                receiver,
                [UNDEFINED, args.length === 0 ? UNDEFINED : args[0]],
                loc,
            );
        },
    );
    for (const name of ["resolve", "reject"] as const) {
        realm.registerBuiltin(
            constructor,
            name,
            1,
            (receiver, args, context, loc): ValueCompletion => {
                const value = args.length === 0 ? UNDEFINED : args[0];
                if (name === "resolve") {
                    return promiseResolve(receiver, value, context, loc);
                }
                const capability = newPromiseCapability(receiver, context, loc);
                if (capability.type === "throw") {
                    return capability;
                }
                const result = context.call(capability.value.reject, UNDEFINED, [value], loc);
                return result.type === "throw" ? result : normal(capability.value.promise);
            },
        );
    }
    registerPromiseFinally(realm, constructor);
    registerPromiseHelpers(realm, constructor);
    registerPromiseCombinators(realm, constructor);
    realm.defineScriptGlobal("Promise", {
        value: { kind: "object", object: constructor },
        writable: true,
        configurable: true,
    });
    return constructor;
}
