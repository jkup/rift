import { JSONSerializer } from "../json-stringify.js";
import type { Realm } from "../realm.js";
import { UNDEFINED, normal, type ValueCompletion } from "../runtime.js";
import { createRawJSON, GuestRawJSON } from "../raw-json.js";
import { toPrimitive } from "../primitive-conversion.js";
import { toString } from "../conversion.js";
import { wellKnownToStringTag } from "../symbols.js";
import { reviveJSON } from "../json-reviver.js";
import { JSONParser } from "../json-parser.js";

export function registerJSON(realm: Realm): void {
    const object = realm.createObject();
    object.bootstrapDefine(wellKnownToStringTag, {
        value: { kind: "string", value: "JSON" },
        configurable: true,
    });
    realm.registerBuiltin(object, "parse", 2, (_receiver, args, context, loc): ValueCompletion => {
        const primitive = toPrimitive(
            args.length === 0 ? UNDEFINED : args[0],
            "string",
            context,
            loc,
        );
        if (primitive.type === "throw") {
            return primitive;
        }
        const text = toString(primitive.value, loc, context.realm);
        if (text.type === "throw") {
            return text;
        }
        const reviver = args.length > 1 ? args[1] : UNDEFINED;
        const callableReviver = reviver.kind === "object" && reviver.object.callable !== null;
        const parser = new JSONParser(text.value, context, loc, callableReviver);
        const result = parser.parse();
        if (result.type === "throw") {
            return result;
        }
        if (callableReviver) {
            return reviveJSON(result.value, reviver, context, loc, parser.rootRecord);
        }
        return result;
    });
    realm.registerBuiltin(
        object,
        "stringify",
        3,
        (_receiver, args, context, loc): ValueCompletion =>
            new JSONSerializer(context, loc).stringify(
                args.length > 0 ? args[0] : UNDEFINED,
                args.length > 1 ? args[1] : UNDEFINED,
                args.length > 2 ? args[2] : UNDEFINED,
            ),
    );
    realm.registerBuiltin(object, "rawJSON", 1, (_receiver, args, context, loc): ValueCompletion =>
        createRawJSON(args.length > 0 ? args[0] : UNDEFINED, context, loc),
    );
    realm.registerBuiltin(
        object,
        "isRawJSON",
        1,
        (_receiver, args, _context, _loc): ValueCompletion =>
            normal({
                kind: "boolean",
                value:
                    args.length > 0 &&
                    args[0].kind === "object" &&
                    args[0].object instanceof GuestRawJSON,
            }),
    );
    realm.defineScriptGlobal("JSON", {
        value: { kind: "object", object },
        writable: true,
        configurable: true,
    });
}
