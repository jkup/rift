import type { Realm } from "../realm.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString } from "../conversion.js";
import { createDynamicFunction } from "../script-execution-internal.js";
import type { GuestObject, Value, ValueCompletion, OperationContext } from "../runtime.js";
import type { Location } from "../syntax.js";

function construct(args: Value[], context: OperationContext, loc: Location, newTarget: GuestObject): ValueCompletion {
    const parameters: string[] = [];
    let body = "";
    for (let i = 0; i < args.length; i++) {
        const tick = context.tick(loc);
        if (tick.type === "throw") return tick;
        const primitive = toPrimitive(args[i], "string", context, loc);
        if (primitive.type === "throw") return primitive;
        const text = toString(primitive.value, loc, context.realm);
        if (text.type === "throw") return text;
        if (i === args.length - 1) body = text.value;
        else parameters.push(text.value);
    }
    return createDynamicFunction(parameters, body, context, loc, newTarget);
}

export function registerFunctionConstructor(realm: Realm): void {
    const constructor: GuestObject = realm.createBuiltinConstructor("Function", 1,
        (_receiver, args, context, loc): ValueCompletion => construct(args, context, loc, constructor),
        (_callee, newTarget, args, context, loc): ValueCompletion => construct(args, context, loc, newTarget));
    const value: Value = { kind: "object", object: constructor };
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.functionPrototype } });
    realm.functionPrototype.bootstrapDefine("constructor", { value, writable: true, configurable: true });
    realm.defineScriptGlobal("Function", { value, writable: true, configurable: true });
}
