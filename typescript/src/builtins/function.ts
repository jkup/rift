import type { Realm } from "../realm.js";
import { UNDEFINED, failure, normal, type Value } from "../runtime.js";
import { stringSlice, type GuestString } from "../strings.js";

export function nativeFunctionString(initialName: string | null): GuestString {
    const name = initialName === null ? "" : initialName;
    if (name !== "[Symbol.toPrimitive]") {
        for (let i = 0; i < name.length; i++) {
            const c = name.charAt(i);
            const letter = (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";
            if (!letter && !(i > 0 && c >= "0" && c <= "9")) throw new Error("invalid builtin initial name");
        }
    }
    return "function " + name + "() { [native code] }";
}

export function registerFunction(realm: Realm): void {
    realm.registerBuiltin(realm.functionPrototype, "call", 1, (receiver, args, context, loc) => {
        if (receiver.kind !== "object" || receiver.object.callable === null) {
            return failure("TypeError", "Function.prototype.call receiver is not callable", loc);
        }
        const thisArg = args.length === 0 ? UNDEFINED : args[0];
        const rest: Value[] = [];
        for (let i = 1; i < args.length; i++) rest.push(args[i]);
        // Preserve Values and the active budget/context. Proper tail calls are
        // not supported: this builtin remains active while its target runs.
        return context.call(receiver, thisArg, rest, loc);
    });
    realm.registerBuiltin(realm.functionPrototype, "toString", 0, (receiver, _args, _context, loc) => {
        if (receiver.kind !== "object" || receiver.object.callable === null) {
            return failure("TypeError", "Function.prototype.toString receiver is not callable", loc);
        }
        const callable = receiver.object.callable;
        if (callable.kind === "guest") {
            const source = callable.source;
            return normal({ kind: "string", value: source === null ? nativeFunctionString(null)
                : stringSlice(source.source.text, source.start, source.end) });
        }
        return normal({ kind: "string", value: nativeFunctionString(callable.initialName) });
    });
}
