import type { GuestObject, OperationContext, ErrorName } from "./runtime.js";
import type { ObjectCompletion } from "./object-conversion.js";
import type { Location } from "./syntax.js";

export type ConstructorPrototype = "Generator" | "GeneratorFunction" | "AsyncFunction" | "AsyncGenerator" | "AsyncGeneratorFunction" | "RegExp" | "Promise" | "Object" | "Function" | "Array" | "Boolean" | "Number" | "String" | "Map" | "Set" | ErrorName;

export function getPrototypeFromConstructor(constructor: GuestObject, intrinsic: ConstructorPrototype,
    context: OperationContext, loc: Location): ObjectCompletion {
    const callable = constructor.callable;
    if (callable === null) throw new Error("callable required");
    if (callable.realm.profile !== context.realm.profile) throw new Error("cross-profile constructor");
    const prototype = constructor.internalGet("prototype", { kind: "object", object: constructor }, context, loc);
    if (prototype.type === "throw") return prototype;
    if (prototype.value.kind === "object") return { type: "normal", value: prototype.value.object };
    // Bound callable metadata retains its target's Realm; proxies are unsupported.
    const realm = callable.realm;
    switch (intrinsic) {
        case "Generator": return { type: "normal", value: realm.generatorPrototype };
        case "GeneratorFunction": return { type: "normal", value: realm.generatorFunctionPrototype };
        case "AsyncGenerator": return { type: "normal", value: realm.asyncGeneratorPrototype };
        case "AsyncGeneratorFunction": return { type: "normal", value: realm.asyncGeneratorFunctionPrototype };
        case "AsyncFunction": return { type: "normal", value: realm.asyncFunctionPrototype };
        case "RegExp": return { type: "normal", value: realm.regexpPrototype };
        case "Promise": return { type: "normal", value: realm.promisePrototype };
        case "Object": return { type: "normal", value: realm.objectPrototype };
        case "Function": return { type: "normal", value: realm.functionPrototype };
        case "Array": return { type: "normal", value: realm.arrayPrototype };
        case "Boolean": return { type: "normal", value: realm.booleanPrototype };
        case "Number": return { type: "normal", value: realm.numberPrototype };
        case "String": return { type: "normal", value: realm.stringPrototype };
        case "Map": return { type: "normal", value: realm.mapPrototype };
        case "Set": return { type: "normal", value: realm.setPrototype };
        default: return { type: "normal", value: realm.getErrorPrototype(intrinsic) };
    }
}
