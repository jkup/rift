import type { Realm } from "../realm.js";
import { UNDEFINED, unsupportedFailure, type ValueCompletion } from "../runtime.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString } from "../conversion.js";
import { wellKnownToStringTag } from "../symbols.js";
import { JSONParser } from "../json-parser.js";

export function registerJSON(realm: Realm): void {
    const object = realm.createObject();
    object.bootstrapDefine(wellKnownToStringTag, { value: { kind: "string", value: "JSON" }, configurable: true });
    realm.registerBuiltin(object, "parse", 2, (_receiver, args, context, loc): ValueCompletion => {
        const primitive = toPrimitive(args.length === 0 ? UNDEFINED : args[0], "string", context, loc);
        if (primitive.type === "throw") return primitive;
        const text = toString(primitive.value, loc, context.realm);
        if (text.type === "throw") return text;
        const result = new JSONParser(text.value, context, loc).parse();
        if (result.type === "throw") return result;
        const reviver = args.length > 1 ? args[1] : UNDEFINED;
        if (reviver.kind === "object" && reviver.object.callable !== null)
            return unsupportedFailure("runtime.json-reviver", "TypeError", "JSON.parse reviver is unsupported", loc);
        return result;
    });
    realm.defineScriptGlobal("JSON", { value: { kind: "object", object }, writable: true, configurable: true });
}
