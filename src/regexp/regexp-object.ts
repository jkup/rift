import {
    GuestObject,
    truthy,
    type InternalBooleanCompletion,
    type OperationContext,
    type Value,
} from "../runtime.js";
import type { RegExpProgram } from "./regexp-matcher.js";
import { wellKnownMatch } from "../symbols.js";
import type { Location } from "../syntax.js";

export class GuestRegExp extends GuestObject {
    constructor(
        proto: GuestObject,
        public originalSource: string,
        public originalFlags: string,
        public program: RegExpProgram,
    ) {
        super(proto);
        this.bootstrapDefine("lastIndex", {
            value: { kind: "number", value: 0 },
            writable: true,
            enumerable: false,
            configurable: false,
        });
    }
}

export function isRegExp(
    value: Value,
    context: OperationContext,
    loc: Location,
): InternalBooleanCompletion {
    if (value.kind !== "object") {
        return { type: "normal", value: false };
    }
    const matcher = value.object.internalGet(wellKnownMatch, value, context, loc);
    if (matcher.type === "throw") {
        return matcher;
    }
    return {
        type: "normal",
        value:
            matcher.value.kind === "undefined"
                ? value.object instanceof GuestRegExp
                : truthy(matcher.value),
    };
}
