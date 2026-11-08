import { wellKnownHasInstance } from "../symbols.js";
import type { Location } from "../syntax.js";
import type { Realm } from "../realm.js";
import { UNDEFINED, languageFailure, normal, type Value, type Callable, type OperationContext, type ValueCompletion, truthy } from "../runtime.js";
import { stringSlice, type GuestString } from "../strings.js";
import {lengthOfArrayLike} from "../array-like.js";
import {numberToString} from "../conversion.js";

export function nativeFunctionString(initialName: string | null): GuestString {
    const name = initialName === null ? "" : initialName;
    const accessor = name.startsWith("get ") || name.startsWith("set ");
    const propertyName = accessor ? stringSlice(name, 4, name.length) : name;
    if (accessor && propertyName.length === 0) throw new Error("invalid builtin initial name");
    if (propertyName !== "[Symbol.toPrimitive]" && propertyName !== "[Symbol.hasInstance]" && propertyName !== "[Symbol.iterator]") {
        for (let i = 0; i < propertyName.length; i++) {
            const c = propertyName.charAt(i);
            const letter = (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";
            if (!letter && !(i > 0 && c >= "0" && c <= "9")) throw new Error("invalid builtin initial name");
        }
    }
    return "function " + name + "() { [native code] }";
}

export function functionSourceString(callable: Callable): string {
    switch (callable.kind) {
        case "guest": {
            const source = callable.source;
            return source === null ? nativeFunctionString(null) : stringSlice(source.source.text, source.start, source.end);
        }
        case "builtin": return nativeFunctionString(callable.initialName);
        case "script-guest": return callable.sourceText();
    }
}
export function ordinaryHasInstance(callee: Value, value: Value, context: OperationContext, loc: Location): ValueCompletion {
    if (callee.kind !== "object" || callee.object.callable === null) return normal({ kind: "boolean", value: false });
    if (callee.object.callable.realm.profile !== context.realm.profile) throw new Error("cross-profile callable invocation");
    if (value.kind !== "object") return normal({ kind: "boolean", value: false });
    const prototype = callee.object.internalGet("prototype", callee, context, loc);
    if (prototype.type === "throw") return prototype;
    if (prototype.value.kind !== "object") return languageFailure(context.realm, "TypeError", "constructor prototype is not an object", loc);
    let object = value.object;
    while (true) {
        const budget = context.tick(loc);
        if (budget.type === "throw") return budget;
        const parent = object.getPrototypeOf();
        if (parent === null) return normal({ kind: "boolean", value: false });
        if (parent === prototype.value.object) return normal({ kind: "boolean", value: true });
        object = parent;
    }
}
export function instanceofOperator(value: Value, target: Value, context: OperationContext, loc: Location): ValueCompletion {
    if (target.kind !== "object") return languageFailure(context.realm, "TypeError", "instanceof target is not an object", loc);
    if (target.object.callable !== null && target.object.callable.realm.profile !== context.realm.profile)
        throw new Error("cross-profile callable invocation");
    const method = target.object.internalGet(wellKnownHasInstance, target, context, loc);
    if (method.type === "throw") return method;
    if (method.value.kind !== "undefined" && method.value.kind !== "null") {
        if (method.value.kind !== "object" || method.value.object.callable === null) return languageFailure(context.realm, "TypeError", "hasInstance method is not callable", loc);
        const result = context.call(method.value, target, [value], loc);
        if (result.type === "throw") return result;
        return normal({ kind: "boolean", value: truthy(result.value) });
    }
    if (target.object.callable === null) return languageFailure(context.realm, "TypeError", "instanceof target is not callable", loc);
    return ordinaryHasInstance(target, value, context, loc);
}
export function registerFunction(realm: Realm): void {
    if (realm.profile === "script") {
        const method = realm.createBuiltin("[Symbol.hasInstance]", 1, (receiver, args, context, loc) =>
            ordinaryHasInstance(receiver, args.length === 0 ? UNDEFINED : args[0], context, loc));
        realm.functionPrototype.bootstrapDefine(wellKnownHasInstance, {
            value: { kind: "object", object: method }, writable: false, enumerable: false, configurable: false,
        });
    }
    realm.registerBuiltin(realm.functionPrototype, "call", 1, (receiver, args, context, loc) => {
        if (receiver.kind !== "object" || receiver.object.callable === null) {
            return languageFailure(context.realm, "TypeError", "Function.prototype.call receiver is not callable", loc);
        }
        const thisArg = args.length === 0 ? UNDEFINED : args[0];
        const rest: Value[] = [];
        for (let i = 1; i < args.length; i++) rest.push(args[i]);
        // Preserve Values and the active budget/context. Proper tail calls are
        // not supported: this builtin remains active while its target runs.
        return context.call(receiver, thisArg, rest, loc);
    });
    realm.registerBuiltin(realm.functionPrototype, "apply", 2, (receiver, args, context, loc) => {
        if (receiver.kind !== "object" || receiver.object.callable === null)
            return languageFailure(context.realm, "TypeError", "Function.prototype.apply receiver is not callable", loc);
        if (receiver.object.callable.realm.profile !== context.realm.profile) throw new Error("cross-profile callable invocation");
        const thisArg = args.length === 0 ? UNDEFINED : args[0];
        const array = args.length < 2 ? UNDEFINED : args[1];
        const values: Value[] = [];
        if (array.kind !== "undefined" && array.kind !== "null") {
            if (array.kind !== "object") return languageFailure(context.realm, "TypeError", "apply argument list is not an object", loc);
            const length = lengthOfArrayLike(array.object, context, loc);
            if (length.type === "throw") return length;
            for (let index = 0; index < length.value; index++) {
                const tick = context.tick(loc);
                if (tick.type === "throw") return tick;
                const value = array.object.internalGet(numberToString(index), array, context, loc);
                if (value.type === "throw") return value;
                values.push(value.value);
            }
        }
        return context.call(receiver, thisArg, values, loc);
    });
    realm.registerBuiltin(realm.functionPrototype, "toString", 0, (receiver, _args, context, loc) => {
        if (receiver.kind !== "object" || receiver.object.callable === null) {
            return languageFailure(context.realm, "TypeError", "Function.prototype.toString receiver is not callable", loc);
        }
        return normal({ kind: "string", value: functionSourceString(receiver.object.callable) });
    });
}
