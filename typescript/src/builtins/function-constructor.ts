import { wellKnownToStringTag } from "../symbols.js";
import type { Realm } from "../realm.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString } from "../conversion.js";
import { createDynamicFunction, createGeneratorResumeIntrinsic, type DynamicFunctionKind } from "../script-execution-internal.js";
import type { GuestObject, Value, ValueCompletion, OperationContext } from "../runtime.js";
import type { Location } from "../syntax.js";

function construct(args: Value[], context: OperationContext, loc: Location, newTarget: GuestObject, kind: DynamicFunctionKind = "ordinary"): ValueCompletion {
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
    return createDynamicFunction(parameters, body, context, loc, newTarget, kind);
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

export function registerGeneratorFunctionConstructor(realm: Realm): void {
    const constructor: GuestObject = realm.createBuiltinConstructor("GeneratorFunction", 1,
        (_receiver, args, context, loc): ValueCompletion => construct(args, context, loc, constructor, "generator"),
        (_callee, newTarget, args, context, loc): ValueCompletion => construct(args, context, loc, newTarget, "generator"));
    const parent = realm.globalObject.getOwnProperty("Function");
    if (parent === undefined || parent.kind !== "data" || parent.value.kind !== "object") throw new Error("Function intrinsic missing");
    const linked = constructor.setPrototypeOf(parent.value.object);
    if (!linked.value) throw new Error("GeneratorFunction prototype invariant");
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.generatorFunctionPrototype } });
    realm.generatorFunctionPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, configurable: true });
    realm.generatorFunctionPrototype.bootstrapDefine("prototype", { value: { kind: "object", object: realm.generatorPrototype }, configurable: true });
    realm.generatorFunctionPrototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "GeneratorFunction" }, configurable: true });
    realm.generatorPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: realm.generatorFunctionPrototype }, configurable: true });
    realm.generatorPrototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "Generator" }, configurable: true });
    for (const mode of ["next", "return", "throw"] as const)
        realm.generatorPrototype.bootstrapDefine(mode, { value: { kind: "object", object: createGeneratorResumeIntrinsic(realm, mode) }, writable: true, configurable: true });
}

export function registerAsyncFunctionConstructor(realm: Realm): void {
    const constructor: GuestObject = realm.createBuiltinConstructor("AsyncFunction", 1,
        (_receiver, args, context, loc): ValueCompletion => construct(args, context, loc, constructor, "async"),
        (_callee, newTarget, args, context, loc): ValueCompletion => construct(args, context, loc, newTarget, "async"));
    const parent = realm.globalObject.getOwnProperty("Function");
    if (parent === undefined || parent.kind !== "data" || parent.value.kind !== "object") throw new Error("Function intrinsic missing");
    const linked = constructor.setPrototypeOf(parent.value.object);
    if (!linked.value) throw new Error("AsyncFunction prototype invariant");
    constructor.bootstrapDefine("prototype", { value: { kind: "object", object: realm.asyncFunctionPrototype } });
    realm.asyncFunctionPrototype.bootstrapDefine("constructor", { value: { kind: "object", object: constructor }, configurable: true });
    realm.asyncFunctionPrototype.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "AsyncFunction" }, configurable: true });
}
