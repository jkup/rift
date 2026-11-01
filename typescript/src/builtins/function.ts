import type { Realm } from "../realm.js";
import { UNDEFINED, failure, type Value } from "../runtime.js";

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
}
