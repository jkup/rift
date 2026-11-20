import {
    GuestObject,
    languageFailure,
    normal,
    type OperationContext,
    type Value,
    type ValueCompletion,
} from "./runtime.js";
import { toPrimitive } from "./primitive-conversion.js";
import { toString } from "./conversion.js";
import { JSONParser } from "./json-parser.js";
import type { Location } from "./syntax.js";

export class GuestRawJSON extends GuestObject {
    constructor(readonly rawText: string) {
        super(null);
        this.bootstrapDefine("rawJSON", {
            value: { kind: "string", value: rawText },
            enumerable: true,
        });
        this.preventExtensions();
    }
}

function primitiveBoundary(char: string): boolean {
    return (char >= "a" && char <= "z") || (char >= "0" && char <= "9") || char === '"';
}

// ECMA-262 JSON.rawJSON: reject container/whitespace boundaries before parsing.
export function createRawJSON(
    value: Value,
    context: OperationContext,
    loc: Location,
): ValueCompletion {
    const primitive = toPrimitive(value, "string", context, loc);
    if (primitive.type === "throw") {
        return primitive;
    }
    const text = toString(primitive.value, loc, context.realm);
    if (text.type === "throw") {
        return text;
    }
    const first = text.value.charAt(0);
    const last = text.value.charAt(text.value.length - 1);
    if ((!primitiveBoundary(first) && first !== "-") || !primitiveBoundary(last)) {
        return languageFailure(context.realm, "SyntaxError", "invalid raw JSON", loc);
    }
    const parsed = new JSONParser(text.value, context, loc).parse();
    if (parsed.type === "throw") {
        return parsed;
    }
    return normal({ kind: "object", object: new GuestRawJSON(text.value) });
}
